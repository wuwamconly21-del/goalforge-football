# Monetization dan deployment GoalForge

Status: cadangan pelaksanaan. Tiada checkout, caj pelanggan atau subscription baharu diaktifkan oleh dokumen ini.

## Model pendapatan awal

| Pengguna | Tawaran | Pelaksanaan |
| --- | --- | --- |
| Viewer | Tonton percuma dan chat tetamu | Kekalkan akses asas supaya komuniti boleh berkembang. |
| Penaja | Banner stadium, pitch board, penaja perlawanan dan kejohanan | Mulakan dengan tempahan penajaan yang disemak admin; ciri paparan sedia ada boleh digunakan selepas deployment disahkan. |
| Manager | Tema kelab, jersi dan kosmetik pilihan | Cadangan fasa berikutnya. Membeli kosmetik tidak menambah rating pemain atau peluang menang. |
| Organizer | Pelan berbayar untuk lebih banyak kejohanan, penjenamaan dan alat pengurusan | Cadangan fasa berikutnya; kuota dan entitlement mesti dikuatkuasakan pada server. |

Jangan sambungkan baki GF dalam transfer market kepada wang sebenar. GF ialah mata wang permainan maya. Bayaran sebenar memerlukan checkout berasingan, webhook yang disahkan, rekod transaksi dan pengendalian refund; perkara ini belum dibina atau diaktifkan di sini.

Cadangan urutan: versi percuma yang stabil → penaja pertama → kosmetik/organizer premium. Harga ditetapkan selepas kos sebenar dan permintaan pengguna dapat diukur; tiada janji hasil pendapatan dibuat.

## Hosting dan update automatik

Cadangan kekal: GitHub untuk sumber dan Cloudflare Workers untuk aplikasi live. Ini mengelakkan perubahan seni bina besar berulang kali semasa produk belum stabil.

Pilihan utama selepas sumber lengkap: sambungkan repository melalui Cloudflare Workers Builds, menggunakan integrasi GitHub rasmi. Ia tidak memerlukan proses login Wrangler dijalankan dari sesi chat ini untuk setiap update. Pemasangan integrasi pada akaun Cloudflare masih perlu diluluskan oleh pemilik akaun sekali.

Pilihan kedua: GitHub Actions dengan secret deployment Cloudflare yang terhad pada akaun sasaran. Workflow yang disediakan hanya membenarkan kemas kini production selepas sumber lulus ujian, migrasi awal selesai dan readiness ditetapkan.

Gunakan satu laluan deployment production untuk branch yang sama; jangan hidupkan kedua-dua Workers Builds dan GitHub Actions deployment serentak. Workers Free/Paid tetap mempunyai had penggunaan dan kos penggunaan tambahan mengikut pelan.

Dokumentasi rasmi:
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/platform/pricing/

## Sekatan semasa yang telah disahkan

Kemas kini 21 Oktober 2026 (Malaysia): semua folder sumber utama sudah dimuat naik. Semakan struktur, semua suite ujian, build production dan kompilasi Cloudflare dry-run berjaya pada commit 107fe845b1f65220b5a74881c4b29fe50e233a49. Kejayaan build ini tidak bermaksud migrasi data atau deployment production telah selesai.

wrangler.jsonc masih menggunakan cloudflare/migration-worker.ts dan MIGRATION_MODE=import. Ini ialah mod import tertutup, bukan laman penonton. Jangan menukar kepada live sebelum eksport/import data dan verifikasi selesai. Binding D1 yang sudah ditambah dalam konfigurasi dikekalkan; menambah binding sahaja tidak memindahkan data dari Netlify atau menukar backend Durable Objects kepada D1.

Migrasi awal dan deployment biasa ialah dua proses berbeza. Netlify mesti kekal sebagai sumber aktif sehingga salinan Cloudflare telah disahkan. Tiada source freeze, pertukaran domain atau caj pelan dibuat oleh perubahan dokumentasi/CI ini.
