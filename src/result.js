/* Layar hasil: skor, capaian per level & per materi, dan pembahasan. */
import { levelName, topicName } from "./bank.js";
import { $, LET, app, fmtDur, showScreen } from "./state.js";

function bars(entries, label) {
  return entries.map(([k, v]) => {
    const p = Math.round(v.c / v.t * 100);
    const cls = p >= 70 ? "" : p >= 50 ? " mid" : " low";
    return `<div class="bar">
      <div><span class="lbl">${label(k)}</span>
        <div class="track"><div class="fill${cls}" style="width:${p}%"></div></div></div>
      <span class="pc">${v.c}/${v.t}</span></div>`;
  }).join("");
}

export function renderResult() {
  const S = app.S;
  const n = S.qs.length, pc = Math.round(S.correct / n * 100);
  showScreen("result");
  $("scBig").textContent = `${pc}%`;
  $("scOf").textContent = `${S.correct} benar dari ${n} soal`;

  let v = S.byTimer ? "Waktu habis sebelum semua soal terjawab. " : "";
  if (pc >= 85) v += "Penguasaan materinya sudah kuat. Pertahankan dengan pengulangan berkala, dan naikkan porsi soal level lanjut supaya terbiasa dengan vignette panjang.";
  else if (pc >= 66) v += "Sudah di atas ambang kelulusan, tapi belum ada jarak aman. Kejar materi yang capaiannya paling rendah di bawah ini.";
  else if (pc >= 50) v += "Separuh materi sudah masuk, separuh lagi belum. Baca ulang bab yang capaiannya di bawah 60 persen sebelum menambah soal baru.";
  else v += "Fondasinya masih perlu dibangun. Kembali ke materi dulu per bab, lalu latihan level dasar pada bab yang sama sebelum naik ke level lanjut.";
  $("verdict").textContent = v;

  const meta = [
    `Terjawab <b>${S.answered}</b> dari ${n}`,
    `Waktu <b>${fmtDur(S.elapsed)}</b>`,
    `Rata-rata <b>${Math.round(S.elapsed / n)} detik</b> per soal`
  ];
  const nf = S.flags.filter(Boolean).length;
  if (nf) meta.push(`Ditandai ragu <b>${nf}</b>`);
  $("scMeta").innerHTML = meta.map(m => `<span>${m}</span>`).join("");

  const lvEntries = Object.entries(S.byLevel);
  $("levelPanel").classList.toggle("hidden", lvEntries.length < 2);
  if (lvEntries.length >= 2) $("levelBars").innerHTML = bars(lvEntries, levelName);

  const entries = Object.entries(S.byTopic).sort((a, b) => (a[1].c / a[1].t) - (b[1].c / b[1].t));
  $("bars").innerHTML = bars(entries, topicName);

  S.revWrongOnly = app.cfg.review;
  renderReview();

  const nWrong = S.qs.filter((q, i) => S.ans[i] !== null && S.ans[i] !== q.answer).length;
  const rw = $("retryWrong");
  rw.classList.toggle("hidden", !(app.cfg.review && nWrong > 0));
  rw.textContent = `Ulangi ${nWrong} soal yang salah tadi`;
  window.scrollTo(0, 0);
}

export function renderReview() {
  const S = app.S;
  const only = S.revWrongOnly;
  const rows = S.qs.map((q, i) => ({ q, i })).filter(({ q, i }) =>
    !only || S.ans[i] === null || S.ans[i] !== q.answer);
  $("revTitle").textContent = only ? "Soal yang belum tepat" : "Pembahasan semua soal";
  $("revToggle").textContent = only ? "Tampilkan semua soal" : "Tampilkan yang salah saja";
  $("revToggle").classList.toggle("hidden", !app.cfg.review);
  if (!rows.length) {
    $("revBody").innerHTML = `<p class="empty">Tidak ada soal yang salah di sesi ini. Semua terjawab tepat.</p>`;
    return;
  }
  $("revBody").innerHTML = rows.map(({ q, i }) => {
    const a = S.ans[i];
    const state = a === null ? "sk" : (a === q.answer ? "ok" : "no");
    const label = a === null ? "Tidak dijawab" : (a === q.answer ? "Benar" : "Salah");
    const yours = a === null ? "" : `<p class="rev-a">Jawabanmu <b>${LET[a]}. ${q.options[a]}</b></p>`;
    return `<div class="rev">
      <div class="rev-h">
        <span class="tag ${state}">${label}</span>
        <span class="n">Soal ${i + 1} · ${topicName(q.topic)}${S.flags[i] ? " · ditandai ragu" : ""}</span>
        <span class="lvtag">${levelName(q.level)}</span>
      </div>
      <p class="rev-q">${q.vignette}</p>
      ${yours}
      <p class="rev-a">Kunci <b>${LET[q.answer]}. ${q.options[q.answer]}</b></p>
      <p class="rev-e">${q.key}</p>
    </div>`;
  }).join("");
}

export function toggleReview() {
  app.S.revWrongOnly = !app.S.revWrongOnly;
  renderReview();
}
