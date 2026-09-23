/* Migrasi sekali-jalan: data/*.json (subjects, levels, topics, tiap bank
   mata uji x level) -> public/data/bank.sqlite. Jalankan sekali saat pindah
   ke SQLite; aman dijalankan ulang (menimpa bank.sqlite dari nol).
   Pemakaian: npm run migrate:sqlite */
import { readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOT, DB_PATH, openDb } from "./lib/db.mjs";

const read = f => JSON.parse(readFileSync(join(ROOT, "data", f), "utf8"));

const subjects = read("subjects.json");
const levels = read("levels.json");
const topics = read("topics.json");

if (existsSync(DB_PATH)) rmSync(DB_PATH);
for (const ext of ["-wal", "-shm"]) {
  const p = DB_PATH + ext;
  if (existsSync(p)) rmSync(p);
}
const db = openDb();

const insSubject = db.prepare("INSERT INTO subjects (id, name, blurb, sort) VALUES (?, ?, ?, ?)");
const insLevel = db.prepare("INSERT INTO levels (id, name, blurb, sort) VALUES (?, ?, ?, ?)");
const insTopic = db.prepare("INSERT INTO topics (code, name) VALUES (?, ?)");
const insQuestion = db.prepare(`INSERT INTO questions
  (subject_id, level_id, topic, vignette, image, options, answer, key, why)
  VALUES (@subject_id, @level_id, @topic, @vignette, @image, @options, @answer, @key, @why)`);

let total = 0;
db.transaction(() => {
  levels.forEach((lv, i) => insLevel.run(lv.id, lv.name, lv.blurb, i));
  subjects.forEach((sj, i) => insSubject.run(sj.id, sj.name, sj.blurb, i));
  Object.entries(topics).forEach(([code, name]) => insTopic.run(code, name));

  for (const sj of subjects) {
    for (const [levelId, file] of Object.entries(sj.banks)) {
      const bank = read(file);
      for (const q of bank) {
        insQuestion.run({
          subject_id: sj.id,
          level_id: levelId,
          topic: q.topic,
          vignette: q.vignette,
          image: q.image || null,
          options: JSON.stringify(q.options),
          answer: q.answer,
          key: q.key,
          why: JSON.stringify(q.why)
        });
        total++;
      }
      console.log(`  ${sj.id.padEnd(10)} ${levelId.padEnd(7)} ${String(bank.length).padStart(3)} soal  (${file})`);
    }
  }
})();

db.close();
console.log(`\nOK. ${total} soal dimigrasi ke ${DB_PATH.replace(ROOT + "/", "")}.`);
