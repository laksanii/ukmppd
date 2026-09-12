/* Pemuat bank soal.
   Bank soal dipilah dua sumbu: mata uji (data/subjects.json) dan level
   kesulitan (data/levels.json). Satu file JSON di data/ berisi soal untuk
   satu pasangan mata uji x level.

   Menambah bank soal cukup dengan: taruh file JSON di data/, lalu daftarkan
   pada "banks" mata uji yang sesuai. Tidak ada kode yang perlu diubah. */
import TOPICS from "../data/topics.json";
import levelManifest from "../data/levels.json";
import subjectManifest from "../data/subjects.json";

const files = import.meta.glob("../data/*.json", { eager: true, import: "default" });

export const LEVELS = levelManifest;
export const LEVEL_IDS = LEVELS.map(l => l.id);
const LEVEL_ORDER = Object.fromEntries(LEVEL_IDS.map((id, i) => [id, i]));

export const SUBJECTS = subjectManifest.map(sj => {
  const questions = Object.entries(sj.banks)
    .sort((a, b) => (LEVEL_ORDER[a[0]] ?? 99) - (LEVEL_ORDER[b[0]] ?? 99))
    .flatMap(([level, file]) => {
      const raw = files[`../data/${file}`];
      if (!raw) throw new Error(`Mata uji "${sj.id}" level "${level}": data/${file} tidak ditemukan`);
      // uid dipakai untuk menandai soal salah lintas bank, karena id soal
      // hanya unik di dalam satu file.
      return raw.map(q => ({ ...q, subject: sj.id, level, uid: `${sj.id}:${level}:${q.id}` }));
    });
  return { ...sj, questions };
});

export const SUBJECT_IDS = SUBJECTS.map(s => s.id);
export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));
export const BANK = SUBJECTS.flatMap(s => s.questions);

export const subjectName = id => SUBJECT_BY_ID[id]?.name || id;
export const levelName = id => LEVEL_BY_ID[id]?.name || id;
export const topicName = id => TOPICS[id] || id;

/* topik yang benar-benar dipakai oleh soal pada mata uji tertentu, urut
   mengikuti urutan di topics.json */
const topicsOf = ids => {
  const ada = new Set(BANK.filter(q => ids.includes(q.subject)).map(q => q.topic));
  return Object.keys(TOPICS).filter(t => ada.has(t));
};
export const topicsForSubjects = topicsOf;
export const ALL_TOPICS = topicsOf(SUBJECT_IDS);

export { TOPICS };
