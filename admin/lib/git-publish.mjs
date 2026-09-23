/* validateBank() sebagai gerbang, lalu commit+push public/data/bank.sqlite.
   Push ke main otomatis memicu .github/workflows/ci-cd.yml (build & deploy). */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ROOT } from "../../scripts/lib/db.mjs";
import { validateBank } from "../../scripts/lib/validate.mjs";

const run = promisify(execFile);

async function git(args) {
  try {
    const { stdout, stderr } = await run("git", args, { cwd: ROOT });
    return { ok: true, out: [stdout, stderr].filter(Boolean).join("\n") };
  } catch (e) {
    return { ok: false, out: [e.stdout, e.stderr, e.message].filter(Boolean).join("\n") };
  }
}

export async function publish(message) {
  const { errors, warnings, total } = validateBank();
  if (errors.length) {
    return { ok: false, stage: "validate", errors, warnings };
  }

  const steps = [];
  const add = await git(["add", "public/data/bank.sqlite"]);
  steps.push({ step: "add", ...add });
  if (!add.ok) return { ok: false, stage: "add", steps };

  // `git diff --quiet` keluar 0 kalau tidak ada bedanya (jadi diff.ok true
  // berarti tidak ada yang perlu di-commit)
  const diff = await git(["diff", "--cached", "--quiet"]);
  if (diff.ok) {
    return { ok: true, stage: "noop", steps, note: "Tidak ada perubahan untuk di-commit." };
  }

  const commit = await git(["commit", "-m", message || `Perbarui bank soal (${total} soal)`]);
  steps.push({ step: "commit", ...commit });
  if (!commit.ok) return { ok: false, stage: "commit", steps };

  const pull = await git(["pull", "--ff-only"]);
  steps.push({ step: "pull", ...pull });
  if (!pull.ok) return { ok: false, stage: "pull", steps };

  const push = await git(["push", "origin", "HEAD:main"]);
  steps.push({ step: "push", ...push });
  if (!push.ok) return { ok: false, stage: "push", steps };

  return { ok: true, stage: "done", steps, warnings, total };
}
