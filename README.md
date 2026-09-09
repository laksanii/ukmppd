# Latihan Neurologi UKMPPD

Aplikasi latihan soal UKMPPD dengan bank soal berjenjang. Sebelumnya berupa satu
file HTML statis; sekarang dipecah jadi data JSON + modul JavaScript yang dibundel
Vite, sehingga menambah soal atau level kesulitan tidak perlu menyentuh kode UI.

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
  levels.json              daftar level kesulitan
  topics.json              daftar materi
  neurologi-dasar.json     89 soal
  neurologi-lanjut.json    60 soal
sumber/
  materi/                  catatan & bahan bacaan mentah
  soal/                    naskah soal mentah sebelum diolah ke data/
scripts/
  validate-bank.mjs        pemeriksa konsistensi bank soal
  import-soal.mjs          naskah Markdown -> data/*.json
```

Isi `data/` adalah bank soal yang dipakai aplikasi; isi `sumber/` adalah bahan
mentahnya dan tidak ikut dimuat. Lihat `sumber/README.md`.

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
`options` dan `why` tepat lima item, `answer` indeks 0-4. Jalankan `npm run validate`
untuk memastikan.

Kalau soalnya banyak, jangan diketik langsung ke JSON. Simpan naskahnya sebagai
Markdown di `sumber/soal/` lalu impor:

```bash
npm run import -- sumber/soal/psikiatri.md --dry   # pratinjau
npm run import -- sumber/soal/psikiatri.md         # tulis ke data/
```

Formatnya ada di `sumber/soal/_TEMPLATE.md`. Bagian pembahasan yang belum ada di
naskah diisi penanda `TODO:`, dan `npm run validate` menolak selama penanda itu
belum dibereskan.

## Menambah level kesulitan

1. Buat file soal baru, misal `data/neurologi-hots.json`, formatnya sama seperti di atas.
2. Daftarkan di `data/levels.json`:

```json
{
  "id": "hots",
  "name": "HOTS",
  "blurb": "Soal analisis multi-langkah.",
  "file": "neurologi-hots.json"
}
```

Tidak ada kode yang perlu diubah. Level baru otomatis muncul di panel pemilih level,
ikut dihitung pada capaian per level, dan tersimpan di riwayat.

## Menambah materi

Tambahkan pasangan `"kode": "Nama Materi"` di `data/topics.json`, lalu pakai kodenya
pada field `topic` soal.

## Catatan

- Progres disimpan di `localStorage` browser (kunci `neuro:cfg`, `neuro:hist`, `neuro:wrong`).
- `latihan-neurologi-ukmppd.html` adalah versi lama satu-file. Seluruh isinya sudah
  dipindah ke struktur di atas dan file itu tidak lagi dipakai.
