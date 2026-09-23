/* Cek konsistensi bank soal di public/data/bank.sqlite. Fungsi murni, tanpa
   process.exit/console, supaya bisa dipakai baik dari CLI (validate-bank.mjs)
   maupun dari admin/lib/git-publish.mjs sebagai gerbang sebelum commit. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, openDb, rowToQuestion } from "./db.mjs";

export function validateBank({ root = ROOT, gambarDir = join(root, "public", "gambar") } = {}) {
  const db = openDb();
  const errs = [];
  const warns = [];
  // Gambar sengaja tidak ikut git (lihat README), jadi checkout CI/segar
  // tidak akan pernah punya folder ini - kalau tidak ada, lewati pengecekan
  // gambar sama sekali daripada menggagalkan build tiap ada soal bergambar.
  const gambarAda = existsSync(gambarDir);

  const levels = db.prepare("SELECT * FROM levels ORDER BY sort").all();
  const subjects = db.prepare("SELECT * FROM subjects ORDER BY sort").all();
  const topics = Object.fromEntries(db.prepare("SELECT code, name FROM topics").all().map(t => [t.code, t.name]));

  if (!levels.length) errs.push("tabel levels harus berisi minimal satu level");
  if (!subjects.length) errs.push("tabel subjects harus berisi minimal satu mata uji");

  const levelIds = new Set(levels.map(l => l.id));
  const subjectIds = new Set(subjects.map(s => s.id));
  const dipakai = new Set();
  let total = 0;

  const rows = db.prepare("SELECT * FROM questions ORDER BY subject_id, level_id, id").all();
  const bySubjectLevel = {};
  for (const row of rows) {
    const key = `${row.subject_id}/${row.level_id}`;
    bySubjectLevel[key] = bySubjectLevel[key] || [];
    bySubjectLevel[key].push(row);
  }

  for (const row of rows) {
    const q = rowToQuestion(row);
    const at = `${q.subject}/${q.level}#${q.id}`;
    total++;
    if (!subjectIds.has(q.subject)) errs.push(`${at}: mata uji "${q.subject}" tidak ada di tabel subjects`);
    if (!levelIds.has(q.level)) errs.push(`${at}: level "${q.level}" tidak ada di tabel levels`);
    if (!topics[q.topic]) errs.push(`${at}: topik "${q.topic}" tidak ada di tabel topics`);
    else dipakai.add(q.topic);
    if (!q.vignette || q.vignette.length < 40) errs.push(`${at}: vignette kosong atau terlalu pendek`);
    if (!Array.isArray(q.options) || q.options.length !== 5) errs.push(`${at}: harus ada tepat 5 pilihan`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 4) errs.push(`${at}: answer harus 0-4`);
    if (!q.key) errs.push(`${at}: key (pembahasan utama) kosong`);
    const todo = [q.key, ...(Array.isArray(q.why) ? q.why : [])].filter(s => typeof s === "string" && s.startsWith("TODO:"));
    if (todo.length) errs.push(`${at}: masih ada ${todo.length} penanda TODO dari hasil import yang belum diisi`);
    if (!Array.isArray(q.why) || q.why.length !== 5) errs.push(`${at}: why harus 5 baris, satu per pilihan`);
    else if (q.why[q.answer] && !/^benar/i.test(q.why[q.answer])) {
      warns.push(`${at}: why pada pilihan kunci sebaiknya diawali "Benar."`);
    }
    if (q.image && gambarAda) {
      const rel = q.image.replace(/^gambar\//, "");
      if (!existsSync(join(gambarDir, rel))) {
        errs.push(`${at}: file gambar "${q.image}" tidak ditemukan di ${gambarDir}`);
      }
    }
  }

  Object.keys(topics).filter(t => !dipakai.has(t)).forEach(t => warns.push(`topik "${t}" tidak dipakai soal mana pun`));

  db.close();
  return { errors: errs, warnings: warns, total, subjects, levels, bySubjectLevel };
}
