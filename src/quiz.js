/* Layar latihan: render soal, jawab, tandai, timer, sampai sesi selesai. */
import { levelName, topicName } from "./bank.js";
import { $, LET, app, store, shuffle, showScreen } from "./state.js";
import { renderResult } from "./result.js";

export function startSession(qPool, label) {
  const n = Math.min(app.cfg.count, qPool.length);
  const qs = shuffle(qPool).slice(0, n);
  app.S = {
    qs, label, i: 0,
    ans: new Array(n).fill(null),
    flags: new Array(n).fill(false),
    graded: app.cfg.fb,
    startedAt: Date.now(),
    left: app.cfg.timer ? n * app.cfg.secPerQ : null,
    tick: null, done: false
  };
  showScreen("quiz");
  if (app.cfg.timer) {
    app.S.tick = setInterval(() => {
      app.S.left--;
      renderClock();
      if (app.S.left <= 0) { clearInterval(app.S.tick); finishSession(true); }
    }, 1000);
  }
  renderQ();
  window.scrollTo(0, 0);
}

function renderClock() {
  const el = $("clock");
  if (!app.cfg.timer) { el.textContent = ""; return; }
  const left = Math.max(0, app.S.left);
  el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  el.classList.toggle("low", app.S.left <= 60);
}

/* jejak jawaban berbentuk gelombang, mirip rekaman EEG */
function renderTrace() {
  const S = app.S, n = S.qs.length, W = 1000, base = 19, seg = W / n;
  let out = `<line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="#B4B8AE" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  for (let i = 0; i < n; i++) {
    const a = S.ans[i];
    if (a === null) {
      if (S.flags[i]) out += `<circle cx="${i * seg + seg / 2}" cy="${base}" r="2.4" fill="var(--nissl)"/>`;
      continue;
    }
    const xc = i * seg + seg / 2, w = seg;
    let col, pts;
    if (S.graded || S.done) {
      const right = a === S.qs[i].answer;
      col = right ? "var(--ok)" : "var(--no)";
      const peak = right ? base - 14 : base + 14;
      const dip = right ? base + 4 : base - 4;
      pts = `${i * seg},${base} ${xc - w * .3},${base} ${xc - w * .16},${dip} ${xc},${peak} ${xc + w * .16},${dip} ${xc + w * .3},${base} ${(i + 1) * seg},${base}`;
    } else {
      col = "var(--nissl)";
      pts = `${i * seg},${base} ${xc - w * .22},${base} ${xc},${base - 9} ${xc + w * .22},${base} ${(i + 1) * seg},${base}`;
    }
    out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`;
  }
  const cx = S.i * seg + seg / 2;
  out += `<line x1="${cx}" y1="2" x2="${cx}" y2="36" stroke="var(--myelin)" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity=".55"/>`;
  $("trace").innerHTML = out;
}

export function renderQ() {
  const S = app.S;
  const q = S.qs[S.i], picked = S.ans[S.i], show = S.graded && picked !== null;
  $("qnum").textContent = `Soal ${S.i + 1} / ${S.qs.length}`;
  $("qtopic").textContent = topicName(q.topic);
  $("qlevel").textContent = levelName(q.level);
  renderClock();
  renderTrace();
  $("vignette").textContent = q.vignette;
  $("opts").innerHTML = q.options.map((o, k) => {
    let cls = "opt";
    if (show) {
      if (k === q.answer) cls += " right";
      else if (k === picked) cls += " wrong";
    } else if (k === picked) cls += " picked";
    return `<button class="${cls}" data-k="${k}" ${show ? "disabled" : ""}>
      <span class="lt">${LET[k]}</span><span class="tx">${o}</span></button>`;
  }).join("");
  $("opts").querySelectorAll(".opt").forEach(b =>
    b.addEventListener("click", () => pick(+b.dataset.k)));

  if (show) {
    const right = picked === q.answer;
    $("fb").classList.remove("hidden");
    $("fbTop").className = "fb-top " + (right ? "ok" : "no");
    $("fbTop").textContent = right
      ? `Benar — jawaban ${LET[q.answer]}`
      : `Kurang tepat — jawaban yang benar ${LET[q.answer]}`;
    $("fbKey").textContent = q.key;
    $("fbWhy").innerHTML = q.why.map((w, k) =>
      `<div class="why-row${k === q.answer ? " k" : ""}"><span class="lt">${LET[k]}</span><span>${w}</span></div>`).join("");
  } else {
    $("fb").classList.add("hidden");
  }

  $("prev").disabled = S.i === 0;
  $("next").textContent = S.i === S.qs.length - 1 ? "Lihat hasil" : "Berikutnya";
  const f = $("flag");
  f.classList.toggle("flagged", S.flags[S.i]);
  f.textContent = S.flags[S.i] ? "Ditandai ragu" : "Tandai ragu";
}

export function pick(k) {
  const S = app.S;
  if (S.graded && S.ans[S.i] !== null) return;
  S.ans[S.i] = k;
  renderQ();
}

export function move(d) {
  const S = app.S;
  const ni = S.i + d;
  if (ni < 0) return;
  if (ni >= S.qs.length) { finishSession(false); return; }
  S.i = ni;
  renderQ();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function toggleFlag() {
  app.S.flags[app.S.i] = !app.S.flags[app.S.i];
  renderQ();
}

export function finishSession(byTimer) {
  const S = app.S;
  if (S.tick) clearInterval(S.tick);
  S.done = true;
  S.elapsed = Math.round((Date.now() - S.startedAt) / 1000);
  S.byTimer = !!byTimer;

  const byTopic = {}, byLevel = {};
  let correct = 0, answered = 0;
  S.qs.forEach((q, i) => {
    const a = S.ans[i];
    byTopic[q.topic] = byTopic[q.topic] || { c: 0, t: 0 };
    byLevel[q.level] = byLevel[q.level] || { c: 0, t: 0 };
    byTopic[q.topic].t++;
    byLevel[q.level].t++;
    if (a !== null) {
      answered++;
      if (a === q.answer) { correct++; byTopic[q.topic].c++; byLevel[q.level].c++; }
    }
  });
  S.correct = correct; S.answered = answered; S.byTopic = byTopic; S.byLevel = byLevel;

  if (app.cfg.review) {
    S.qs.forEach((q, i) => {
      if (S.ans[i] !== null && S.ans[i] !== q.answer) app.wrongSet[q.uid] = true;
      else if (S.ans[i] === q.answer) delete app.wrongSet[q.uid];
    });
    store.set("neuro:wrong", app.wrongSet);
  }
  if (app.cfg.track) {
    const d = new Date();
    app.hist.unshift({
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      total: S.qs.length, correct, byTopic, byLevel,
      levels: Object.keys(byLevel), sec: S.elapsed
    });
    app.hist = app.hist.slice(0, 50);
    store.set("neuro:hist", app.hist);
  }
  renderResult();
}
