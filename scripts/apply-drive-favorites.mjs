/**
 * Applique la migration tags + is_favorite sur drive_documents depuis la machine locale.
 *
 * Prérequis (au choix) :
 * 1) Variable d’environnement SUPABASE_DB_URL dans .env (Dashboard → Project Settings → Database → Connection string → URI, avec le mot de passe).
 * 2) Ou : npx supabase login puis npx supabase link --project-ref <ref>, puis npm run db:apply-drive:linked
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadDotEnv();

const migrationFile = resolve(process.cwd(), "supabase/migrations/20260404120000_drive_tags_favorites.sql");

if (!existsSync(migrationFile)) {
  console.error("Fichier introuvable :", migrationFile);
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error(`
[db:apply-drive] Aucune SUPABASE_DB_URL dans .env

Ajoute dans .env (une seule ligne, mot de passe de la base — Paramètres Supabase → Database → URI) :
  SUPABASE_DB_URL=postgresql://postgres.[PROJECT_REF]:[MOT_DE_PASSE]@db.[PROJECT_REF].supabase.co:5432/postgres

Puis relance : npm run db:apply-drive

Alternative sans URI dans .env :
  npx supabase@latest login
  npx supabase@latest link --project-ref qgvlojeamzfqkntrpnhk
  npm run db:apply-drive:linked
`);
  process.exit(1);
}

const fileArg = migrationFile.replace(/\\/g, "/");

const r = spawnSync(
  "npx",
  ["-y", "supabase@latest", "db", "query", "--db-url", dbUrl, "-f", fileArg],
  { stdio: "inherit", shell: true, cwd: process.cwd(), env: process.env }
);

process.exit(r.status === null ? 1 : r.status);
