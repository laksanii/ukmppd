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
sumber/soal/*.md   ->   data/<mata uji>-<level>.json   ->   aplikasi
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

## Mengimpor naskah jadi bank soal

```bash
npm run import -- sumber/soal/psikiatri.md --dry     # lihat hasil, tidak menulis apa pun
npm run import -- sumber/soal/psikiatri.md           # tulis ke data/
npm run validate                                     # pastikan banknya sehat
```

Tujuan penulisan diambil dari pasangan `subject:` dan `level:` pada frontmatter
naskah, atau dari opsi `--subject <id> --level <id>` / `--out data/namafile.json`.
Pasangan itu dicocokkan dengan `banks` pada `data/subjects.json`. Soal yang
vignette-nya sudah ada di bank dilewati, jadi mengimpor file yang sama dua kali
tidak menggandakan isi.

Kalau naskah hanya berisi soal dan kunci tanpa pembahasan, importer mengisi
`key` dan `why` dengan penanda `TODO:` dan menyebutkan nomor soal mana saja yang
perlu dilengkapi. `npm run validate` (dan karenanya `npm run build`) akan menolak
selama penanda itu masih ada, supaya soal setengah jadi tidak ikut ter-deploy.

Soal yang naskah aslinya cacat, misalnya pilihan jawabannya terpotong atau
kuncinya tidak ditandai, diberi baris `Lewati: <alasan>`. Soal itu tetap tersimpan
di naskah sebagai catatan, tidak ikut diimpor, dan tidak membuat impor soal lain
gagal.

Format lengkap yang dikenali ada di `sumber/soal/_TEMPLATE.md`.

## Menaruh naskah soal baru

Simpan apa adanya, tidak perlu dirapikan dulu. Bentuk paling sederhana yang
sudah bisa diimpor: soal bernomor, lima pilihan berhuruf, kunci ditandai tebal.

```markdown
1. [kepala] Wanita 25 tahun datang dengan keluhan ... Apakah diagnosis yang paling tepat?
a. Pilihan A
b. Pilihan B
**c. Pilihan C**
d. Pilihan D
e. Pilihan E
```

Vignette boleh ditulis beberapa baris, akan digabung otomatis. Topik per soal
bisa ditulis `[kode]` tepat setelah nomor. Pembahasan dan alasan tiap pilihan
boleh langsung disertakan di naskah — lihat `_TEMPLATE.md`.

Naskah aslinya tetap disimpan di sini sebagai rujukan bila ada kunci yang perlu
dicek ulang.

## Catatan

- File materi berukuran besar (PDF slide, hasil scan) sebaiknya jangan di-commit;
  simpan lokal saja atau tambahkan polanya ke `.gitignore` supaya repo tetap ramping.
- `neurologi-homework-01.md` adalah sumber dari 60 soal pertama Neurologi level Lanjut.
- `anak.md`, `anak_1.md`, dan `gastro.md` adalah sumber bank Ilmu Kesehatan Anak dan
  Gastroenterologi. Empat soal di dalamnya ditandai `Lewati:` karena naskah aslinya
  terpotong; lengkapi naskahnya lalu impor ulang bila ingin ikut dipakai.
