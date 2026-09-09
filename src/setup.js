/* Layar persiapan: pilih level, materi, jumlah soal, dan fitur sesi. */
import { LEVELS, TOPICS, BANK, levelName, topicName } from "./bank.js";
import { $, app, saveCfg, pool, wrongPool, TOGGLE_DEFS } from "./state.js";

/* jumlah soal per level & per topik, mengikuti level yang sedang dipilih */
function counts() {
  const byLevel = {}, byTopic = {};
  BANK.forEach(q => {
    byLevel[q.level] = (byLevel[q.level] || 0) + 1;
    if (app.cfg.levels.includes(q.level)) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
  });
  return { byLevel, byTopic };
}

export function renderLevels() {
  const { byLevel } = counts();
  $("levels").innerHTML = LEVELS.map(lv => {
    const on = app.cfg.levels.includes(lv.id);
    return `<label class="level${on ? " on" : ""}">
      <input type="checkbox" ${on ? "checked" : ""} data-lv="${lv.id}">
      <span class="lv-txt">
        <span class="nm">${lv.name}</span>
        <span class="ds">${lv.blurb}</span>
      </span>
      <span class="ct">${byLevel[lv.id] || 0} soal</span>
    </label>`;
  }).join("");
  $("levels").querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", () => {
      const id = inp.dataset.lv;
      app.cfg.levels = inp.checked
        ? [...new Set([...app.cfg.levels, id])]
        : app.cfg.levels.filter(x => x !== id);
      inp.closest(".level").classList.toggle("on", inp.checked);
      saveCfg(); renderTopics(); renderPool();
    });
  });
}

export function renderTopics() {
  const { byTopic } = counts();
  $("topics").innerHTML = Object.keys(TOPICS).map(k => {
    const n = byTopic[k] || 0;
    const on = app.cfg.topics.includes(k);
    return `<label class="topic${on ? " on" : ""}${n === 0 ? " off" : ""}" data-t="${k}">
      <input type="checkbox" ${on ? "checked" : ""} data-t="${k}">
      <span class="nm">${TOPICS[k]}</span>
      <span class="ct">${n}</span>
    </label>`;
  }).join("");
  $("topics").querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", () => {
      const t = inp.dataset.t;
      app.cfg.topics = inp.checked
        ? [...new Set([...app.cfg.topics, t])]
        : app.cfg.topics.filter(x => x !== t);
      inp.closest(".topic").classList.toggle("on", inp.checked);
      saveCfg(); renderPool();
    });
  });
}

export function renderPool() {
  const n = pool().length;
  const el = $("pool");
  $("count").max = Math.max(1, n);
  if (!app.cfg.levels.length) {
    el.className = "pool warn";
    el.innerHTML = "Belum ada level yang dipilih. Pilih minimal satu level kesulitan.";
  } else if (n === 0) {
    el.className = "pool warn";
    el.innerHTML = "Tidak ada soal pada kombinasi level dan materi ini. Tambahkan materi atau level lain.";
  } else {
    el.className = "pool";
    const lv = app.cfg.levels.map(levelName).join(" + ");
    el.innerHTML = `Tersedia <b>${n}</b> soal dari level ${lv}. Sesi ini akan memakai <b>${Math.min(app.cfg.count, n)}</b> soal, diacak.`;
  }
  $("presets").querySelectorAll(".chip").forEach(c => {
    const v = c.dataset.v === "all" ? n : +c.dataset.v;
    c.classList.toggle("on", v === app.cfg.count || (c.dataset.v === "all" && app.cfg.count >= n && n > 0));
  });
  $("start").disabled = n === 0;
  $("start").textContent = n === 0
    ? "Pilih level & materi dulu"
    : `Mulai latihan · ${Math.min(app.cfg.count, n)} soal`;
}

export function renderPresets() {
  $("presets").innerHTML = [10, 20, 30, 50, "all"]
    .map(v => `<button class="chip" data-v="${v}">${v === "all" ? "Semua" : v}</button>`).join("");
  $("presets").querySelectorAll(".chip").forEach(c => {
    c.addEventListener("click", () => {
      app.cfg.count = c.dataset.v === "all" ? pool().length : +c.dataset.v;
      $("count").value = app.cfg.count;
      saveCfg(); renderPool();
    });
  });
}

export function renderToggles() {
  $("toggles").innerHTML = TOGGLE_DEFS.map(t => `
    <div class="tg">
      <div class="tg-txt">
        <p class="nm">${t.nm}</p>
        <p class="ds">${t.ds}</p>
        ${t.k === "timer" ? `<div class="tg-sub" id="secWrap">
            <label for="secPerQ">Waktu per soal</label>
            <input type="number" id="secPerQ" min="10" max="600" value="${app.cfg.secPerQ}">
            <span>detik</span></div>` : ""}
      </div>
      <button class="sw${app.cfg[t.k] ? " on" : ""}" data-k="${t.k}" role="switch"
        aria-checked="${app.cfg[t.k]}" aria-label="${t.nm}"></button>
    </div>`).join("");
  $("toggles").querySelectorAll(".sw").forEach(b => {
    b.addEventListener("click", () => {
      const k = b.dataset.k;
      app.cfg[k] = !app.cfg[k];
      b.classList.toggle("on", app.cfg[k]);
      b.setAttribute("aria-checked", app.cfg[k]);
      if (k === "timer") $("secWrap").style.display = app.cfg.timer ? "" : "none";
      if (k === "track" || k === "review") renderHistory();
      saveCfg();
    });
  });
  $("secWrap").style.display = app.cfg.timer ? "" : "none";
  $("secPerQ").addEventListener("change", e => {
    app.cfg.secPerQ = Math.max(10, Math.min(600, +e.target.value || 80));
    e.target.value = app.cfg.secPerQ;
    saveCfg();
  });
}

export function renderHistory() {
  const body = $("histBody");
  const nWrong = wrongPool().length;
  $("startWrong").classList.toggle("hidden", !(app.cfg.review && nWrong > 0));
  if (app.cfg.review && nWrong > 0) $("startWrong").textContent = `Ulangi ${nWrong} soal yang pernah salah`;

  if (!app.cfg.track) {
    $("clearHist").classList.add("hidden");
    body.innerHTML = `<p class="empty">Penyimpanan progres sedang dimatikan, jadi sesi ini tidak akan dicatat.</p>`;
    return;
  }
  if (!app.hist.length) {
    $("clearHist").classList.add("hidden");
    body.innerHTML = `<p class="empty">Belum ada sesi tercatat. Skor dan capaian per materi akan muncul di sini setelah sesi pertama.</p>`;
    return;
  }
  $("clearHist").classList.remove("hidden");
  const rows = app.hist.slice(0, 6).map(h => {
    const pc = Math.round(h.correct / h.total * 100);
    const lv = (h.levels || []).map(levelName).join(" + ");
    return `<div class="hrow">
      <span class="dt">${h.date} · ${h.total} soal${lv ? ` · ${lv}` : ""}</span>
      <span class="sc">${h.correct}/${h.total} · ${pc}%</span></div>`;
  }).join("");

  const agg = {};
  app.hist.forEach(h => Object.entries(h.byTopic || {}).forEach(([k, v]) => {
    agg[k] = agg[k] || { c: 0, t: 0 };
    agg[k].c += v.c; agg[k].t += v.t;
  }));
  const weak = Object.entries(agg).filter(([, v]) => v.t >= 3)
    .map(([k, v]) => ({ k, pc: v.c / v.t })).sort((a, b) => a.pc - b.pc).slice(0, 3);
  const weakHtml = weak.length
    ? `<p class="note">Materi dengan capaian terendah sejauh ini: ${weak.map(w =>
        `${topicName(w.k)} (${Math.round(w.pc * 100)}%)`).join(", ")}.</p>` : "";

  const aggLv = {};
  app.hist.forEach(h => Object.entries(h.byLevel || {}).forEach(([k, v]) => {
    aggLv[k] = aggLv[k] || { c: 0, t: 0 };
    aggLv[k].c += v.c; aggLv[k].t += v.t;
  }));
  const lvHtml = Object.keys(aggLv).length > 1
    ? `<p class="note">Capaian per level: ${Object.entries(aggLv).map(([k, v]) =>
        `${levelName(k)} ${Math.round(v.c / v.t * 100)}% (${v.c}/${v.t})`).join(", ")}.</p>` : "";

  body.innerHTML = `<div class="hist">${rows}</div>${lvHtml}${weakHtml}`;
}

export function renderSetup() {
  renderLevels(); renderTopics(); renderPool(); renderHistory();
}
