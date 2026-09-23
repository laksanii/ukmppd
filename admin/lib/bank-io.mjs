/* CRUD soal + simpan gambar, dipakai admin/server.mjs. Baca/tulis langsung
   ke public/data/bank.sqlite lewat scripts/lib/db.mjs. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { ROOT, openDb, rowToQuestion } from "../../scripts/lib/db.mjs";

export const GAMBAR_DIR = process.env.GAMBAR_DIR || join(ROOT, "public", "gambar");

export function getMeta() {
  const db = openDb();
  const subjects = db.prepare("SELECT id, name, blurb FROM subjects ORDER BY sort").all();
  const levels = db.prepare("SELECT id, name, blurb FROM levels ORDER BY sort").all();
  const topics = db.prepare("SELECT code, name FROM topics ORDER BY code").all();
  db.close();
  return { subjects, levels, topics };
}

export function listQuestions(subject, level) {
  const db = openDb();
  const rows = db.prepare(
    "SELECT * FROM questions WHERE subject_id = ? AND level_id = ? ORDER BY id"
  ).all(subject, level);
  db.close();
  return rows.map(rowToQuestion);
}

function validatePayload(body) {
  const errs = [];
  if (!body.subject) errs.push("subject wajib diisi");
  if (!body.level) errs.push("level wajib diisi");
  if (!body.topic) errs.push("topic wajib diisi");
  if (!body.vignette || body.vignette.length < 40) errs.push("vignette minimal 40 karakter");
  if (!Array.isArray(body.options) || body.options.length !== 5) errs.push("options harus 5 item");
  if (!Number.isInteger(body.answer) || body.answer < 0 || body.answer > 4) errs.push("answer harus 0-4");
  if (!body.key) errs.push("key wajib diisi");
  if (!Array.isArray(body.why) || body.why.length !== 5) errs.push("why harus 5 item");
  return errs;
}

export function addQuestion(body) {
  const errs = validatePayload(body);
  if (errs.length) return { errors: errs };
  const db = openDb();
  const info = db.prepare(`INSERT INTO questions
    (subject_id, level_id, topic, vignette, image, options, answer, key, why)
    VALUES (@subject_id, @level_id, @topic, @vignette, @image, @options, @answer, @key, @why)`).run({
    subject_id: body.subject, level_id: body.level, topic: body.topic, vignette: body.vignette,
    image: body.image || null, options: JSON.stringify(body.options), answer: body.answer,
    key: body.key, why: JSON.stringify(body.why)
  });
  const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(info.lastInsertRowid);
  db.close();
  return { question: rowToQuestion(row) };
}

export function updateQuestion(id, body) {
  const errs = validatePayload(body);
  if (errs.length) return { errors: errs };
  const db = openDb();
  const exists = db.prepare("SELECT 1 FROM questions WHERE id = ?").get(id);
  if (!exists) { db.close(); return { errors: [`soal id ${id} tidak ditemukan`] }; }
  db.prepare(`UPDATE questions SET
    subject_id=@subject_id, level_id=@level_id, topic=@topic, vignette=@vignette,
    image=@image, options=@options, answer=@answer, key=@key, why=@why
    WHERE id=@id`).run({
    id, subject_id: body.subject, level_id: body.level, topic: body.topic, vignette: body.vignette,
    image: body.image || null, options: JSON.stringify(body.options), answer: body.answer,
    key: body.key, why: JSON.stringify(body.why)
  });
  const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
  db.close();
  return { question: rowToQuestion(row) };
}

export function deleteQuestion(id) {
  const db = openDb();
  const info = db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  db.close();
  return info.changes > 0;
}

export function saveImage(subject, level, originalName, buffer) {
  const ext = (originalName.match(/\.[a-zA-Z0-9]+$/) || [".jpg"])[0].toLowerCase();
  const name = `${randomBytes(8).toString("hex")}${ext}`;
  const dir = join(GAMBAR_DIR, `${subject}-${level}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), buffer);
  return `gambar/${subject}-${level}/${name}`;
}
