/* CLI kecil buat operasi taksonomi yang jarang dilakukan: tambah mata uji,
   level, atau topik baru ke public/data/bank.sqlite. Menggantikan cara lama
   (edit data/subjects.json dkk tangan) sekarang datanya di SQLite.

   Pemakaian:
     node scripts/taxonomy.mjs list
     node scripts/taxonomy.mjs add-subject <id> <name> <blurb>
     node scripts/taxonomy.mjs add-level <id> <name> <blurb>
     node scripts/taxonomy.mjs add-topic <code> <name>

   Setelah menambah, jalankan npm run validate lalu commit+push seperti biasa
   (bukan lewat tombol admin, karena ini operasi jarang & lintas tabel). */
import { openDb } from "./lib/db.mjs";

const [cmd, ...args] = process.argv.slice(2);

function fatal(pesan) {
  console.error(`\nGagal: ${pesan}\n`);
  process.exit(1);
}

const db = openDb();

if (cmd === "list") {
  console.log("Mata uji:");
  db.prepare("SELECT id, name, sort FROM subjects ORDER BY sort").all()
    .forEach(s => console.log(`  ${s.id.padEnd(12)} ${s.name}`));
  console.log("\nLevel:");
  db.prepare("SELECT id, name, sort FROM levels ORDER BY sort").all()
    .forEach(l => console.log(`  ${l.id.padEnd(12)} ${l.name}`));
  console.log("\nTopik:");
  db.prepare("SELECT code, name FROM topics ORDER BY code").all()
    .forEach(t => console.log(`  ${t.code.padEnd(16)} ${t.name}`));
} else if (cmd === "add-subject") {
  const [id, name, blurb] = args;
  if (!id || !name || !blurb) fatal("pemakaian: add-subject <id> <name> <blurb>");
  if (db.prepare("SELECT 1 FROM subjects WHERE id = ?").get(id)) fatal(`mata uji "${id}" sudah ada`);
  const { n } = db.prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM subjects").get();
  db.prepare("INSERT INTO subjects (id, name, blurb, sort) VALUES (?, ?, ?, ?)").run(id, name, blurb, n);
  console.log(`Ditambah mata uji "${id}".`);
} else if (cmd === "add-level") {
  const [id, name, blurb] = args;
  if (!id || !name || !blurb) fatal("pemakaian: add-level <id> <name> <blurb>");
  if (db.prepare("SELECT 1 FROM levels WHERE id = ?").get(id)) fatal(`level "${id}" sudah ada`);
  const { n } = db.prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM levels").get();
  db.prepare("INSERT INTO levels (id, name, blurb, sort) VALUES (?, ?, ?, ?)").run(id, name, blurb, n);
  console.log(`Ditambah level "${id}".`);
} else if (cmd === "add-topic") {
  const [code, name] = args;
  if (!code || !name) fatal("pemakaian: add-topic <code> <name>");
  if (db.prepare("SELECT 1 FROM topics WHERE code = ?").get(code)) fatal(`topik "${code}" sudah ada`);
  db.prepare("INSERT INTO topics (code, name) VALUES (?, ?)").run(code, name);
  console.log(`Ditambah topik "${code}".`);
} else {
  fatal(`perintah tidak dikenal: "${cmd || ""}". Pakai: list, add-subject, add-level, add-topic`);
}

db.close();
