/* Cek konsistensi bank soal sebelum build.
   Jalankan: npm run validate */
import { validateBank } from "./lib/validate.mjs";

const { errors, warnings, total, subjects, levels, bySubjectLevel } = validateBank();

for (const sj of subjects) {
  for (const lv of levels) {
    const rows = bySubjectLevel[`${sj.id}/${lv.id}`];
    if (rows) console.log(`  ${sj.id.padEnd(10)} ${lv.id.padEnd(7)} ${String(rows.length).padStart(3)} soal`);
  }
}

warnings.forEach(w => console.log(`  ! ${w}`));
if (errors.length) {
  console.error(`\n${errors.length} kesalahan:`);
  errors.forEach(e => console.error(`  x ${e}`));
  process.exit(1);
}
console.log(`\nOK. ${total} soal, ${subjects.length} mata uji, ${levels.length} level.`);
