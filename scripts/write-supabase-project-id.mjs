#!/usr/bin/env node
/**
 * Met à jour supabase/config.toml → project_id depuis .env
 * (VITE_SUPABASE_PROJECT_ID ou SUPABASE_PROJECT_ID).
 *
 *   npm run db:sync-project
 *
 * À lancer après changement de projet dans .env, avant db:push / db:link.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseProjectRef, loadRootEnv } from "./load-root-env.mjs";

const root = process.cwd();
loadRootEnv(root);
const ref = getSupabaseProjectRef(root);
if (!ref) {
  console.error(
    "Définis VITE_SUPABASE_PROJECT_ID (ou SUPABASE_PROJECT_ID) dans .env — " +
      "identifiant du projet (sous-domaine avant .supabase.co).",
  );
  process.exit(1);
}

const cfgPath = resolve(root, "supabase/config.toml");
const line = `project_id = "${ref}"`;
const header =
  "# project_id : synchronisé depuis .env via « npm run db:sync-project » ou « npm run db:link ».\n";

let text = existsSync(cfgPath) ? readFileSync(cfgPath, "utf8") : "";
let out;

if (/^project_id\s*=/m.test(text)) {
  out = text.replace(/^project_id\s*=\s*"[^"]*"/m, line);
} else if (text.trim()) {
  out = `${text.trimEnd()}\n\n${header}${line}\n`;
} else {
  out = `${header}${line}\n`;
}

writeFileSync(cfgPath, out);
console.log(`supabase/config.toml → project_id = "${ref}"`);
