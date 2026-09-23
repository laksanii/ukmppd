/* Admin bank soal: vanilla JS, tanpa build step (dilayani langsung oleh
   admin/server.mjs lewat express.static). */
const LET = ["A", "B", "C", "D", "E"];
const $ = id => document.getElementById(id);

let token = localStorage.getItem("ukmppd:adminToken") || "";
let meta = null;
let questions = [];
let editingId = null; // null = soal baru
let currentImage = null; // path relatif tersimpan (mis. "gambar/x/y.jpg")

async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), "x-admin-token": token }
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.errors?.join(", ") || body.error || `HTTP ${res.status}`);
  return body;
}

/* ---------------- gate token ---------------- */
function showGate(err) {
  $("gate").classList.remove("hidden");
  $("app").classList.add("hidden");
  $("tokenErr").classList.toggle("hidden", !err);
}

$("tokenSubmit").addEventListener("click", async () => {
  token = $("tokenInput").value.trim();
  try {
    meta = await api("/meta");
    localStorage.setItem("ukmppd:adminToken", token);
    boot();
  } catch (e) {
    showGate(true);
  }
});
$("tokenInput").addEventListener("keydown", e => { if (e.key === "Enter") $("tokenSubmit").click(); });

/* ---------------- boot ---------------- */
async function boot() {
  $("gate").classList.add("hidden");
  $("app").classList.remove("hidden");

  $("subjectSel").innerHTML = meta.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  $("levelSel").innerHTML = meta.levels.map(l => `<option value="${l.id}">${l.name}</option>`).join("");
  $("fTopic").innerHTML = meta.topics.map(t => `<option value="${t.code}">${t.name} (${t.code})</option>`).join("");

  buildOptRows();
  buildWhyRows();

  await loadList();
}

$("subjectSel").addEventListener("change", loadList);
$("levelSel").addEventListener("change", loadList);

async function loadList() {
  const subject = $("subjectSel").value, level = $("levelSel").value;
  questions = await api(`/bank?subject=${subject}&level=${level}`);
  $("countInfo").textContent = `${questions.length} soal`;
  $("list").innerHTML = questions.map(q => `
    <button type="button" class="list-item" data-id="${q.id}">
      <span class="lid">#${q.id}</span>
      <span class="ltxt">${q.vignette.slice(0, 70)}${q.vignette.length > 70 ? "…" : ""}</span>
    </button>`).join("") || `<p class="muted">Belum ada soal di kombinasi ini.</p>`;
  $("list").querySelectorAll(".list-item").forEach(b =>
    b.addEventListener("click", () => openQuestion(+b.dataset.id)));
}

/* ---------------- form ---------------- */
function buildOptRows() {
  $("optRows").innerHTML = LET.map((l, k) => `
    <div class="opt-row">
      <input type="radio" name="answer" value="${k}" id="ans${k}" ${k === 0 ? "checked" : ""}>
      <label for="ans${k}" class="opt-lt">${l}</label>
      <input type="text" class="opt-txt" id="opt${k}" required>
    </div>`).join("");
}

function buildWhyRows() {
  $("whyRows").innerHTML = LET.map((l, k) => `
    <div class="why-row">
      <span class="opt-lt">${l}</span>
      <textarea class="why-txt" id="why${k}" rows="2" required></textarea>
    </div>`).join("");
}

function resetForm() {
  editingId = null;
  currentImage = null;
  $("qform").reset();
  $("formTitle").textContent = "Soal baru";
  $("deleteBtn").classList.add("hidden");
  $("formMsg").textContent = "";
  $("imgPreviewWrap").classList.add("hidden");
  $("imgPreview").removeAttribute("src");
  $("fImageFile").value = "";
  $("qform").classList.remove("hidden");
  $("emptyHint").classList.add("hidden");
  $("list").querySelectorAll(".list-item").forEach(b => b.classList.remove("active"));
}

function openQuestion(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;
  editingId = id;
  currentImage = q.image || null;
  $("formTitle").textContent = `Soal #${id}`;
  $("fTopic").value = q.topic;
  $("fVignette").value = q.vignette;
  $("fKey").value = q.key;
  q.options.forEach((o, k) => { $(`opt${k}`).value = o; });
  q.why.forEach((w, k) => { $(`why${k}`).value = w; });
  $(`ans${q.answer}`).checked = true;
  if (q.image) {
    $("imgPreview").src = `/${q.image}`;
    $("imgPreviewWrap").classList.remove("hidden");
  } else {
    $("imgPreviewWrap").classList.add("hidden");
  }
  $("fImageFile").value = "";
  $("deleteBtn").classList.remove("hidden");
  $("formMsg").textContent = "";
  $("qform").classList.remove("hidden");
  $("emptyHint").classList.add("hidden");
  $("list").querySelectorAll(".list-item").forEach(b => b.classList.toggle("active", +b.dataset.id === id));
}

$("addBtn").addEventListener("click", resetForm);
$("cancelBtn").addEventListener("click", () => {
  $("qform").classList.add("hidden");
  $("emptyHint").classList.remove("hidden");
  $("list").querySelectorAll(".list-item").forEach(b => b.classList.remove("active"));
});

$("fImageFile").addEventListener("change", async () => {
  const file = $("fImageFile").files[0];
  if (!file) return;
  const subject = $("subjectSel").value, level = $("levelSel").value;
  const fd = new FormData();
  fd.append("image", file);
  $("formMsg").textContent = "Mengunggah gambar…";
  try {
    const { path } = await api(`/upload?subject=${subject}&level=${level}`, { method: "POST", body: fd });
    currentImage = path;
    $("imgPreview").src = `/${path}`;
    $("imgPreviewWrap").classList.remove("hidden");
    $("formMsg").textContent = "Gambar terunggah.";
  } catch (e) {
    $("formMsg").textContent = `Gagal unggah: ${e.message}`;
  }
});
$("imgRemove").addEventListener("click", () => {
  currentImage = null;
  $("imgPreviewWrap").classList.add("hidden");
  $("imgPreview").removeAttribute("src");
  $("fImageFile").value = "";
});

$("qform").addEventListener("submit", async e => {
  e.preventDefault();
  const body = {
    subject: $("subjectSel").value,
    level: $("levelSel").value,
    topic: $("fTopic").value,
    vignette: $("fVignette").value.trim(),
    image: currentImage,
    options: LET.map((_, k) => $(`opt${k}`).value.trim()),
    answer: +document.querySelector('input[name="answer"]:checked').value,
    key: $("fKey").value.trim(),
    why: LET.map((_, k) => $(`why${k}`).value.trim())
  };
  $("formMsg").textContent = "Menyimpan…";
  try {
    if (editingId) await api(`/bank/${editingId}`, { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    else await api("/bank", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    $("formMsg").textContent = "Tersimpan.";
    await loadList();
    if (editingId) openQuestion(editingId);
  } catch (e) {
    $("formMsg").textContent = `Gagal: ${e.message}`;
  }
});

$("deleteBtn").addEventListener("click", async () => {
  if (!editingId) return;
  if (!confirm(`Hapus soal #${editingId}? Tidak bisa dibatalkan.`)) return;
  try {
    await api(`/bank/${editingId}`, { method: "DELETE" });
    $("qform").classList.add("hidden");
    $("emptyHint").classList.remove("hidden");
    await loadList();
  } catch (e) {
    $("formMsg").textContent = `Gagal hapus: ${e.message}`;
  }
});

/* ---------------- publish ---------------- */
$("publishBtn").addEventListener("click", async () => {
  const out = $("publishOut");
  out.classList.remove("hidden");
  out.textContent = "Memvalidasi & publish…";
  try {
    const result = await api("/publish", {
      method: "POST",
      body: JSON.stringify({ message: $("commitMsg").value.trim() }),
      headers: { "Content-Type": "application/json" }
    });
    out.textContent = JSON.stringify(result, null, 2);
  } catch (e) {
    out.textContent = `Gagal: ${e.message}`;
  }
});

/* ---------------- init ---------------- */
(async function init() {
  if (!token) { showGate(false); return; }
  try {
    meta = await api("/meta");
    boot();
  } catch (e) {
    showGate(true);
  }
})();
