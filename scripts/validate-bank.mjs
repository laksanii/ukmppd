/* Cek konsistensi bank soal sebelum build.
   Jalankan: npm run validate */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => JSON.parse(readFileSync(join(root, "data", f), "utf8"));

const topics = read("topics.json");
const levels = read("levels.json");
const subjects = read("subjects.json");
const errs = [];
const warns = [];

if (!Array.isArray(levels) || !levels.length) errs.push("levels.json harus berisi minimal satu level");
if (!Array.isArray(subjects) || !subjects.length) errs.push("subjects.json harus berisi minimal satu mata uji");

const levelIds = new Set();
for (const lv of levels) {
  for (const f of ["id", "name", "blurb"]) {
    if (!lv[f]) errs.push(`level ${lv.id || "?"}: field "${f}" wajib diisi`);
  }
  if (levelIds.has(lv.id)) errs.push(`id level ganda: ${lv.id}`);
  levelIds.add(lv.id);
}

const dipakai = new Set();
const seenSubject = new Set();
const seenFile = new Set();
let total = 0;

for (const sj of subjects) {
  for (const f of ["id", "name", "blurb"]) {
    if (!sj[f]) errs.push(`mata uji ${sj.id || "?"}: field "${f}" wajib diisi`);
  }
  if (seenSubject.has(sj.id)) errs.push(`id mata uji ganda: ${sj.id}`);
  seenSubject.add(sj.id);
  if (!sj.banks || !Object.keys(sj.banks).length) {
    errs.push(`mata uji ${sj.id}: "banks" harus memetakan minimal satu level ke file soal`);
    continue;
  }

  for (const [level, file] of Object.entries(sj.banks)) {
    const at0 = `mata uji ${sj.id} level ${level}`;
    if (!levelIds.has(level)) errs.push(`${at0}: level tidak ada di levels.json`);
    if (seenFile.has(file)) errs.push(`${at0}: data/${file} dipakai lebih dari satu bank`);
    seenFile.add(file);

    let bank;
    try {
      bank = read(file);
    } catch (e) {
      errs.push(`${at0}: gagal membaca data/${file} (${e.message})`);
      continue;
    }
    if (!Array.isArray(bank) || !bank.length) {
      errs.push(`${at0}: ${file} harus berupa array soal yang tidak kosong`);
      continue;
    }

    const seenId = new Set();
    for (const q of bank) {
      const at = `${sj.id}/${level}#${q.id}`;
      if (typeof q.id !== "number") errs.push(`${at}: id harus angka`);
      if (seenId.has(q.id)) errs.push(`${at}: id ganda di dalam bank yang sama`);
      seenId.add(q.id);
      if (!topics[q.topic]) errs.push(`${at}: topik "${q.topic}" tidak ada di topics.json`);
      else dipakai.add(q.topic);
      if (!q.vignette || q.vignette.length < 40) errs.push(`${at}: vignette kosong atau terlalu pendek`);
      if (!Array.isArray(q.options) || q.options.length !== 5) errs.push(`${at}: harus ada tepat 5 pilihan`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 4) errs.push(`${at}: answer harus 0-4`);
      if (!q.key) errs.push(`${at}: key (pembahasan utama) kosong`);
      // sisa hasil import yang belum dilengkapi tangan
      const todo = [q.key, ...(Array.isArray(q.why) ? q.why : [])].filter(s => typeof s === "string" && s.startsWith("TODO:"));
      if (todo.length) errs.push(`${at}: masih ada ${todo.length} penanda TODO dari hasil import yang belum diisi`);
      if (!Array.isArray(q.why) || q.why.length !== 5) errs.push(`${at}: why harus 5 baris, satu per pilihan`);
      else if (q.why[q.answer] && !/^benar/i.test(q.why[q.answer])) {
        warns.push(`${at}: why pada pilihan kunci sebaiknya diawali "Benar."`);
      }
    }
    total += bank.length;
    console.log(`  ${sj.id.padEnd(10)} ${level.padEnd(7)} ${String(bank.length).padStart(3)} soal  (${file})`);
  }
}

Object.keys(topics).filter(t => !dipakai.has(t)).forEach(t => warns.push(`topik "${t}" tidak dipakai soal mana pun`));

warns.forEach(w => console.log(`  ! ${w}`));
if (errs.length) {
  console.error(`\n${errs.length} kesalahan:`);
  errs.forEach(e => console.error(`  x ${e}`));
  process.exit(1);
}
console.log(`\nOK. ${total} soal, ${subjects.length} mata uji, ${levels.length} level, ${Object.keys(topics).length} topik.`);
