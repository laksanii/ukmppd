/* Akses bersama ke public/data/bank.sqlite: satu-satunya sumber data bank
   soal (mata uji, level, topik, soal). Dipakai oleh script migrasi/import/
   validasi dan oleh admin/server.mjs. */
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DB_PATH = join(ROOT, "public", "data", "bank.sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL,
  sort INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  blurb TEXT NOT NULL,
  sort INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS topics (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  level_id TEXT NOT NULL REFERENCES levels(id),
  topic TEXT NOT NULL REFERENCES topics(code),
  vignette TEXT NOT NULL,
  image TEXT,
  options TEXT NOT NULL,
  answer INTEGER NOT NULL,
  key TEXT NOT NULL,
  why TEXT NOT NULL
);
`;

export function openDb(path = DB_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
}

export const rowToQuestion = row => ({
  id: row.id,
  subject: row.subject_id,
  level: row.level_id,
  topic: row.topic,
  vignette: row.vignette,
  image: row.image || undefined,
  options: JSON.parse(row.options),
  answer: row.answer,
  key: row.key,
  why: JSON.parse(row.why)
});
