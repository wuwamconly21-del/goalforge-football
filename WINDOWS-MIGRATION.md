# Pindahkan GoalForge ke Cloudflare dari Windows

Laman semasa: https://goalforge-football-live.netlify.app/

Migrasi belum dijalankan. Sambungan pengesahan Cloudflare dari sesi chat disekat. Pelancar ini menjalankan proses pada laptop anda menggunakan login pelayar biasa. Jangan hantar token atau kata laluan dalam chat.

## Cara guna

1. Pasang **Node.js 24** dari https://nodejs.org/en/download jika belum ada.
2. Klik kanan fail ZIP → **Extract All**. Buka folder **GoalForge** hasil ekstrak. Jangan jalankan terus dari dalam ZIP.
3. Tunggu semua perlawanan tamat. Jangan mulakan perlawanan atau jadual baharu semasa migrasi.
4. Klik dua kali **START-MIGRATION-WINDOWS.cmd**. Dependencies akan dipasang; tunggu sehingga selesai.
5. Log masuk Netlify dan Cloudflare apabila pelayar dibuka. Gunakan akaun Netlify yang memiliki laman GoalForge semasa. Jika ada beberapa akaun Cloudflare, pilih nombor akaun sasaran pada tetingkap pelancar.
6. Biarkan tetingkap dibuka sehingga mesej **SELESAI** dan alamat Cloudflare keluar. Jangan tutup laptop semasa proses.

Pelancar membuat Workers baharu dengan nama unik. Ia menguji simpanan sebelum mengunci Netlify, menunggu 60 saat untuk permintaan lama selesai, membuat dua eksport yang sepadan, mengimport semua rekod dan menyemak setiap checksum. Selepas itu barulah Cloudflare diaktifkan dan laman Netlify diberi redirect. Tiada pelan berbayar ditukar secara automatik; jika penyedia memerlukan tetapan akaun tambahan, proses berhenti.

Data pasukan, pemain, pertandingan, manager, admin dan kata laluan sedia ada dikekalkan. Backup juga mengandungi rekod sesi semasa, tetapi cookie pelayar tidak berpindah domain: **login semula pada alamat Cloudflare**. Anggaran maintenance 1–3 minit bergantung pada sambungan dan bilangan rekod; ia boleh mengambil lebih lama.

## Jika proses berhenti

- Sebelum pengaktifan: pelancar cuba membuka semula Netlify. Fasa **source-restored** bermaksud Netlify sudah dibuka semula; cuba lagi selepas membetulkan login atau sambungan.
- Fasa **activation-attempted** atau **cloudflare-live**: Cloudflare mungkin sudah aktif. Netlify dikekalkan dalam maintenance untuk melindungi data daripada dua sistem menulis serentak. Buka URL sasaran yang dipaparkan dan laporkan **fasa terakhir serta URL sahaja** untuk bantuan.
- Fasa **source-lock-check-required**: status lock belum dapat disahkan. Jangan mulakan migrasi kedua; laporkan fasa tersebut.
- Jika tetingkap tertutup semasa maintenance, jangan padam folder dan jangan membuka Netlify secara paksa. Simpan keadaan untuk semakan.

Folder **.migration-private/windows** menyimpan backup, status proses dan token import sementara. Jangan muat naik, hantar atau kongsi folder ini. Selepas berjaya, token import dibuang daripada Cloudflare dan fail token tempatan dikosongkan. Simpan eksport peribadi sebagai backup. Windows mungkin menyembunyikan folder ini bergantung pada tetapan paparan.

Pelancar diuji untuk susunan langkah dan pemulihan kegagalan secara automatik. Login pelayar Windows dan deployment Cloudflare sebenar masih perlu dijalankan pada komputer anda; ia belum dapat disahkan dari sesi chat ini.

## Untuk pemulihan teknikal

Status: `.migration-private/windows/state.json`. Backup konfigurasi asal: `wrangler.before.jsonc` dan `netlify.before.toml`. Eksport akhir: `final/records.jsonl`, `final/manifest.json`; keputusan semakan import: `final/cloudflare-verification.json`.

Jangan buka semula Netlify selepas Cloudflare menerima trafik tanpa dahulu menghentikan penulisan dan scheduler Cloudflare serta menilai data baharu di sana. Lihat `CLOUDFLARE-MIGRATION.md` untuk butiran migrasi.
