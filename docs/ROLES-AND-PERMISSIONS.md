# GoalForge: tiga ruang akses

Status: spesifikasi produk dan kriteria penerimaan. Dokumen ini tidak bermaksud halaman baharu sudah dibina atau diuji dalam deployment semasa.

## Struktur yang disyorkan

Satu aplikasi, satu sumber data, tiga ruang berdasarkan peranan. Pengasingan akses mesti diperiksa oleh API pada setiap tindakan. Menyembunyikan butang sahaja tidak memberikan keselamatan.

| Ruang | Boleh buat | Had akses |
| --- | --- | --- |
| Viewer | Tonton pertandingan, lineup, cuaca, VAR, jadual, keputusan dan akhbar; chat sebagai tetamu | Tiada kawalan kickoff, keputusan, roster, harga pemain atau musim. Tetap tertakluk pada mute dan had chat. |
| Manager | Daftar pasukan mengikut kuota, muat naik logo, isi pemain, formasi dan gaya permainan, beli/jual pemain dengan GF maya, urus kesebelasan pasukan sendiri | Identiti pemilik disemak di server. Tidak boleh mengubah pasukan orang lain atau mengawal liga. Pasukan yang sedang bermain dikunci. |
| Admin | Kelola kejohanan, kuota, pasukan, jadual, kickoff, cuaca, penaja, banner, akhbar dan moderasi | Akaun admin diperlukan. Musim baharu hanya selepas arahan admin. Pemilik asal sahaja mengurus jemputan/revokasi admin. |

## Pengalaman pengguna yang dicadangkan

- Laman utama terus menawarkan Tonton sekarang tanpa login.
- Ruang manager memberi tumpuan kepada pasukan sendiri: status pendaftaran, pemain, taktik, pasaran dan perlawanan seterusnya.
- Ruang admin memberi tumpuan kepada operasi: jadual hari ini, status perlawanan, pendaftaran, permohonan penaja dan moderasi.
- Login boleh dikongsi sebagai satu mekanisme pengesahan; server menentukan akses sebenar. Pertukaran tab tidak menukar peranan.
- Pautan khusus admin/manager/watch boleh ditambah setelah kod aplikasi lengkap tersedia. Route tersebut belum dijamin wujud hanya kerana dokumen ini ditambah.

## Kriteria penerimaan sebelum pelancaran

1. Viewer menerima 403 apabila cuba menghantar tindakan admin/manager yang memerlukan login.
2. Manager A tidak boleh membaca butiran peribadi atau mengubah roster, taktik, listing dan wang Manager B.
3. Logo pasukan yang sah dipaparkan dalam pembukaan, lineup dan papan skor; fail rosak mempunyai paparan gantian.
4. Taktik mempengaruhi mode Tactics + ratings; animasi dan chat tidak mengubah keputusan yang sudah ditetapkan oleh simulator.
5. VAR menunjukkan insiden dan verdict yang sepadan; ketiadaan verdict tidak boleh dianggap sebagai gol dibatalkan.
6. Tiada pertukaran musim atau pertandingan baharu tanpa tindakan admin.
7. Transfer menyimpan perubahan dua kelab secara atomik; permintaan berulang tidak boleh menghasilkan dua pembelian.
8. Paparan mudah alih dan semua lima bahasa diperiksa bersama ujian logik. Kelulusan ujian logik sahaja tidak mengesahkan rupa atau FPS pada telefon sebenar.

## Perkara yang belum dijanjikan

Dokumen ini bukan bukti bahawa semua pepijat telah diperbaiki. Kadar FPS sebenar, kapasiti penonton, sistem bayaran dan akses tiga halaman perlu diuji selepas folder sumber lengkap dan deployment ujian tersedia.
