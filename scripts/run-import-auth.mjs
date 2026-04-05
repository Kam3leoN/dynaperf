#!/usr/bin/env node
/**
 * Contourne npm qui avale les flags --only-auth / --user-map sur certaines versions.
 *
 * Usage :
 *   npm run db:import-backup:auth -- "C:\chemin\backup_2026-04-03.json"
 *   node scripts/run-import-auth.mjs "C:\chemin\backup.json" [chemin\user-id-map.json]
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const backup = process.argv[2] || process.env.BACKUP_JSON_PATH;
const mapPath = resolve(process.argv[3] || process.env.USER_ID_MAP_JSON || "user-id-map.json");

if (!backup) {
  console.error(
    'Usage : npm run db:import-backup:auth -- "C:\\chemin\\backup.json"\n' +
      "   ou : node scripts/run-import-auth.mjs \"…backup.json\" […user-id-map.json]",
  );
  process.exit(1);
}

const backupAbs = resolve(backup);
if (!existsSync(backupAbs)) {
  console.error("Backup introuvable :", backupAbs);
  process.exit(1);
}
if (!existsSync(mapPath)) {
  console.error("Fichier user-id-map introuvable :", mapPath);
  process.exit(1);
}

const script = resolve(process.cwd(), "scripts/import-backup-json.mjs");
const r = spawnSync(
  process.execPath,
  [script, backupAbs, "--only-auth", `--user-map=${mapPath}`],
  { stdio: "inherit", cwd: process.cwd(), env: process.env },
);

process.exit(r.status === null ? 1 : r.status);
