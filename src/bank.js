/* Pemuat bank soal. Sumber datanya public/data/bank.sqlite (satu database
   untuk mata uji, level, topik, dan seluruh soal), dibaca lewat sql.js
   (SQLite lewat WASM) langsung di browser saat aplikasi dimuat.

   Menambah bank soal sekarang lewat admin tool (lihat README), bukan lagi
   dengan menambah file JSON. */
import initSqlJs from "sql.js";

export let LEVELS = [];
export let LEVEL_IDS = [];
export let SUBJECTS = [];
export let SUBJECT_IDS = [];
export let SUBJECT_BY_ID = {};
export let LEVEL_BY_ID = {};
export let BANK = [];
export let TOPICS = {};
export let ALL_TOPICS = [];

const rowsOf = (db, sql) => {
  const res = db.exec(sql);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
};

export async function loadBank() {
  const base = import.meta.env.BASE_URL;
  const SQL = await initSqlJs({ locateFile: f => `${base}vendor/${f}` });
  const buf = await fetch(`${base}data/bank.sqlite`).then(r => {
    if (!r.ok) throw new Error(`gagal memuat bank.sqlite (${r.status})`);
    return r.arrayBuffer();
  });
  const db = new SQL.Database(new Uint8Array(buf));

  LEVELS = rowsOf(db, "SELECT id, name, blurb FROM levels ORDER BY sort");
  LEVEL_IDS = LEVELS.map(l => l.id);
  LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));

  TOPICS = Object.fromEntries(rowsOf(db, "SELECT code, name FROM topics").map(t => [t.code, t.name]));

  const subjectRows = rowsOf(db, "SELECT id, name, blurb FROM subjects ORDER BY sort");
  const questionRows = rowsOf(db, "SELECT * FROM questions");

  SUBJECTS = subjectRows.map(sj => {
    const questions = questionRows
      .filter(r => r.subject_id === sj.id)
      .sort((a, b) => (LEVEL_IDS.indexOf(a.level_id) - LEVEL_IDS.indexOf(b.level_id)) || (a.id - b.id))
      .map(r => ({
        id: r.id,
        subject: r.subject_id,
        level: r.level_id,
        topic: r.topic,
        vignette: r.vignette,
        image: r.image || undefined,
        options: JSON.parse(r.options),
        answer: r.answer,
        key: r.key,
        why: JSON.parse(r.why),
        uid: `${sj.id}:${r.level_id}:${r.id}`
      }));
    return { ...sj, questions };
  });

  SUBJECT_IDS = SUBJECTS.map(s => s.id);
  SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));
  BANK = SUBJECTS.flatMap(s => s.questions);
  ALL_TOPICS = topicsForSubjects(SUBJECT_IDS);

  db.close();
}

export const subjectName = id => SUBJECT_BY_ID[id]?.name || id;
export const levelName = id => LEVEL_BY_ID[id]?.name || id;
export const topicName = id => TOPICS[id] || id;

/* topik yang benar-benar dipakai oleh soal pada mata uji tertentu, urut
   mengikuti urutan di tabel topics */
export function topicsForSubjects(ids) {
  const ada = new Set(BANK.filter(q => ids.includes(q.subject)).map(q => q.topic));
  return Object.keys(TOPICS).filter(t => ada.has(t));
}
