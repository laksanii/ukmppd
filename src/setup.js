/* Layar persiapan: pilih mata uji, level, materi, jumlah soal, dan fitur sesi. */
import { SUBJECTS, LEVELS, TOPICS, BANK, subjectName, levelName, topicName, topicsForSubjects } from "./bank.js";
import { $, app, saveCfg, pool, wrongPool, TOGGLE_DEFS } from "./state.js";

/* Jumlah soal per mata uji, per level, dan per topik. Tiap hitungan mengikuti
   pilihan pada sumbu di atasnya: level dihitung dalam mata uji yang dipilih,
   topik dihitung dalam mata uji dan level yang dipilih. */
function counts() {
  const bySubject = {}, byLevel = {}, byTopic = {};
  BANK.forEach(q => {
    const sjOn = app.cfg.subjects.includes(q.subject);
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
    if (sjOn) byLevel[q.level] = (byLevel[q.level] || 0) + 1;
    if (sjOn && app.cfg.levels.includes(q.level)) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
  });
  return { bySubject, byLevel, byTopic };
}

export function renderSubjects() {
  const { bySubject } = counts();
  $("subjects").innerHTML = SUBJECTS.map(sj => {
    const on = app.cfg.subjects.includes(sj.id);
    return `<label class="level${on ? " on" : ""}">
      <input type="checkbox" ${on ? "checked" : ""} data-sj="${sj.id}">
      <span class="lv-txt">
        <span class="nm">${sj.name}</span>
        <span class="ds">${sj.blurb}</span>
      </span>
      <span class="ct">${bySubject[sj.id] || 0} soal</span>
    </label>`;
  }).join("");
  $("subjects").querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", () => {
      const id = inp.dataset.sj;
      app.cfg.subjects = inp.checked
        ? [...new Set([...app.cfg.subjects, id])]
        : app.cfg.subjects.filter(x => x !== id);
      inp.closest(".level").classList.toggle("on", inp.checked);
      /* Materi mengikuti mata uji: yang dimatikan materinya ikut dilepas supaya
         hitungan di layar sejalan dengan isi pool, yang dinyalakan materinya
         ikut terpilih supaya mata uji itu benar-benar menyumbang soal. */
      const tersedia = topicsForSubjects(app.cfg.subjects);
      app.cfg.topics = inp.checked
        ? [...new Set([...app.cfg.topics, ...topicsForSubjects([id])])]
        : app.cfg.topics.filter(t => tersedia.includes(t));
      saveCfg(); renderLevels(); renderTopics(); renderPool();
    });
  });
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
  const daftar = topicsForSubjects(app.cfg.subjects);
  if (!daftar.length) {
    $("topics").innerHTML = `<p class="empty">Pilih mata uji dulu untuk melihat daftar materinya.</p>`;
    return;
  }
  $("topics").innerHTML = daftar.map(k => {
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
  const qs = pool();
  const n = qs.length;
  const el = $("pool");
  $("count").max = Math.max(1, n);
  if (!app.cfg.subjects.length) {
    el.className = "pool warn";
    el.innerHTML = "Belum ada mata uji yang dipilih. Pilih minimal satu mata uji.";
  } else if (!app.cfg.levels.length) {
    el.className = "pool warn";
    el.innerHTML = "Belum ada level yang dipilih. Pilih minimal satu level kesulitan.";
  } else if (n === 0) {
    el.className = "pool warn";
    el.innerHTML = "Tidak ada soal pada kombinasi level dan materi ini. Tambahkan materi atau level lain.";
  } else {
    el.className = "pool";
    // sebut hanya yang benar-benar menyumbang soal, supaya keterangannya tidak
    // menyebut level atau mata uji yang isinya nol
    const isi = (dipilih, ambil, nama) =>
      dipilih.filter(id => qs.some(q => ambil(q) === id)).map(nama).join(" + ");
    const sj = isi(app.cfg.subjects, q => q.subject, subjectName);
    const lv = isi(app.cfg.levels, q => q.level, levelName);
    el.innerHTML = `Tersedia <b>${n}</b> soal ${sj} level ${lv}. Sesi ini akan memakai <b>${Math.min(app.cfg.count, n)}</b> soal, diacak.`;
  }
  $("presets").querySelectorAll(".chip").forEach(c => {
    const v = c.dataset.v === "all" ? n : +c.dataset.v;
    c.classList.toggle("on", v === app.cfg.count || (c.dataset.v === "all" && app.cfg.count >= n && n > 0));
  });
  $("start").disabled = n === 0;
  $("start").textContent = n === 0
    ? "Pilih mata uji & materi dulu"
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
    const sj = (h.subjects || []).map(subjectName).join(" + ");
    const lv = (h.levels || []).map(levelName).join(" + ");
    return `<div class="hrow">
      <span class="dt">${h.date} · ${h.total} soal${sj ? ` · ${sj}` : ""}${lv ? ` · ${lv}` : ""}</span>
      <span class="sc">${h.correct}/${h.total} · ${pc}%</span></div>`;
  }).join("");

  /* jumlahkan capaian seluruh riwayat pada satu sumbu (materi/mata uji/level) */
  const rekap = ambil => {
    const agg = {};
    app.hist.forEach(h => Object.entries(ambil(h) || {}).forEach(([k, v]) => {
      agg[k] = agg[k] || { c: 0, t: 0 };
      agg[k].c += v.c; agg[k].t += v.t;
    }));
    return agg;
  };
  const ringkas = (agg, judul, label) => Object.keys(agg).length > 1
    ? `<p class="note">${judul}: ${Object.entries(agg).map(([k, v]) =>
        `${label(k)} ${Math.round(v.c / v.t * 100)}% (${v.c}/${v.t})`).join(", ")}.</p>` : "";

  const sjHtml = ringkas(rekap(h => h.bySubject), "Capaian per mata uji", subjectName);
  const lvHtml = ringkas(rekap(h => h.byLevel), "Capaian per level", levelName);

  const weak = Object.entries(rekap(h => h.byTopic)).filter(([, v]) => v.t >= 3)
    .map(([k, v]) => ({ k, pc: v.c / v.t })).sort((a, b) => a.pc - b.pc).slice(0, 3);
  const weakHtml = weak.length
    ? `<p class="note">Materi dengan capaian terendah sejauh ini: ${weak.map(w =>
        `${topicName(w.k)} (${Math.round(w.pc * 100)}%)`).join(", ")}.</p>` : "";

  body.innerHTML = `<div class="hist">${rows}</div>${sjHtml}${lvHtml}${weakHtml}`;
}

export function renderSetup() {
  renderSubjects(); renderLevels(); renderTopics(); renderPool(); renderHistory();
}
