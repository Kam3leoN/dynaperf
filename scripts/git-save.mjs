/**
 * Commit avec message : sous Windows, `npm run … -- -m "…"` est souvent mangé par npm/cmd.
 * Méthodes supportées (par priorité) :
 * 1) Variable d’environnement GIT_SAVE_MSG
 * 2) npm_config_msg / npm_config_message (ex. npm run git:save --msg="…")
 * 3) Argument --msg=… ou --message=…
 * 4) -m après un éventuel premier « -- » dans argv
 */
import { spawnSync } from "node:child_process";

function getMessage() {
  const envMsg = process.env.GIT_SAVE_MSG?.trim();
  if (envMsg) return envMsg;

  const npmMsg = process.env.npm_config_msg ?? process.env.npm_config_message;
  if (npmMsg && String(npmMsg).trim()) return String(npmMsg).trim();

  let args = process.argv.slice(2);
  while (args[0] === "--") args = args.slice(1);

  for (const a of args) {
    if (a.startsWith("--msg=")) return a.slice(6).trim() || null;
    if (a.startsWith("--message=")) return a.slice("--message=".length).trim() || null;
  }

  const mIdx = args.indexOf("-m");
  if (mIdx !== -1 && args[mIdx + 1]) return args[mIdx + 1];

  return null;
}

const message = getMessage();

if (!message) {
  console.error("[git:save] Message requis. Exemples sous Windows PowerShell :\n");
  console.error('  npm run git:save -- --msg="votre message de commit"\n');
  console.error("  $env:GIT_SAVE_MSG = 'votre message'; npm run git:save:env\n");
  process.exit(1);
}

function runGit(gitArgs) {
  const r = spawnSync("git", gitArgs, { stdio: "inherit", windowsHide: true });
  if (r.error) {
    console.error(r.error.message);
    process.exit(1);
  }
  if ((r.status ?? 1) !== 0) {
    process.exit(r.status ?? 1);
  }
}

runGit(["add", "-A"]);
runGit(["commit", "-m", message]);
