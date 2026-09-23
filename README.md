# Latihan UKMPPD

Aplikasi latihan soal UKMPPD. Bank soalnya dipilah dua sumbu: **mata uji**
(neurologi, ilmu kesehatan anak, gastroenterologi, dst) dan **level kesulitan**
(dasar, lanjut). Datanya disimpan di satu database SQLite
(`public/data/bank.sqlite`), dibaca langsung di browser lewat `sql.js` (SQLite
lewat WASM) — tidak ada backend untuk aplikasi soalnya sendiri, tetap situs
statis biasa. Mengelola soal (tambah/ubah/hapus soal + gambar) lewat admin
tool terpisah (`admin/`), bukan dengan edit database tangan.

## Menjalankan

```bash
npm install       # juga menyalin wasm sql.js ke public/vendor/ (postinstall)
npm run dev       # http://localhost:5173
npm run build     # validasi bank soal lalu bundel ke dist/
npm run preview   # cek hasil build
npm run validate  # cek konsistensi bank soal saja
npm run import -- sumber/soal/x.md   # naskah Markdown -> bank soal (SQLite)
npm run manage    # admin tool: http://localhost:4600
```

Hasil `npm run build` di `dist/` adalah file statis biasa (HTML/JS/CSS +
`data/bank.sqlite` + `vendor/*.wasm`), bisa langsung ditaruh di GitHub Pages,
Netlify, atau server statis apa pun (`base` sudah relatif). Gambar soal
(`public/gambar/`) **tidak** ikut ter-build dari git — lihat bagian
"Gambar soal" di bawah.

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
`/var/www/ukmppd/public`. Langkah deploy sengaja mengecualikan folder
`gambar/` dari `rsync --delete` supaya gambar yang diupload lewat admin tool
langsung di VPS tidak ikut terhapus tiap deploy (lihat bagian "Gambar soal").

## Struktur

```
index.html                 kerangka halaman aplikasi soal
src/
  main.js                  init (muat bank soal lalu pasang event)
  bank.js                  pemuat data: fetch bank.sqlite, query lewat sql.js
  state.js                 penyimpanan, konfigurasi, state sesi
  setup.js                 layar persiapan (level, materi, jumlah, fitur)
  quiz.js                  layar latihan (soal, jawab, timer, gambar)
  result.js                layar hasil (skor, capaian, pembahasan, gambar)
  style.css
public/
  data/bank.sqlite         satu-satunya sumber data: mata uji, level, topik, soal
  vendor/                  wasm sql.js, dibuat ulang otomatis (postinstall), gitignored
  gambar/                  gambar soal, gitignored (lihat "Gambar soal")
admin/
  server.mjs               server admin (Express): CRUD soal, upload gambar, publish
  lib/                     akses DB & git publish untuk admin
  public/                  UI admin (vanilla JS, tanpa build step)
sumber/
  materi/                  catatan & bahan bacaan mentah
  soal/                    naskah soal mentah sebelum diimpor ke bank.sqlite
scripts/
  lib/db.mjs               skema & koneksi bersama ke bank.sqlite
  lib/validate.mjs          pemeriksa konsistensi bank soal (fungsi murni)
  validate-bank.mjs        wrapper CLI dari lib/validate.mjs
  import-soal.mjs          naskah Markdown -> baris di bank.sqlite
  taxonomy.mjs             CLI tambah mata uji/level/topik baru
  migrate-json-to-sqlite.mjs   migrasi sekali-jalan dari skema data/*.json lama
  copy-sqljs-wasm.mjs      salin wasm sql.js ke public/vendor/ (hook postinstall)
```

## Skema bank soal

Tabel di `public/data/bank.sqlite`:

- `subjects (id, name, blurb, sort)` — mata uji.
- `levels (id, name, blurb, sort)` — level kesulitan.
- `topics (code, name)` — daftar materi.
- `questions (id, subject_id, level_id, topic, vignette, image, options, answer, key, why)`
  — `options`/`why` disimpan sebagai teks JSON (array 5 string), `answer` indeks
  0-4, `image` opsional (path relatif ke `public/`, mis. `gambar/anak-lanjut/x.jpg`).

`id` soal autoincrement global (dulu unik per file JSON per mata uji x level).
Konsep "banks" (satu file JSON = satu pasangan mata uji x level) sudah tidak
ada — soal tinggal difilter `subject_id`+`level_id` langsung dari tabel
`questions`.

## Mengelola soal (admin tool)

```bash
npm run manage    # http://localhost:4600, token dicetak ke log saat pertama jalan
```

Bisa tambah, ubah, hapus soal, dan upload gambar lewat form web. Sebelum
publish, tool menjalankan validasi yang sama dengan `npm run validate`.
Tombol "Validasi & publish" akan `git commit` + `git push` ke `main` kalau
lolos validasi — push ini otomatis memicu `ci-cd.yml` untuk build & deploy.

**Menjalankan di VPS** (bukan cuma lokal): checkout repo ini di VPS terpisah
dari document root Nginx (`/var/www/ukmppd/public` ditimpa tiap deploy, jangan
taruh admin di situ), lalu jalankan `admin/server.mjs` permanen lewat
systemd/pm2, contoh unit systemd:

```ini
[Unit]
Description=UKMPPD admin tool
After=network.target

[Service]
WorkingDirectory=/opt/ukmppd
ExecStart=/usr/bin/node admin/server.mjs
Environment=PORT=4600
Environment=GAMBAR_DIR=/var/www/ukmppd/public/gambar
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

`GAMBAR_DIR` diarahkan ke folder gambar di dalam document root Nginx yang
sudah live, supaya gambar yang baru diupload langsung tersaji tanpa perlu
deploy (lihat "Gambar soal" di bawah). Buka port `4600` di firewall VPS kalau
mau diakses dari luar. Tidak ada sistem login berlapis — proteksinya cuma
token acak yang di-generate otomatis ke `admin/.token` saat pertama jalan
(dicetak juga ke log). Simpan token itu baik-baik; siapa pun yang punya
token bisa menulis soal dan men-trigger `git push`.

**Menambah mata uji/level/topik baru** bukan lewat UI admin (jarang
dilakukan, dan taksonomi lintas tabel), tapi lewat CLI kecil:

```bash
npm run taxonomy -- list
npm run taxonomy -- add-subject psikiatri "Psikiatri" "Gangguan cemas, mood, psikotik, dan penyalahgunaan zat."
npm run taxonomy -- add-level hots "HOTS" "Soal analisis multi-langkah."
npm run taxonomy -- add-topic waham "Gangguan waham"
```

Setelah menambah, jalankan `npm run validate`, lalu commit + push seperti
biasa (bukan lewat tombol publish admin).

## Gambar soal

Gambar **tidak** disimpan di git (beda dari `bank.sqlite` yang tetap
di-commit) — supaya repo tidak membengkak oleh file biner, gambar cuma ada di
filesystem tempat admin tool jalan:

- Lokal: `public/gambar/<mata-uji>-<level>/berkas.ext` (gitignored).
- VPS: langsung ke folder gambar di document root Nginx (lewat env
  `GAMBAR_DIR`), supaya tersaji seketika tanpa perlu deploy, dan tidak ikut
  terhapus tiap deploy (`ci-cd.yml` mengecualikan `/gambar/` dari
  `rsync --delete`).

Konsekuensinya: kalau VPS-nya hilang/rusak tanpa backup terpisah, gambar ikut
hilang (soal & jawaban tetap aman karena itu ada di `bank.sqlite` yang
di-commit ke git). Backup folder `gambar/` secara berkala kalau itu penting.

## Menambah soal lewat naskah Markdown

Sumber naskah tetap Markdown di `sumber/soal/`, formatnya di
`sumber/soal/_TEMPLATE.md`. Importer sekarang menulis ke `bank.sqlite`,
bukan ke file JSON:

```bash
npm run import -- sumber/soal/psikiatri.md --subject psikiatri --level lanjut --dry   # pratinjau
npm run import -- sumber/soal/psikiatri.md --subject psikiatri --level lanjut         # tulis ke bank.sqlite
```

`--subject`/`--level` bisa juga ditulis di frontmatter naskah (`subject:`,
`level:`). Mata uji dan level itu harus sudah ada (lihat `npm run taxonomy --
list`, atau tambah dulu lewat `npm run taxonomy -- add-subject/add-level`).
Bagian pembahasan yang belum ada di naskah diisi penanda `TODO:`, dan
`npm run validate` menolak selama penanda itu belum dibereskan. Soal yang
vignette-nya sudah ada di kombinasi mata uji + level yang sama otomatis
dilewati sebagai duplikat.

## Catatan

- Progres pemakai (skor, riwayat, soal yang pernah salah) disimpan di
  `localStorage` browser (kunci `neuro:cfg`, `neuro:hist`, `neuro:wrong`),
  tidak berhubungan dengan `bank.sqlite`.
- Soal ditandai lintas mata uji dengan uid `<mata uji>:<level>:<id soal>`.
  Kumpulan soal salah yang tersimpan dengan format lama `<level>:<id>`
  dipetakan otomatis saat aplikasi dimuat.
- Diff isi soal di git jadi biner (`bank.sqlite`), tidak lagi bisa dibaca
  sebagai diff teks seperti skema JSON lama. Trade-off yang diterima supaya
  admin tool bisa CRUD transaksional tanpa risiko file JSON korup saat
  ditulis bersamaan.
- `latihan-neurologi-ukmppd.html` adalah versi lama satu-file, sudah tidak
  dipakai.
