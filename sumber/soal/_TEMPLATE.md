---
subject: neurologi
level: lanjut
topic: kepala
---

<!--
  Template format naskah soal yang bisa dibaca importer.
  Jalankan:  npm run import -- sumber/soal/namafile.md
  Lihat dulu tanpa menulis apa pun:  npm run import -- sumber/soal/namafile.md --dry

  Frontmatter di atas boleh dihapus kalau tujuannya diberikan lewat opsi:
    subject: mata uji tujuan, harus sudah terdaftar (npm run taxonomy -- list)
    level:   level tujuan, harus sudah terdaftar (npm run taxonomy -- list)
    topic:   topik bawaan untuk semua soal di file ini, boleh ditimpa per soal
  Pasangan subject x level menentukan baris mana di public/data/bank.sqlite
  yang ditulis. File ini sendiri hanya contoh, tidak perlu diimpor.
-->

# Judul naskah bebas, baris berawalan # diabaikan

1. Perempuan 32 tahun datang dengan keluhan nyeri kepala sejak 3 bulan terakhir,
hampir setiap hari. Nyeri di kedua sisi kepala seperti diikat kencang, tidak
berdenyut, tanpa mual maupun silau. Apakah diagnosis yang paling mungkin?
a. Migrain dengan aura
b. Migrain tanpa aura
**c. Tension type headache**
d. Cluster headache
e. Neuralgia trigeminal

2. [vertigo] Perempuan 30 tahun mengeluh pusing berputar kurang dari 1 menit
yang muncul saat bangun dari tidur. Tidak ada gangguan pendengaran. Apakah
tatalaksana non-farmakologis yang dapat dikerjakan sendiri oleh pasien?
a. Manuver Epley
b. Manuver Dix-Hallpike
c. Betahistin maleat
**d. Manuver Brandt-Daroff**
e. Dimenhidrinat

Pembahasan: Keluhan pasien adalah BPPV. Latihan yang dirancang untuk dikerjakan
sendiri di rumah adalah Brandt-Daroff, sedangkan Epley umumnya dikerjakan dokter.

Alasan:
a: Manuver Epley efektif, tetapi dikerjakan oleh pemeriksa.
b: Dix-Hallpike adalah manuver diagnostik, bukan terapi.
c: Betahistin adalah terapi farmakologis.
d: Benar. Brandt-Daroff adalah latihan habituasi mandiri untuk BPPV.
e: Dimenhidrinat juga farmakologis dan menghambat kompensasi vestibular.

3. [kepala] Laki-laki 40 tahun datang dengan nyeri kepala hebat sisi kanan yang
belum bisa dipastikan karena pilihan jawaban di naskah asli terpotong.
a. Pilihan A
b. Pilihan B
Lewati: pilihan jawaban di naskah asli tidak lengkap

<!--
  Baris "Lewati: <alasan>" menandai soal yang naskah aslinya cacat: soal itu
  tetap tersimpan di sini sebagai catatan, tetapi tidak ikut diimpor dan tidak
  membuat impor soal-soal lain gagal.
-->
