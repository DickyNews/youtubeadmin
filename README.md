# Dicky News YouTube Admin

- `index.html`: satu-satunya HTML YouTube Admin, berisi dashboard serta dua alur unlocker terpadu:
  - Link Dicky News: tugas sosial untuk membuka link tujuan MediaFire.
  - Like & Comment: akses password atau jalur tugas video YouTube.
- Mode unlocker dijalankan dari HTML yang sama melalui parameter URL; tidak ada lagi file HTML terpisah untuk kedua alur tersebut.

Panel konfigurasi saat ini masih menyimpan draf di localStorage browser. Tombol push otomatis ke Web Utama belum aktif sampai endpoint backend HTTPS terautentikasi dikonfigurasi dan dikonfirmasi. Jangan menaruh token GitHub atau password admin di frontend.
