/**
 * Cloudflare Worker bridge for Web Utama publishing.
 *
 * Required Worker secrets:
 *   GITHUB_TOKEN  - fine-grained PAT restricted to DickyNews/download,
 *                   Contents: Read and write; Actions: Read and write.
 *   ADMIN_API_KEY - long random value used by the protected admin frontend.
 *
 * Configure ADMIN_API_KEY only after the admin page is protected from public
 * access (for example with Cloudflare Access). Never put a GitHub token in HTML.
 * Worker variables:
 *   ALLOWED_ORIGIN = https://dickynews.github.io
 *
 * This endpoint dispatches the GitHub Actions workflow and polls for a run
 * associated with the workflow file. A workflow dispatch API call is accepted
 * asynchronously, so the caller should poll /status?run_id=... if needed.
 */
const OWNER = "DickyNews";
const REPO = "download";
const WORKFLOW = "publish-web-utama-link.yml";
const BRANCH = "main";
const ALLOWED_TARGETS = new Set([
  "gb_WA_pro", "mb_WA", "delta_WA", "lite_x_WA",
  "wa_enhancer_ori", "wa_enhancer_biz"
]);

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST,GET,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "vary": "Origin"
    }
  });
}

function validMediaFire(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      ["mediafire.com", "www.mediafire.com"].includes(u.hostname) &&
      /^\/(file|download)\//.test(u.pathname);
  } catch { return false; }
}

async function gh(path, env, method = "GET", body) {
  return fetch("https://api.github.com" + path, {
    method,
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": "Bearer " + env.GITHUB_TOKEN,
      "x-github-api-version": "2022-11-28",
      "user-agent": "DickyNews-Web-Publisher",
      ...(body ? {"content-type": "application/json"} : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://dickynews.github.io";
    if (request.method === "OPTIONS") {
      if (origin !== allowedOrigin) return new Response(null, {status: 403});
      return new Response(null, {status: 204, headers: {
        "access-control-allow-origin": allowedOrigin,
        "access-control-allow-methods": "POST,GET,OPTIONS",
        "access-control-allow-headers": "content-type,authorization",
        "access-control-max-age": "86400",
        "vary": "Origin"
      }});
    }
    if (origin !== allowedOrigin) return json({success:false,message:"Origin tidak diizinkan."},403,allowedOrigin);
    if (!env.GITHUB_TOKEN || !env.ADMIN_API_KEY) return json({success:false,message:"Secret Worker belum lengkap."},503,allowedOrigin);
    const auth = request.headers.get("Authorization") || "";
    if (auth !== "Bearer " + env.ADMIN_API_KEY) return json({success:false,message:"Akses admin tidak sah."},401,allowedOrigin);

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/status")) {
      const runId = url.searchParams.get("run_id");
      if (!/^\d+$/.test(runId || "")) return json({success:false,message:"run_id tidak valid."},400,allowedOrigin);
      const r = await gh(`/repos/${OWNER}/${REPO}/actions/runs/${runId}`,env);
      const data = await r.json();
      if (!r.ok) return json({success:false,message:"Gagal membaca status workflow."},r.status,allowedOrigin);
      return json({success:true,status:data.status,conclusion:data.conclusion,html_url:data.html_url},200,allowedOrigin);
    }
    if (request.method !== "POST") return json({success:false,message:"Metode tidak didukung."},405,allowedOrigin);

    let payload;
    try { payload = await request.json(); } catch { return json({success:false,message:"JSON tidak valid."},400,allowedOrigin); }
    if (payload.action !== "update_download_links") return json({success:false,message:"Action tidak dikenal."},400,allowedOrigin);
    if (payload.mode !== "link") return json({success:false,message:"Publikasi otomatis saat ini hanya mendukung mode Link Dicky News."},400,allowedOrigin);
    const targets = Array.isArray(payload.targets) ? payload.targets : [];
    if (!targets.length || targets.some(t => !ALLOWED_TARGETS.has(t)) || new Set(targets).size !== targets.length)
      return json({success:false,message:"Pilih tombol yang valid tanpa duplikat."},400,allowedOrigin);
    if (!validMediaFire(String(payload.mediafire_url || ""))) return json({success:false,message:"URL MediaFire HTTPS tidak valid."},400,allowedOrigin);

    const dispatch = await gh(`/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,env,"POST",{
      ref: BRANCH,
      inputs: {
        targets: targets.join(","),
        mediafire_url: String(payload.mediafire_url).trim()
      }
    });
    if (dispatch.status !== 204) {
      const detail = await dispatch.text();
      return json({success:false,message:"GitHub menolak menjalankan workflow.",detail:detail.slice(0,300)},dispatch.status,allowedOrigin);
    }
    // GitHub workflow_dispatch returns 204 and does not provide a run ID.
    // The caller must use the repository Actions page or a later polling flow.
    return json({success:true,accepted:true,message:"Workflow diterima GitHub. Tunggu status workflow sebelum menandai DONE."},202,allowedOrigin);
  }
};
