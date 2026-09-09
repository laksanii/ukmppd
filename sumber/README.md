# Sumber

Bahan mentah: catatan materi dan naskah soal apa adanya, sebelum diolah menjadi
bank soal aplikasi. Isi folder ini tidak dibaca oleh aplikasi.

```
sumber/
  materi/   catatan kuliah, ringkasan bab, slide bimbingan
  soal/     naskah soal mentah (home work, tryout, latihan bab)
```

Alur kerjanya:

```
sumber/soal/*.md   ->   data/neurologi-*.json   ->   aplikasi
   (mentah)              (siap pakai + pembahasan)
```

## Penamaan file

Awali dengan nama mata ujian supaya urut sendiri dan sejalan dengan penamaan di
`data/`:

```
sumber/soal/neurologi-homework-01.md
sumber/soal/kardiologi-tryout-maret.md
sumber/materi/neurologi-stroke.md
```

## Menaruh naskah soal baru

Simpan apa adanya, tidak perlu dirapikan dulu. Format yang paling mudah diolah:
soal bernomor, lima pilihan berhuruf, kunci ditandai tebal.

```markdown
1. Wanita 25 tahun datang dengan keluhan ... Apakah diagnosis yang paling tepat?
a. Pilihan A
b. Pilihan B
**c. Pilihan C**
d. Pilihan D
e. Pilihan E
```

Setelah naskah masuk ke sini, isinya dipindahkan ke file level yang sesuai di
`data/` (lihat bagian "Menambah soal" dan "Menambah level kesulitan" pada README
utama), lengkap dengan `key` dan lima baris `why`. Naskah aslinya tetap disimpan
di sini sebagai rujukan bila ada kunci yang perlu dicek ulang.

## Catatan

- File materi berukuran besar (PDF slide, hasil scan) sebaiknya jangan di-commit;
  simpan lokal saja atau tambahkan polanya ke `.gitignore` supaya repo tetap ramping.
- `neurologi-homework-01.md` adalah sumber dari 60 soal level Lanjut.
