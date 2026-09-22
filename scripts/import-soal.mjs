/* Ubah naskah soal Markdown di sumber/soal/ menjadi bank soal JSON di data/.
   Lihat sumber/soal/_TEMPLATE.md untuk format yang dikenali.

   Pemakaian:
     npm run import -- sumber/soal/psikiatri.md
     npm run import -- sumber/soal/psikiatri.md --subject anak --level lanjut
     npm run import -- sumber/soal/psikiatri.md --topic kepala
     npm run import -- sumber/soal/psikiatri.md --dry      (lihat hasil, tanpa menulis)
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LET = ["a", "b", "c", "d", "e"];
const TODO = "TODO: ";

/* ---------------- argumen ---------------- */
const argv = process.argv.slice(2);
const opt = { dry: false };
const bebas = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--dry") opt.dry = true;
  else if (a === "--level") opt.level = argv[++i];
  else if (a === "--subject") opt.subject = argv[++i];
  else if (a === "--topic") opt.topic = argv[++i];
  else if (a === "--out") opt.out = argv[++i];
  else if (a.startsWith("--")) fatal(`opsi tidak dikenal: ${a}`);
  else bebas.push(a);
}
if (bebas.length !== 1) fatal("pemakaian: npm run import -- <file.md> [--subject id] [--level id] [--topic kode] [--out data/x.json] [--dry]");

const berkas = resolve(root, bebas[0]);
if (!existsSync(berkas)) fatal(`file tidak ditemukan: ${bebas[0]}`);

function fatal(pesan) {
  console.error(`\nGagal: ${pesan}\n`);
  process.exit(1);
}

/* ---------------- frontmatter ---------------- */
let teks = readFileSync(berkas, "utf8").replace(/\r\n/g, "\n");
const fm = {};
const mfm = teks.match(/^---\n([\s\S]*?)\n---\n/);
if (mfm) {
  mfm[1].split("\n").forEach(b => {
    const m = b.match(/^\s*([a-zA-Z_]+)\s*:\s*(.+?)\s*$/);
    if (m) fm[m[1]] = m[2];
  });
  teks = teks.slice(mfm[0].length);
}

const topics = JSON.parse(readFileSync(join(root, "data/topics.json"), "utf8"));
const levels = JSON.parse(readFileSync(join(root, "data/levels.json"), "utf8"));
const subjects = JSON.parse(readFileSync(join(root, "data/subjects.json"), "utf8"));
const topikDefault = opt.topic || fm.topic || null;
const levelId = opt.level || fm.level || null;
const subjectId = opt.subject || fm.subject || null;

/* Tujuan tulis ditentukan pasangan mata uji x level, sesuai "banks" pada
   data/subjects.json. --out tetap bisa dipakai untuk menimpa penentuan itu. */
let tujuan = opt.out || fm.file;
if (!tujuan && (subjectId || levelId)) {
  if (!subjectId) fatal(`mata uji belum ditentukan. Beri --subject <id> atau tulis subject: di frontmatter. Yang tersedia: ${subjects.map(s => s.id).join(", ")}`);
  if (!levelId) fatal(`level belum ditentukan. Beri --level <id> atau tulis level: di frontmatter. Yang tersedia: ${levels.map(l => l.id).join(", ")}`);
  const sj = subjects.find(s => s.id === subjectId);
  if (!sj) fatal(`mata uji "${subjectId}" tidak ada di data/subjects.json. Yang tersedia: ${subjects.map(s => s.id).join(", ")}`);
  if (!levels.some(l => l.id === levelId)) fatal(`level "${levelId}" tidak ada di data/levels.json. Yang tersedia: ${levels.map(l => l.id).join(", ")}`);
  const file = sj.banks && sj.banks[levelId];
  if (!file) fatal(`mata uji "${subjectId}" belum punya bank untuk level "${levelId}". Tambahkan dulu pasangan itu di "banks" pada data/subjects.json.`);
  tujuan = `data/${file}`;
}
if (!tujuan) fatal("tujuan tidak diketahui. Beri --subject <id> --level <id>, atau --out data/namafile.json, atau tulis subject: dan level: di frontmatter naskah.");
if (!tujuan.startsWith("data/")) tujuan = `data/${tujuan}`;

/* ---------------- parser ---------------- */
const baris = teks.split("\n");
const soal = [];
const galat = [];
let q = null, mode = null;

const simpan = () => { if (q) soal.push(q); q = null; mode = null; };
const rapikan = s => s.replace(/\s+/g, " ").trim();

baris.forEach((brs, idx) => {
  const no = idx + 1;
  const b = brs.trim();

  // judul bagian: "# HOME WORK NEUROLOGI" -> diabaikan
  if (/^#{1,6}\s+[^\d]/.test(b)) return;

  // awal soal: "1. vignette", "## 1. vignette", "1. [kepala] vignette",
  // "1. [Gambar] vignette" (soal ada asset gambar, ditandai sebagai placeholder
  // sampai fitur gambar sungguhan dibuat)
  const mSoal = b.match(/^#{0,6}\s*(\d+)\.\s+(.*)$/);
  if (mSoal && !/^[a-e][.)]/i.test(b)) {
    simpan();
    let sisa = mSoal[2];
    let gambar = false, kodeTopik = null;
    let mTag;
    while ((mTag = sisa.match(/^\[([a-zA-Z0-9_-]+)\]\s*/))) {
      if (/^gambar$/i.test(mTag[1])) gambar = true;
      else kodeTopik = mTag[1];
      sisa = sisa.slice(mTag[0].length);
    }
    q = {
      no: +mSoal[1], baris: no, topic: kodeTopik || topikDefault,
      vignette: sisa ? [gambar ? `[Gambar] ${sisa}` : sisa] : [], options: [], answer: null,
      key: [], why: new Array(5).fill(null)
    };
    mode = "vignette";
    return;
  }
  if (!q) return;

  // penanda blok
  if (/^pembahasan\s*:/i.test(b)) { mode = "key"; q.key.push(b.replace(/^pembahasan\s*:/i, "").trim()); return; }
  if (/^alasan\s*:?$/i.test(b)) { mode = "why"; return; }
  if (/^topik\s*:/i.test(b)) { q.topic = b.replace(/^topik\s*:/i, "").trim(); return; }
  // naskah aslinya cacat (pilihan terpotong, kunci tidak jelas): biarkan di
  // naskah sebagai catatan, tapi jangan ikut diimpor dan jangan bikin gagal
  if (/^lewati\s*:/i.test(b)) { q.lewati = b.replace(/^lewati\s*:/i, "").trim() || "ditandai lewati"; return; }
  if (/^kunci\s*:/i.test(b)) {
    const h = b.replace(/^kunci\s*:/i, "").trim().toLowerCase()[0];
    const k = LET.indexOf(h);
    if (k < 0) galat.push(`baris ${no}: kunci "${h}" bukan a-e`);
    else q.answer = k;
    return;
  }

  // alasan per pilihan: "- a: ..." atau "a: ..."
  const mWhy = b.match(/^[-*]?\s*([a-eA-E])\s*:\s*(.+)$/);
  if (mWhy && (mode === "why" || mode === "key")) {
    mode = "why";
    q.why[LET.indexOf(mWhy[1].toLowerCase())] = mWhy[2].trim();
    return;
  }

  // pilihan jawaban: "a. teks", "a) teks", "**c. teks**"
  const mOpt = b.match(/^(\*\*)?\s*([a-eA-E])[.)]\s*(.+?)\s*(\*\*)?$/);
  if (mOpt && (mode === "vignette" || mode === "options")) {
    mode = "options";
    const k = LET.indexOf(mOpt[2].toLowerCase());
    const tebal = (mOpt[1] && mOpt[4]) || /^\*\*.*\*\*$/.test(b);
    let isi = mOpt[3].replace(/\*\*/g, "").trim();
    if (k !== q.options.length) galat.push(`soal ${q.no} (baris ${no}): urutan pilihan melompat, harusnya "${LET[q.options.length]}."`);
    q.options.push(isi);
    if (tebal) {
      if (q.answer !== null && q.answer !== k) galat.push(`soal ${q.no}: kunci ganda`);
      q.answer = k;
    }
    return;
  }

  if (!b) return;
  if (mode === "vignette") q.vignette.push(b);
  else if (mode === "key") q.key.push(b);
});
simpan();

if (!soal.length) fatal("tidak ada soal yang terbaca. Cek formatnya di sumber/soal/_TEMPLATE.md");

/* ---------------- rapikan & periksa ---------------- */
const dilewati = soal.filter(q => q.lewati);
const perluDiisi = [];
const hasil = soal.filter(q => !q.lewati).map(q => {
  const at = `soal ${q.no}`;
  if (!q.topic) galat.push(`${at}: topik belum ditentukan. Tambah "[kode]" setelah nomor, baris "Topik: kode", frontmatter topic:, atau opsi --topic`);
  else if (!topics[q.topic]) galat.push(`${at}: topik "${q.topic}" tidak ada di data/topics.json`);
  if (q.options.length !== 5) galat.push(`${at}: pilihan ada ${q.options.length}, harus 5`);
  if (q.answer === null) galat.push(`${at}: kunci belum ditandai (tebalkan pilihannya atau tulis "Kunci: c")`);
  const vignette = rapikan(q.vignette.join(" "));
  if (vignette.length < 40) galat.push(`${at}: vignette kosong atau terlalu pendek`);

  const key = rapikan(q.key.join(" "));
  const kosongKey = !key;
  const why = q.why.map((w, k) => {
    if (w) return rapikan(w);
    return k === q.answer ? `${TODO}Benar. alasan pilihan ${LET[k].toUpperCase()} benar.` : `${TODO}alasan pilihan ${LET[k].toUpperCase()} salah.`;
  });
  if (kosongKey || q.why.some(w => !w)) perluDiisi.push(q.no);

  return {
    topic: q.topic, vignette, options: q.options,
    answer: q.answer, key: kosongKey ? `${TODO}pembahasan kunci ${at}.` : key, why
  };
});

if (galat.length) {
  console.error(`\n${galat.length} masalah pada naskah:`);
  galat.forEach(g => console.error(`  x ${g}`));
  process.exit(1);
}

/* ---------------- gabung ke bank ---------------- */
const jalurTujuan = join(root, tujuan);
const lama = existsSync(jalurTujuan) ? JSON.parse(readFileSync(jalurTujuan, "utf8")) : [];
const sidik = v => v.toLowerCase().replace(/[^a-z0-9]/g, "");
const sudahAda = new Set(lama.map(x => sidik(x.vignette)));
let idBerikut = lama.reduce((m, x) => Math.max(m, x.id), 0) + 1;

const baru = [], duplikat = [];
for (const q of hasil) {
  if (sudahAda.has(sidik(q.vignette))) { duplikat.push(q); continue; }
  sudahAda.add(sidik(q.vignette));
  baru.push({ id: idBerikut++, ...q });
}

console.log(`\nNaskah  : ${bebas[0]}`);
console.log(`Tujuan  : ${tujuan}${lama.length ? ` (sudah ada ${lama.length} soal)` : " (file baru)"}`);
console.log(`Terbaca : ${hasil.length} soal`);
if (dilewati.length) {
  console.log(`Ditandai lewati: ${dilewati.length} soal`);
  dilewati.forEach(q => console.log(`  - soal ${q.no}: ${q.lewati}`));
}
if (duplikat.length) console.log(`Duplikat: ${duplikat.length} soal (vignette-nya sudah ada di bank)`);
console.log(`Ditambah: ${baru.length} soal${baru.length ? `, id ${baru[0].id}-${baru[baru.length - 1].id}` : ""}`);

const topikDipakai = {};
baru.forEach(q => topikDipakai[q.topic] = (topikDipakai[q.topic] || 0) + 1);
if (baru.length) console.log(`Topik   : ${Object.entries(topikDipakai).map(([k, v]) => `${k} ${v}`).join(", ")}`);

if (perluDiisi.length) {
  console.log(`\nMasih perlu diisi tangan (pembahasan/alasan belum ada di naskah):`);
  console.log(`  soal nomor ${perluDiisi.join(", ")}`);
  console.log(`  cari penanda "${TODO.trim()}" di ${tujuan}. npm run validate akan menolak selama penanda ini masih ada.`);
}

if (opt.dry) {
  console.log(`\n--dry: tidak ada file yang ditulis. Contoh hasil soal pertama:\n`);
  console.log(JSON.stringify(baru[0] || hasil[0], null, 2));
  process.exit(0);
}
if (!baru.length) { console.log("\nTidak ada yang ditulis."); process.exit(0); }

writeFileSync(jalurTujuan, JSON.stringify([...lama, ...baru], null, 2) + "\n");
console.log(`\nDitulis ke ${tujuan}. Jalankan: npm run validate`);
