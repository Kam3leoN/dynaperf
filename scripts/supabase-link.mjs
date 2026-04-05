#!/usr/bin/env node
/**
 * Lie le dépôt au projet Supabase dont la ref est dans .env
 * (VITE_SUPABASE_PROJECT_ID ou SUPABASE_PROJECT_ID).
 *
 *   npm run db:link
 *
 * Met d’abord à jour supabase/config.toml, puis exécute la CLI (mot de passe DB demandé).
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { getSupabaseProjectRef, loadRootEnv } from "./load-root-env.mjs";

const root = process.cwd();
loadRootEnv(root);
const ref = getSupabaseProjectRef(root);
if (!ref) {
  console.error(
    "Définis VITE_SUPABASE_PROJECT_ID (ou SUPABASE_PROJECT_ID) dans .env avant npm run db:link.",
  );
  process.exit(1);
}

const sync = spawnSync(process.execPath, [resolve(root, "scripts/write-supabase-project-id.mjs")], {
  stdio: "inherit",
  cwd: root,
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

const link = spawnSync("npx", ["supabase@latest", "link", "--project-ref", ref], {
  stdio: "inherit",
  shell: true,
  cwd: root,
});
process.exit(link.status ?? 1);
