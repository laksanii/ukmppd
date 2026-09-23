/* Server admin buat mengelola bank soal: tambah/ubah/hapus soal + upload
   gambar, lalu publish (validasi -> commit -> push) yang otomatis memicu
   deploy lewat .github/workflows/ci-cd.yml.

   Jalan permanen (systemd/pm2 di VPS), diproteksi token sederhana karena
   endpointnya bisa menulis file & men-trigger git push. Lihat README bagian
   "Admin tool" untuk cara deploy di VPS.

   Pemakaian: npm run manage   (port default 4600, ubah lewat env PORT) */
import express from "express";
import multer from "multer";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../scripts/lib/db.mjs";
import { validateBank } from "../scripts/lib/validate.mjs";
import {
  getMeta, listQuestions, addQuestion, updateQuestion, deleteQuestion, saveImage, GAMBAR_DIR
} from "./lib/bank-io.mjs";
import { publish } from "./lib/git-publish.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = join(HERE, ".token");
const PORT = process.env.PORT || 4600;

function loadOrCreateToken() {
  if (existsSync(TOKEN_PATH)) return readFileSync(TOKEN_PATH, "utf8").trim();
  const token = randomBytes(24).toString("hex");
  writeFileSync(TOKEN_PATH, token + "\n", { mode: 0o600 });
  return token;
}
const TOKEN = loadOrCreateToken();

function safeEqual(a, b) {
  const bufA = Buffer.from(a || "");
  const bufB = Buffer.from(b || "");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(HERE, "public")));
app.use("/gambar", express.static(GAMBAR_DIR));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.use("/api", (req, res, next) => {
  if (!safeEqual(req.header("x-admin-token"), TOKEN)) {
    return res.status(401).json({ error: "token salah atau tidak ada" });
  }
  next();
});

app.get("/api/meta", (req, res) => {
  res.json(getMeta());
});

app.get("/api/bank", (req, res) => {
  const { subject, level } = req.query;
  if (!subject || !level) return res.status(400).json({ error: "subject & level wajib diisi" });
  res.json(listQuestions(subject, level));
});

app.post("/api/bank", (req, res) => {
  const { errors, question } = addQuestion(req.body);
  if (errors) return res.status(400).json({ errors });
  res.json(question);
});

app.put("/api/bank/:id", (req, res) => {
  const { errors, question } = updateQuestion(+req.params.id, req.body);
  if (errors) return res.status(400).json({ errors });
  res.json(question);
});

app.delete("/api/bank/:id", (req, res) => {
  const ok = deleteQuestion(+req.params.id);
  if (!ok) return res.status(404).json({ error: "soal tidak ditemukan" });
  res.json({ ok: true });
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  const { subject, level } = req.query;
  if (!subject || !level) return res.status(400).json({ error: "subject & level wajib diisi" });
  if (!req.file) return res.status(400).json({ error: "field 'image' wajib diisi" });
  const path = saveImage(subject, level, req.file.originalname, req.file.buffer);
  res.json({ path });
});

app.get("/api/validate", (req, res) => {
  const { errors, warnings, total } = validateBank({ root: ROOT, gambarDir: GAMBAR_DIR });
  res.json({ errors, warnings, total });
});

app.post("/api/publish", async (req, res) => {
  const result = await publish(req.body?.message);
  res.json(result);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Admin tool jalan di http://0.0.0.0:${PORT}`);
  console.log(`Token akses (sekali lihat, disimpan di admin/.token): ${TOKEN}`);
});
