# Dicky News YouTube Admin

Arsitektur produksi menggunakan dua website yang saling terhubung:

- `youtubeadmin`: panel admin, generator Link Dicky News dan Like & Comment, serta pengaturan tugas sosial.
- `download`: Web Utama yang melayani halaman download dan unlocker di `https://official.dickynews.com/`.

## Alur utama

- Publikasi link download dilakukan oleh Cloudflare Worker `dickynews-publisher` yang memvalidasi target, lalu menjalankan GitHub Actions di repository `DickyNews/download`. Hanya target yang dipilih yang diperbarui.
- Konfigurasi tugas sosial disimpan di Cloudflare KV. Web Utama mengambil konfigurasi tersebut secara langsung saat unlocker dibuka, dengan fallback aman jika layanan konfigurasi tidak tersedia.
- Akses langsung admin menggunakan tiket sekali pakai yang berumur 60 detik. Tiket ditukar pada domain Web Utama dan sesi admin berlaku 8 jam; penyimpanan browser lintas domain tidak diasumsikan berbagi.
- Link Like & Comment baru menggunakan token acak. Password tidak disimpan di URL; Worker hanya menyimpan hash SHA-256 dan memverifikasinya di sisi server. Token unlocker berlaku 30 hari.
- Link Like & Comment lama dengan parameter `v` tetap didukung untuk kompatibilitas.

## Keamanan dan deployment

- Jangan menaruh `GITHUB_TOKEN` atau `ADMIN_API_KEY` di HTML.
- Secret Worker harus dikonfigurasi melalui Cloudflare Worker Secrets.
- Origin yang diizinkan: `https://dickynews.github.io` dan `https://official.dickynews.com`.
- Perubahan Worker dideploy dengan Wrangler; perubahan Web Utama dipublikasikan melalui GitHub Actions.
