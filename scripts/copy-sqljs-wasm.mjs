/* Salin sql-wasm.wasm dari sql.js ke public/vendor/ supaya bisa di-fetch
   sebagai aset statis oleh browser (src/bank.js). public/vendor/ di-gitignore
   dan dibuat ulang tiap npm install/ci lewat hook "postinstall". */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "sql.js", "dist");
const destDir = join(root, "public", "vendor");
mkdirSync(destDir, { recursive: true });

// nama file wasm yang diminta beda-beda tergantung build sql.js mana yang
// dipilih bundler (node/browser/esm) - salin semua varian non-debug supaya
// locateFile() di src/bank.js selalu ketemu apa pun yang diminta.
const NAMES = ["sql-wasm.wasm", "sql-wasm-browser.wasm"];
for (const name of NAMES) {
  const src = join(srcDir, name);
  if (!existsSync(src)) {
    console.warn(`copy-sqljs-wasm: ${name} tidak ditemukan di node_modules/sql.js/dist, lewati.`);
    continue;
  }
  copyFileSync(src, join(destDir, name));
  console.log(`Disalin: public/vendor/${name}`);
}
