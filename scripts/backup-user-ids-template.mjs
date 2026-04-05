#!/usr/bin/env node
/**
 * Liste les UUID utilisateurs présents dans un backup JSON et génère un modèle pour --user-map.
 *
 * Usage :
 *   node scripts/backup-user-ids-template.mjs "C:\chemin\backup.json"
 *   node scripts/backup-user-ids-template.mjs ./backup.json ./user-id-map.json
 *
 * Ensuite : pour chaque clé, remplace la valeur par l’UUID du même compte sur le NOUVEAU projet
 * (Dashboard → Authentication → Users → colonne UID), puis :
 *   npm run db:import-backup:auth -- "backup.json"
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const argv = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const inPath = argv[0] || process.env.BACKUP_JSON_PATH;
const outPath = argv[1];

if (!inPath || !existsSync(resolve(inPath))) {
  console.error(
    'Usage : node scripts/backup-user-ids-template.mjs "chemin/backup.json" [sortie.json]',
  );
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(inPath), "utf8"));
const ids = new Set();

function collect(table, pick) {
  const block = raw[table];
  if (!block?.data?.length) return;
  for (const row of block.data) {
    for (const field of pick) {
      const v = row[field];
      if (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) ids.add(v);
    }
  }
}

collect("profiles", ["user_id"]);
collect("user_roles", ["user_id"]);
collect("collaborateur_config", ["user_id"]);
collect("messages", ["sender_id", "recipient_id"]);
collect("activity_log", ["user_id"]);

const sorted = [...ids].sort();
const template = Object.fromEntries(sorted.map((id) => [id, "REMPLACE_PAR_UUID_SUPABASE_CIBLE"]));

const json = JSON.stringify(template, null, 2);
if (outPath) {
  writeFileSync(resolve(outPath), json + "\n", "utf8");
  console.log(`Écrit : ${resolve(outPath)} (${sorted.length} entrée(s))`);
} else {
  console.log(json);
}

console.log(
  `\n${sorted.length} UUID distinct(s). Remplace chaque valeur par l’UID du même utilisateur sur le projet cible, puis importe uniquement les tables auth :\n` +
    `  npm run db:import-backup:auth -- "${inPath}"\n` +
    `   (avec user-id-map.json à la racine du projet, ou : node scripts/run-import-auth.mjs "${inPath}" chemin/map.json)`,
);
