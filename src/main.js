/* Titik masuk: memuat state tersimpan lalu memasang seluruh kontrol. */
import "./style.css";
import { BANK, LEVEL_IDS, SUBJECT_IDS, ALL_TOPICS, topicsForSubjects } from "./bank.js";
import { $, LET, app, store, saveCfg, pool, wrongPool, DEFAULT_CFG, showScreen } from "./state.js";
import { renderSetup, renderTopics, renderPool, renderPresets, renderToggles, renderHistory } from "./setup.js";
import { startSession, move, pick, toggleFlag, finishSession } from "./quiz.js";
import { toggleReview } from "./result.js";

/* --- kontrol layar persiapan --- */
$("selAll").addEventListener("click", () => {
  app.cfg.topics = topicsForSubjects(app.cfg.subjects);
  saveCfg(); renderTopics(); renderPool();
});
$("selNone").addEventListener("click", () => {
  app.cfg.topics = [];
  saveCfg(); renderTopics(); renderPool();
});
$("count").addEventListener("input", e => {
  const n = pool().length;
  app.cfg.count = Math.max(1, Math.min(n || BANK.length, +e.target.value || 1));
  saveCfg(); renderPool();
});
$("count").addEventListener("blur", e => { e.target.value = app.cfg.count; });

$("start").addEventListener("click", () => {
  const qs = pool();
  if (qs.length) startSession(qs, "campuran");
});

/* sesi ulangan memakai seluruh soal salah, tanpa mengubah setelan jumlah soal */
function startRetry(qs) {
  if (!qs.length) return;
  const keep = app.cfg.count;
  app.cfg.count = qs.length;
  startSession(qs, "ulang");
  app.cfg.count = keep;
}
$("startWrong").addEventListener("click", () => startRetry(wrongPool()));
$("retryWrong").addEventListener("click", () => startRetry(
  app.S.qs.filter((q, i) => app.S.ans[i] !== null && app.S.ans[i] !== q.answer)
));

$("clearHist").addEventListener("click", () => {
  app.hist = []; app.wrongSet = {};
  store.set("neuro:hist", app.hist);
  store.set("neuro:wrong", app.wrongSet);
  renderHistory();
});

/* --- kontrol layar latihan --- */
$("prev").addEventListener("click", () => move(-1));
$("next").addEventListener("click", () => move(1));
$("flag").addEventListener("click", toggleFlag);

let finishArmed = false;
$("finish").addEventListener("click", () => {
  const un = app.S.ans.filter(a => a === null).length;
  if (un && !finishArmed) {
    finishArmed = true;
    $("finish").textContent = `Masih ada ${un} soal kosong — klik lagi untuk menyelesaikan`;
    setTimeout(() => {
      finishArmed = false;
      $("finish").textContent = "Selesaikan sesi sekarang";
    }, 5000);
    return;
  }
  finishArmed = false;
  $("finish").textContent = "Selesaikan sesi sekarang";
  finishSession(false);
});

/* --- kontrol layar hasil --- */
$("revToggle").addEventListener("click", toggleReview);
$("again").addEventListener("click", () => {
  showScreen("setup");
  renderSetup();
  window.scrollTo(0, 0);
});

/* --- pintasan papan ketik saat menjawab --- */
document.addEventListener("keydown", e => {
  if ($("quiz").classList.contains("hidden")) return;
  if (e.target.tagName === "INPUT") return;
  const k = e.key.toUpperCase();
  const li = LET.indexOf(k);
  const ni = "12345".indexOf(k);
  if (li > -1) { e.preventDefault(); pick(li); }
  else if (ni > -1) { e.preventDefault(); pick(ni); }
  else if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); move(1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
});

/* --- init --- */
(async function init() {
  const saved = await store.get("neuro:cfg", null);
  if (saved) app.cfg = { ...DEFAULT_CFG, ...saved };

  /* Sinkronkan setelan tersimpan dengan isi data saat ini:
     - yang sudah tidak ada di data dibuang diam-diam;
     - mata uji, level, atau materi yang BARU (belum pernah dilihat pemakai) ikut
       terpilih, supaya penambahan bank soal tidak diam-diam terlewat. */
  const sync = (dipilih, pernahDilihat, semua) => {
    const ada = new Set(semua);
    const lama = new Set(pernahDilihat && pernahDilihat.length ? pernahDilihat : dipilih || []);
    const hasil = (dipilih || []).filter(x => ada.has(x));
    semua.forEach(x => { if (!lama.has(x) && !hasil.includes(x)) hasil.push(x); });
    return hasil.length ? hasil : [...semua];
  };
  // dibaca dari `saved`, bukan dari app.cfg, karena DEFAULT_CFG sudah berisi
  // daftar lengkap sehingga akan menutupi config lama yang belum punya field ini
  app.cfg.subjects = sync(app.cfg.subjects, saved && saved.seenSubjects, SUBJECT_IDS);
  app.cfg.levels = sync(app.cfg.levels, saved && saved.seenLevels, LEVEL_IDS);
  app.cfg.topics = sync(app.cfg.topics, saved && saved.seenTopics, ALL_TOPICS)
    .filter(t => topicsForSubjects(app.cfg.subjects).includes(t));
  app.cfg.seenSubjects = [...SUBJECT_IDS];
  app.cfg.seenLevels = [...LEVEL_IDS];
  app.cfg.seenTopics = [...ALL_TOPICS];
  saveCfg();

  /* uid soal dulunya "<level>:<id>" saat bank soal hanya berisi neurologi;
     sekarang "<mata uji>:<level>:<id>". Tanpa pemetaan ini, kumpulan soal salah
     yang sudah tersimpan di browser tidak dikenali lagi. */
  const migrasiUid = simpanan => Object.fromEntries(
    Object.keys(simpanan).map(k => [k.split(":").length === 2 ? `neurologi:${k}` : k, true]));

  app.hist = await store.get("neuro:hist", []) || [];
  app.wrongSet = migrasiUid(await store.get("neuro:wrong", {}) || {});
  $("count").value = app.cfg.count;
  $("bankNote").textContent =
    `${BANK.length} soal vignette · ${SUBJECT_IDS.length} mata uji · ${LEVEL_IDS.length} level kesulitan`;
  renderPresets(); renderToggles(); renderSetup();
})();
