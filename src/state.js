/* Penyimpanan, konfigurasi, riwayat, dan state sesi yang sedang berjalan. */
import { BANK, LEVEL_IDS, SUBJECT_IDS, ALL_TOPICS } from "./bank.js";

export const LET = ["A", "B", "C", "D", "E"];
export const $ = id => document.getElementById(id);

/* ---------------- penyimpanan ---------------- */
/* Tiga tingkat, dipilih otomatis sesuai tempat aplikasi ini dijalankan:
   1. window.storage  - saat berjalan sebagai artifact di dalam Claude
   2. localStorage    - saat file di-host sendiri atau dibuka dari disk
   3. memori          - kalau dua-duanya diblokir; progres hanya bertahan selama tab terbuka */
const mem = {};
function localOK() {
  try {
    const t = "neuro:__t";
    window.localStorage.setItem(t, "1");
    window.localStorage.removeItem(t);
    return true;
  } catch (e) { return false; }
}

export const store = {
  mode: (typeof window !== "undefined" && window.storage) ? "claude" : (localOK() ? "local" : "mem"),
  async get(k, dflt) {
    try {
      if (this.mode === "claude") {
        const r = await window.storage.get(k);
        return r ? JSON.parse(r.value) : dflt;
      }
      if (this.mode === "local") {
        const r = window.localStorage.getItem(k);
        return r === null ? dflt : JSON.parse(r);
      }
    } catch (e) { return k in mem ? mem[k] : dflt; }
    return k in mem ? mem[k] : dflt;
  },
  async set(k, v) {
    mem[k] = v;
    try {
      if (this.mode === "claude") await window.storage.set(k, JSON.stringify(v));
      else if (this.mode === "local") window.localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { /* penyimpanan penuh atau diblokir: cukup pakai memori */ }
  }
};

/* ---------------- konfigurasi ---------------- */
/* Fungsi, bukan const: bank soal dimuat async (lihat bank.js loadBank()),
   jadi SUBJECT_IDS dkk baru terisi setelah itu selesai. Dipanggil dari
   main.js setelah loadBank() resolve. */
export function defaultCfg() {
  return {
    subjects: [...SUBJECT_IDS],
    levels: [...LEVEL_IDS],
    topics: [...ALL_TOPICS],
    // mata uji, level & materi yang sudah pernah tampil di layar pemakai; dipakai
    // untuk mengenali tambahan bank soal baru saat aplikasi diperbarui
    seenSubjects: [...SUBJECT_IDS],
    seenLevels: [...LEVEL_IDS],
    seenTopics: [...ALL_TOPICS],
    count: 20,
    fb: true,        // pembahasan langsung
    timer: false,    // hitung mundur
    track: true,     // simpan skor & progres
    review: true,    // kumpulkan soal salah
    secPerQ: 80
  };
}

export const TOGGLE_DEFS = [
  { k: "fb", nm: "Pembahasan tiap soal", ds: "Jawaban benar dan alasan tiap pilihan langsung muncul setelah kamu menjawab." },
  { k: "timer", nm: "Timer", ds: "Hitung mundur seperti simulasi ujian. Sesi berakhir sendiri saat waktu habis." },
  { k: "track", nm: "Simpan skor & progres", ds: "Riwayat sesi dan capaian per materi tersimpan untuk sesi berikutnya." },
  { k: "review", nm: "Kumpulkan soal salah", ds: "Soal yang kamu jawab salah bisa ditinjau di akhir dan diulang jadi sesi tersendiri." }
];

/* state global yang dipakai lintas modul. cfg diisi main.js setelah bank
   soal selesai dimuat (lihat defaultCfg() di atas). */
export const app = {
  cfg: null,
  hist: [],
  wrongSet: {},
  S: null            // sesi yang sedang berjalan
};

export const saveCfg = () => store.set("neuro:cfg", app.cfg);

/* ---------------- kumpulan soal ---------------- */
export function pool() {
  const { subjects, levels, topics } = app.cfg;
  return BANK.filter(q =>
    subjects.includes(q.subject) && levels.includes(q.level) && topics.includes(q.topic));
}

/* soal yang pernah dijawab salah dan masih ada di bank */
export function wrongPool() {
  return BANK.filter(q => app.wrongSet[q.uid]);
}

export function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function fmtDur(s) {
  const m = Math.floor(s / 60);
  return m >= 1 ? `${m} menit ${s % 60} detik` : `${s} detik`;
}

export function showScreen(name) {
  ["setup", "quiz", "result"].forEach(id => $(id).classList.toggle("hidden", id !== name));
}
