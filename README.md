# Dicky News YouTube Admin

Arsitektur produksi hanya menggunakan dua website:

- `DickyNews/youtubeadmin`: satu pusat admin untuk generator Link Dicky News, generator Like & Comment, pengaturan lima tugas sosial, dan publikasi tombol download.
- `DickyNews/download`: Web Utama di `https://official.dickynews.com/`, yang menjalankan unlocker dan alur download.

Repository lama `linkdickynews` dan `linklikecomment` adalah sumber logika yang dipindahkan. Keduanya tidak lagi menjadi website operasional terpisah untuk link baru.

## Alur Link Dicky News

1. Admin memilih target tombol dan memasukkan URL tujuan serta versi.
2. YouTube Admin mengirim konfigurasi ke Cloudflare Worker.
3. Worker menjalankan GitHub Actions di repository `download`.
4. Workflow memperbarui hanya target yang dipilih menjadi URL `?module=link&v=` di Web Utama.
5. Web Utama menampilkan lima tugas berurutan: Subscribe YouTube Utama, Subscribe YouTube Kedua, Follow Instagram, Follow TikTok, dan Follow Facebook.
6. Setiap tugas mempertahankan pola klik, timer 15 detik, percobaan ulang, lalu lanjut ke tugas berikutnya.
7. Setelah lima tugas selesai, tombol akses tujuan ditampilkan.
8. Jalur VIP `method=bypass` melewati lima tugas dan membuka tujuan.

## Alur Like & Comment

1. Admin memasukkan URL video YouTube dan password VIP.
2. YouTube Admin membuat payload JSON asli `{yt, ps}`, mengubahnya menjadi Base64URL, lalu menghasilkan `https://official.dickynews.com/?module=like&v=<payload>`.
3. Password VIP yang benar mengarahkan pengguna ke Web Utama dengan `?method=bypass`.
4. Tombol Like & Comment tanpa password langsung mengarahkan pengguna ke Web Utama tanpa bypass.
5. Pada Web Utama, pengguna memilih tombol DOWNLOAD. Jalur normal menjalankan lima tugas sosial; jalur VIP melewati tugas dan membuka tujuan.
6. Tombol Like & Comment tidak menjalankan timer di halaman unlocker dan tidak membuka video secara terpisah. Tugas Like & Comment tetap mengikuti alur Web Utama yang asli.

Catatan: Base64URL adalah encoding, bukan enkripsi. Payload mempertahankan format lama agar perilaku generator dan kompatibilitas logika tetap sama.

## Sinkronisasi dan keamanan

- Konfigurasi lima tugas sosial disimpan di Cloudflare KV melalui endpoint admin dan dibaca Web Utama.
- TikTok dikunci ke `https://www.tiktok.com/@dickynewsofficial`.
- Worker hanya menerima publikasi mode Link Dicky News. Generator Like & Comment bekerja lokal di YouTube Admin dengan format payload asli; password tidak dikirim ke Worker atau GitHub Actions.
- Worker secrets tetap berada di Cloudflare, bukan di HTML atau repository.
- Origin yang diizinkan: `https://dickynews.github.io` dan `https://official.dickynews.com`.
- Repository lama jangan dihapus sebelum kedua alur lolos uji end-to-end.
