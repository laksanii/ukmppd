# Latihan UKMPPD

Aplikasi latihan soal UKMPPD. Bank soalnya dipilah dua sumbu: **mata uji**
(neurologi, ilmu kesehatan anak, gastroenterologi) dan **level kesulitan**
(dasar, lanjut). Datanya berupa JSON terpisah dari modul JavaScript yang dibundel
Vite, sehingga menambah soal, mata uji, atau level tidak perlu menyentuh kode UI.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # validasi bank soal lalu bundel ke dist/
npm run preview   # cek hasil build
npm run validate  # cek konsistensi bank soal saja
npm run import -- sumber/soal/x.md   # naskah Markdown -> bank soal JSON
```

Hasil `npm run build` di `dist/` adalah file statis biasa, bisa langsung ditaruh di
GitHub Pages, Netlify, atau server statis apa pun (`base` sudah relatif).

## Deployment otomatis ke VPS

Workflow `.github/workflows/ci-cd.yml` menjalankan validasi bank soal dan build pada
setiap pull request ke `main`. Setiap push yang masuk ke `main` otomatis mengunggah
hasil build ke VPS dan mengaktifkannya di `/var/www/ukmppd/public`.

Tambahkan secrets berikut di **Settings > Secrets and variables > Actions**:

- `VPS_HOST`: hostname atau IP VPS.
- `VPS_USER`: user SSH di VPS.
- `VPS_SSH_KEY`: private key SSH untuk user tersebut.
- `VPS_PORT`: port SSH (opsional, default `22`).
- `VPS_KNOWN_HOSTS`: output `ssh-keyscan -p PORT HOST` (disarankan).

User SSH perlu memiliki akses `sudo` tanpa password untuk `rsync` dan `chown` yang
dipakai saat aktivasi release. Konfigurasi Nginx saat ini mengarah ke
`/var/www/ukmppd/public`.

## Struktur

```
index.html                 kerangka halaman
src/
  main.js                  init, pemasangan seluruh event
  bank.js                  pemuat data: level, topik, soal
  state.js                 penyimpanan, konfigurasi, state sesi
  setup.js                 layar persiapan (level, materi, jumlah, fitur)
  quiz.js                  layar latihan (soal, jawab, timer)
  result.js                layar hasil (skor, capaian, pembahasan)
  style.css
data/
  subjects.json            daftar mata uji + pemetaan level ke file soalnya
  levels.json              daftar level kesulitan
  topics.json              daftar materi
  neurologi-dasar.json     89 soal
  neurologi-lanjut.json    80 soal
  anak-lanjut.json         101 soal
  gastro-lanjut.json       58 soal
sumber/
  materi/                  catatan & bahan bacaan mentah
  soal/                    naskah soal mentah sebelum diolah ke data/
scripts/
  validate-bank.mjs        pemeriksa konsistensi bank soal
  import-soal.mjs          naskah Markdown -> data/*.json
```

Isi `data/` adalah bank soal yang dipakai aplikasi; isi `sumber/` adalah bahan
mentahnya dan tidak ikut dimuat. Lihat `sumber/README.md`.

Satu file soal di `data/` berisi tepat satu pasangan mata uji x level. Pemetaannya
ada di `data/subjects.json`:

```json
{
  "id": "anak",
  "name": "Ilmu Kesehatan Anak",
  "blurb": "Neonatologi, tumbuh kembang, infeksi anak, gizi, dan jantung bawaan.",
  "banks": { "lanjut": "anak-lanjut.json" }
}
```

## Menambah soal

Buka file level yang sesuai di `data/`, tambahkan satu objek:

```json
{
  "id": 90,
  "topic": "stroke",
  "vignette": "Laki-laki 60 tahun ...",
  "options": ["A", "B", "C", "D", "E"],
  "answer": 2,
  "key": "Penjelasan mengapa jawaban ini benar.",
  "why": [
    "Alasan pilihan A salah.",
    "Alasan pilihan B salah.",
    "Benar. Alasan pilihan C benar.",
    "Alasan pilihan D salah.",
    "Alasan pilihan E salah."
  ]
}
```

Aturannya: `id` unik di dalam satu file, `topic` harus ada di `data/topics.json`,
`options` dan `why` tepat lima item, `answer` indeks 0-4. Mata uji dan level tidak
ditulis di dalam soal, keduanya berasal dari posisi file itu pada `subjects.json`.
Jalankan `npm run validate` untuk memastikan.

Kalau soalnya banyak, jangan diketik langsung ke JSON. Simpan naskahnya sebagai
Markdown di `sumber/soal/` lalu impor:

```bash
npm run import -- sumber/soal/psikiatri.md --dry   # pratinjau
npm run import -- sumber/soal/psikiatri.md         # tulis ke data/
```

Tujuan penulisannya diambil dari `subject:` dan `level:` pada frontmatter naskah.

Formatnya ada di `sumber/soal/_TEMPLATE.md`. Bagian pembahasan yang belum ada di
naskah diisi penanda `TODO:`, dan `npm run validate` menolak selama penanda itu
belum dibereskan.

## Menambah mata uji

1. Buat file soal baru, misal `data/psikiatri-lanjut.json`, formatnya sama seperti di atas.
2. Daftarkan di `data/subjects.json`:

```json
{
  "id": "psikiatri",
  "name": "Psikiatri",
  "blurb": "Gangguan cemas, mood, psikotik, dan penyalahgunaan zat.",
  "banks": { "lanjut": "psikiatri-lanjut.json" }
}
```

3. Tambahkan kode materinya di `data/topics.json`.

Tidak ada kode yang perlu diubah. Mata uji baru otomatis muncul di panel pemilih,
membawa daftar materinya sendiri, ikut dihitung pada capaian per mata uji, dan
tersimpan di riwayat.

## Menambah level kesulitan

1. Daftarkan levelnya di `data/levels.json`:

```json
{
  "id": "hots",
  "name": "HOTS",
  "blurb": "Soal analisis multi-langkah."
}
```

2. Tambahkan file soalnya pada `banks` mata uji yang memilikinya, misal
   `"banks": { "dasar": "...", "lanjut": "...", "hots": "neurologi-hots.json" }`.

Level yang belum punya file soal pada suatu mata uji tidak masalah: hitungannya
nol dan tidak disebut pada keterangan jumlah soal.

## Menambah materi

Tambahkan pasangan `"kode": "Nama Materi"` di `data/topics.json`, lalu pakai kodenya
pada field `topic` soal. Daftar materi yang tampil di layar persiapan menyesuaikan
mata uji yang sedang dipilih: hanya materi yang benar-benar dipakai soal yang muncul.

## Catatan

- Progres disimpan di `localStorage` browser (kunci `neuro:cfg`, `neuro:hist`, `neuro:wrong`).
- Soal ditandai lintas bank dengan uid `<mata uji>:<level>:<id>`. Kumpulan soal salah
  yang tersimpan dengan format lama `<level>:<id>` dipetakan otomatis saat aplikasi dimuat.
- `latihan-neurologi-ukmppd.html` adalah versi lama satu-file. Seluruh isinya sudah
  dipindah ke struktur di atas dan file itu tidak lagi dipakai.
