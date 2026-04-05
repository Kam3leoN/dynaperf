#!/usr/bin/env node
/**
 * Réimport des données d’un projet Supabase (source) vers un autre (cible).
 *
 * Prérequis : npx supabase@latest disponible (déjà utilisé par le repo).
 *
 * Variables d’environnement obligatoires :
 *   SOURCE_DATABASE_URL — chaîne Postgres de l’ANCIEN projet (Dashboard → Settings → Database → URI, connexion directe :5432).
 *   TARGET_DATABASE_URL — chaîne Postgres du NOUVEAU projet (même endroit).
 *
 * Optionnel :
 *   --skip-truncate     Ne vide pas les tables public avant import (risque de conflits PK).
 *   --with-auth         Tente aussi un dump data-only du schéma auth (peut échouer selon les droits hébergés).
 *   --dry-run           Affiche les commandes sans les exécuter.
 *
 * Non couvert ici : fichiers Storage (buckets). Les lignes en base peuvent référencer des objets à recopier manuellement ou via outil S3-compatible.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TMP = join(ROOT, ".tmp-db-reimport");
const SUPABASE = "npx";
const SUPABASE_ARGS = ["supabase@latest"];

function hasFlag(name) {
  return process.argv.includes(name);
}

function run(label, command, args, extraEnv = {}) {
  if (hasFlag("--dry-run")) {
    console.log(`[dry-run] ${label}:\n  ${command} ${args.join(" ")}\n`);
    return { status: 0 };
  }
  const env = { ...process.env, ...extraEnv };
  const r = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error(`\nÉchec : ${label} (code ${r.status ?? "?"})`);
    process.exit(r.status ?? 1);
  }
  return r;
}

function requireUrl(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(
      `Variable manquante : ${name}\n` +
        `Exemple (mot de passe encodé si caractères spéciaux) :\n` +
        `  set ${name}=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`,
    );
    process.exit(1);
  }
  return v;
}

const TRUNCATE_SQL = `
DO $truncate$
DECLARE
  q text;
BEGIN
  SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY tablename)
         || ' RESTART IDENTITY CASCADE'
  INTO q
  FROM pg_tables
  WHERE schemaname = 'public';
  IF q IS NOT NULL THEN
    EXECUTE q;
  END IF;
END
$truncate$;
`;

function main() {
  const source = requireUrl("SOURCE_DATABASE_URL");
  const target = requireUrl("TARGET_DATABASE_URL");

  mkdirSync(TMP, { recursive: true });

  const publicDump = join(TMP, "public-data.sql");
  const authDump = join(TMP, "auth-data.sql");
  const truncateFile = join(TMP, "truncate-public.sql");

  if (!hasFlag("--skip-truncate")) {
    writeFileSync(truncateFile, TRUNCATE_SQL.trim() + "\n", "utf8");
    run(
      "Vider le schéma public (cible)",
      SUPABASE,
      [...SUPABASE_ARGS, "db", "query", "--db-url", target, "-f", truncateFile],
    );
  } else {
    console.log("(--skip-truncate) Conservation des lignes existantes sur la cible — conflits possibles.\n");
  }

  run(
    "Export data-only schéma public (source)",
    SUPABASE,
    [
      ...SUPABASE_ARGS,
      "db",
      "dump",
      "--db-url",
      source,
      "--data-only",
      "--schema",
      "public",
      "-f",
      publicDump,
    ],
  );

  if (!hasFlag("--dry-run")) {
    if (!existsSync(publicDump)) {
      console.error("Fichier dump introuvable :", publicDump);
      process.exit(1);
    }
  }

  run(
    "Import dans la cible (public)",
    SUPABASE,
    [...SUPABASE_ARGS, "db", "query", "--db-url", target, "-f", publicDump],
  );

  if (hasFlag("--with-auth")) {
    run(
      "Export data-only schéma auth (source)",
      SUPABASE,
      [
        ...SUPABASE_ARGS,
        "db",
        "dump",
        "--db-url",
        source,
        "--data-only",
        "--schema",
        "auth",
        "-f",
        authDump,
      ],
    );
    run(
      "Import dans la cible (auth)",
      SUPABASE,
      [...SUPABASE_ARGS, "db", "query", "--db-url", target, "-f", authDump],
    );
  }

  console.log(
    "\nTerminé. Vérifie les comptes (auth) et les fichiers Storage si tu utilises le Drive.\n" +
      "Les mots de passe ne sont pas dans le dump public ; avec --with-auth, les hashes auth.users peuvent être recopiés si le dump est autorisé.\n",
  );
}

main();
