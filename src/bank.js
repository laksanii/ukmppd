/* Pemuat bank soal.
   Menambah level baru cukup dengan: taruh file JSON di data/, lalu daftarkan
   di data/levels.json. Tidak ada kode yang perlu diubah di sini. */
import TOPICS from "../data/topics.json";
import manifest from "../data/levels.json";

const files = import.meta.glob("../data/*.json", { eager: true, import: "default" });

export const LEVELS = manifest.map(lv => {
  const raw = files[`../data/${lv.file}`];
  if (!raw) throw new Error(`Level "${lv.id}": data/${lv.file} tidak ditemukan`);
  return {
    ...lv,
    // uid dipakai untuk menandai soal salah lintas level, karena id soal
    // hanya unik di dalam satu file.
    questions: raw.map(q => ({ ...q, level: lv.id, uid: `${lv.id}:${q.id}` }))
  };
});

export const LEVEL_IDS = LEVELS.map(l => l.id);
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));
export const BANK = LEVELS.flatMap(l => l.questions);
export const levelName = id => LEVEL_BY_ID[id]?.name || id;
export const topicName = id => TOPICS[id] || id;
export { TOPICS };
