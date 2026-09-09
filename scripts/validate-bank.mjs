/* Cek konsistensi bank soal sebelum build.
   Jalankan: npm run validate */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => JSON.parse(readFileSync(join(root, "data", f), "utf8"));

const topics = read("topics.json");
const levels = read("levels.json");
const errs = [];
const warns = [];

if (!Array.isArray(levels) || !levels.length) errs.push("levels.json harus berisi minimal satu level");

const seenLevel = new Set();
let total = 0;

for (const lv of levels) {
  for (const f of ["id", "name", "blurb", "file"]) {
    if (!lv[f]) errs.push(`level ${lv.id || "?"}: field "${f}" wajib diisi`);
  }
  if (seenLevel.has(lv.id)) errs.push(`id level ganda: ${lv.id}`);
  seenLevel.add(lv.id);

  let bank;
  try {
    bank = read(lv.file);
  } catch (e) {
    errs.push(`level ${lv.id}: gagal membaca data/${lv.file} (${e.message})`);
    continue;
  }
  if (!Array.isArray(bank) || !bank.length) {
    errs.push(`level ${lv.id}: ${lv.file} harus berupa array soal yang tidak kosong`);
    continue;
  }

  const seenId = new Set();
  for (const q of bank) {
    const at = `${lv.id}#${q.id}`;
    if (typeof q.id !== "number") errs.push(`${at}: id harus angka`);
    if (seenId.has(q.id)) errs.push(`${at}: id ganda di dalam level yang sama`);
    seenId.add(q.id);
    if (!topics[q.topic]) errs.push(`${at}: topik "${q.topic}" tidak ada di topics.json`);
    if (!q.vignette || q.vignette.length < 40) errs.push(`${at}: vignette kosong atau terlalu pendek`);
    if (!Array.isArray(q.options) || q.options.length !== 5) errs.push(`${at}: harus ada tepat 5 pilihan`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 4) errs.push(`${at}: answer harus 0-4`);
    if (!q.key) errs.push(`${at}: key (pembahasan utama) kosong`);
    if (!Array.isArray(q.why) || q.why.length !== 5) errs.push(`${at}: why harus 5 baris, satu per pilihan`);
    else if (q.why[q.answer] && !/^benar/i.test(q.why[q.answer])) {
      warns.push(`${at}: why pada pilihan kunci sebaiknya diawali "Benar."`);
    }
  }
  total += bank.length;
  console.log(`  ${lv.id.padEnd(10)} ${String(bank.length).padStart(3)} soal  (${lv.file})`);
}

const dipakai = new Set();
for (const lv of levels) {
  try { read(lv.file).forEach(q => dipakai.add(q.topic)); } catch {}
}
Object.keys(topics).filter(t => !dipakai.has(t)).forEach(t => warns.push(`topik "${t}" tidak dipakai soal mana pun`));

warns.forEach(w => console.log(`  ! ${w}`));
if (errs.length) {
  console.error(`\n${errs.length} kesalahan:`);
  errs.forEach(e => console.error(`  x ${e}`));
  process.exit(1);
}
console.log(`\nOK. ${total} soal, ${levels.length} level, ${Object.keys(topics).length} topik.`);
