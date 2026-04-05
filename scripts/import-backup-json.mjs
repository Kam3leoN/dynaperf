#!/usr/bin/env node
/**
 * Importe un export JSON au format { table: { count, data, error } } vers Supabase.
 *
 * Utilise la clé service_role (contourne le RLS). Ne jamais l’exposer au front.
 *
 * Usage :
 *   node scripts/import-backup-json.mjs "C:\chemin\backup.json"
 *   node scripts/import-backup-json.mjs ./backup.json --dry-run
 *   node scripts/import-backup-json.mjs ./backup.json --skip-auth
 *   node scripts/import-backup-json.mjs ./backup.json --only-auth --user-map=./map.json
 *
 * Variables d’environnement :
 *   SUPABASE_URL ou VITE_SUPABASE_URL  — URL du projet CIBLE
 *   SUPABASE_SERVICE_ROLE_KEY          — clé service_role (Dashboard → Settings → API)
 *
 * Optionnel :
 *   USER_ID_MAP_JSON                   — chemin vers { "ancien-uuid": "nouvel-uuid" } pour tables liées à auth
 *   BACKUP_OLD_PROJECT_REF             — défaut qgvlojeamzfqkntrpnhk ; remplacé dans les URLs Storage par la ref du SUPABASE_URL
 *
 * Tables « auth » (nécessitent des lignes auth.users avec les bons user_id, ou un USER_ID_MAP_JSON) :
 *   profiles, user_roles, collaborateur_config, messages, activity_log
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BATCH = 150;
const DEFAULT_OLD_REF = "qgvlojeamzfqkntrpnhk";

/** Ordre respectant les FK typiques du backup DynaPerf */
const TABLE_ORDER = [
  "prenoms_genre",
  "secteurs",
  "partenaires",
  "clubs",
  "audit_types",
  "audit_categories",
  "audit_items_config",
  "audits",
  "audit_details",
  "suivi_activite_items_config",
  "suivi_activite",
  "messages",
  "activity_log",
  "profiles",
  "user_roles",
  "collaborateur_config",
];

const AUTH_TABLES = new Set([
  "profiles",
  "user_roles",
  "collaborateur_config",
  "messages",
  "activity_log",
]);

/** Colonne(s) unique pour upsert (sinon conflits avec les seeds sur id différent, même prenom/key) */
const TABLE_ON_CONFLICT = {
  prenoms_genre: "prenom",
  audit_types: "key",
  /** Profil déjà créé par trigger à l’inscription : conflit sur user_id, pas sur id */
  profiles: "user_id",
  /** Rôle souvent déjà inséré par trigger */
  user_roles: "user_id,role",
};

/** UID présents dans auth.users (API admin). */
async function fetchAuthUserIds(supabase) {
  const ids = new Set();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn("[auth] listUsers :", error.message);
      return null;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      if (u?.id) ids.add(normUuid(u.id));
    }
    if (users.length < perPage) break;
    page += 1;
  }
  return ids;
}

async function buildAuditTypeIdMap(supabase, backupTypeRows, dryRun) {
  if (dryRun) return new Map(backupTypeRows.map((r) => [r.id, r.id]));
  const { data, error } = await supabase.from("audit_types").select("id,key");
  if (error) {
    console.error("[audit_types] lecture id/key pour remap:", error.message);
    return new Map();
  }
  const keyToDbId = new Map((data ?? []).map((r) => [r.key, r.id]));
  const map = new Map();
  for (const r of backupTypeRows) {
    const nid = keyToDbId.get(r.key);
    if (nid) map.set(r.id, nid);
    else console.warn(`[audit_types] clé inconnue en base : ${r.key}`);
  }
  return map;
}

function parseEnvLine(line) {
  const t = line.replace(/\r$/, "").trim();
  if (!t || t.startsWith("#")) return null;
  const eq = t.indexOf("=");
  if (eq < 1) return null;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

/** Charge .env puis .env.local (ce dernier écrase les clés déjà définies — pratique pour la service_role). */
function loadRootEnv() {
  const root = process.cwd();
  const paths = [resolve(root, ".env"), resolve(root, ".env.local")];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const override = i === 1;
    for (const line of raw.split(/\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const { key, val } = parsed;
      if (override || process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const flags = new Set();
  const pos = [];
  let userMapPath = null;
  for (const a of argv) {
    if (a === "--dry-run" || a === "--skip-auth" || a === "--only-auth") flags.add(a);
    else if (a.startsWith("--user-map=")) userMapPath = a.slice("--user-map=".length);
    else if (!a.startsWith("-")) pos.push(a);
  }
  return { flags, path: pos[0] || process.env.BACKUP_JSON_PATH, userMapPath };
}

function projectRefFromUrl(url) {
  try {
    const h = new URL(url).hostname;
    const m = h.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** UUID stable pour clés Map / comparaisons (évite listUsers ≠ map à cause de casse / espaces). */
function normUuid(v) {
  if (typeof v !== "string") return v;
  const s = v.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s) ? s : v.trim();
}

function loadUserMap(userMapPath) {
  if (!userMapPath) {
    const envPath = process.env.USER_ID_MAP_JSON;
    if (envPath && existsSync(envPath)) userMapPath = envPath;
  }
  if (!userMapPath) return new Map();
  const j = JSON.parse(readFileSync(resolve(userMapPath), "utf8"));
  const m = new Map();
  for (const [k, val] of Object.entries(j)) {
    const nk = normUuid(k);
    const nv = typeof val === "string" ? normUuid(val) : val;
    if (typeof nk === "string" && typeof nv === "string") m.set(nk, nv);
  }
  return m;
}

function remapUserIds(row, table, userMap) {
  if (userMap.size === 0) return row;
  const out = { ...row };
  const map = (v) => {
    if (typeof v !== "string") return v;
    const k = normUuid(v);
    if (typeof k !== "string") return v;
    return userMap.has(k) ? userMap.get(k) : k;
  };
  if (table === "profiles") out.user_id = map(out.user_id);
  if (table === "user_roles") out.user_id = map(out.user_id);
  if (table === "collaborateur_config") out.user_id = map(out.user_id);
  if (table === "messages") {
    out.sender_id = map(out.sender_id);
    out.recipient_id = map(out.recipient_id);
  }
  if (table === "activity_log") out.user_id = map(out.user_id);
  return out;
}

function rewriteStorageUrls(row, oldRef, newRef) {
  if (!oldRef || !newRef || oldRef === newRef) return row;
  const repl = (v) =>
    typeof v === "string" && v.includes(oldRef) ? v.split(oldRef).join(newRef) : v;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    out[k] = repl(out[k]);
  }
  return out;
}

async function upsertBatches(supabase, table, rows, dryRun, onConflict = "id") {
  if (rows.length === 0) return { ok: 0, err: 0 };
  let ok = 0;
  let err = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    if (dryRun) {
      ok += chunk.length;
      continue;
    }
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      console.error(`[${table}] lot ${i / BATCH + 1}:`, error.message);
      err += chunk.length;
    } else {
      ok += chunk.length;
    }
  }
  return { ok, err };
}

async function main() {
  loadRootEnv();
  const { flags, path: jsonPath, userMapPath } = parseArgs(process.argv.slice(2));
  const dryRun = flags.has("--dry-run");
  const skipAuth = flags.has("--skip-auth");
  const onlyAuth = flags.has("--only-auth");
  if (onlyAuth && skipAuth) {
    console.error("--only-auth et --skip-auth sont incompatibles.");
    process.exit(1);
  }

  if (!jsonPath || !existsSync(resolve(jsonPath))) {
    console.error(
      "Fichier JSON manquant. Exemple :\n" +
        '  node scripts/import-backup-json.mjs "C:\\Users\\…\\backup_2026-04-03.json"\n' +
        "ou BACKUP_JSON_PATH=…",
    );
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    console.error(
      "URL Supabase manquante : ajoute VITE_SUPABASE_URL ou SUPABASE_URL dans .env (racine du projet).",
    );
    process.exit(1);
  }
  if (!serviceKey) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY manquante.\n\n" +
        "1. Dashboard Supabase (projet cible) → Settings → API → copier la clé « service_role » (secret).\n" +
        "2. Ajoute dans .env ou .env.local à la racine de dynaperf :\n\n" +
        "   SUPABASE_SERVICE_ROLE_KEY=eyJ...\n\n" +
        "Ne jamais préfixer en VITE_ ni committer cette clé.",
    );
    process.exit(1);
  }

  const newRef = projectRefFromUrl(url);
  const oldRef = process.env.BACKUP_OLD_PROJECT_REF || DEFAULT_OLD_REF;
  const userMap = loadUserMap(userMapPath);

  const raw = JSON.parse(readFileSync(resolve(jsonPath), "utf8"));
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Cible : ${url}`);
  if (dryRun) console.log("Mode --dry-run (aucune écriture).\n");
  if (skipAuth) console.log("Mode --skip-auth : tables liées aux users ignorées.\n");
  if (onlyAuth) console.log("Mode --only-auth : uniquement messages, activity_log, profiles, user_roles, collaborateur_config.\n");
  if (userMap.size) console.log(`Mapping user_id : ${userMap.size} entrée(s).\n`);
  if (newRef && oldRef !== newRef) console.log(`Réécriture URLs Storage : ${oldRef} → ${newRef}\n`);

  let authUserIds = null;
  if (!dryRun) {
    authUserIds = await fetchAuthUserIds(supabase);
    if (authUserIds?.size) console.log(`Utilisateurs Auth (listUsers) : ${authUserIds.size}\n`);
  }

  if (userMap.size > 0 && authUserIds?.size) {
    for (const [oldId, newId] of userMap) {
      if (typeof newId !== "string" || !authUserIds.has(newId)) {
        console.warn(
          `[user-map] L’UUID cible pour l’ancien ${oldId} n’est pas dans listUsers : « ${newId} » — recopie l’UID depuis Authentication → Users.`,
        );
      }
    }
  }

  let totalOk = 0;
  let totalErr = 0;
  let warnedAuthWithoutMap = false;
  /** Ancien audit_types.id (backup) → id réel en base (après upsert sur key) */
  let auditTypeIdMap = new Map();

  for (const table of TABLE_ORDER) {
    if (onlyAuth && !AUTH_TABLES.has(table)) {
      continue;
    }
    if (skipAuth && AUTH_TABLES.has(table)) {
      console.log(`[${table}] ignoré (--skip-auth)`);
      continue;
    }
    const block = raw[table];
    if (!block || typeof block !== "object") {
      console.log(`[${table}] absent du JSON, ignoré.`);
      continue;
    }
    if (block.error) {
      console.warn(`[${table}] export source en erreur:`, block.error);
      continue;
    }
    const data = Array.isArray(block.data) ? block.data : [];
    if (data.length === 0) {
      console.log(`[${table}] 0 ligne`);
      continue;
    }

    let rows = data.map((row) => {
      let r = remapUserIds(row, table, userMap);
      if (newRef && oldRef !== newRef) {
        r = rewriteStorageUrls(r, oldRef, newRef);
      }
      return r;
    });

    if (table === "audit_categories" && auditTypeIdMap.size > 0) {
      rows = rows.map((r) => {
        const mapped = auditTypeIdMap.get(r.audit_type_id);
        return mapped ? { ...r, audit_type_id: mapped } : r;
      });
    }

    if (!skipAuth && AUTH_TABLES.has(table) && userMap.size === 0 && rows.length > 0) {
      warnedAuthWithoutMap = true;
    }

    if (table === "messages" && authUserIds) {
      const n = rows.length;
      rows = rows.filter((r) => {
        const s = typeof r.sender_id === "string" ? normUuid(r.sender_id) : r.sender_id;
        const t = typeof r.recipient_id === "string" ? normUuid(r.recipient_id) : r.recipient_id;
        return authUserIds.has(s) && authUserIds.has(t);
      });
      if (n > rows.length) {
        console.log(
          `  → ${n - rows.length} message(s) ignoré(s) (expéditeur ou destinataire absent de Auth après mapping)`,
        );
      }
    }

    if (table === "collaborateur_config" && authUserIds) {
      const n = rows.length;
      rows = rows.filter((r) => {
        const uid = typeof r.user_id === "string" ? normUuid(r.user_id) : r.user_id;
        return authUserIds.has(uid);
      });
      if (n > rows.length) {
        console.log(`  → ${n - rows.length} ligne(s) collaborateur_config ignorée(s) (user_id absent de Auth)`);
      }
    }

    const uuidTables = new Set(["profiles", "user_roles", "collaborateur_config", "messages", "activity_log"]);
    if (uuidTables.has(table)) {
      rows = rows.map((r) => {
        const x = { ...r };
        if (typeof x.user_id === "string" && x.user_id) x.user_id = normUuid(x.user_id);
        if (table === "messages") {
          if (typeof x.sender_id === "string") x.sender_id = normUuid(x.sender_id);
          if (typeof x.recipient_id === "string") x.recipient_id = normUuid(x.recipient_id);
        }
        return x;
      });
    }

    const onConflict = TABLE_ON_CONFLICT[table] ?? "id";

    if (table === "profiles" && onConflict === "user_id") {
      rows = rows.map(({ id: _profileId, ...rest }) => rest);
    }
    if (table === "user_roles" && onConflict === "user_id,role") {
      rows = rows.map(({ id: _roleRowId, ...rest }) => rest);
    }

    const { ok, err } = await upsertBatches(supabase, table, rows, dryRun, onConflict);

    totalOk += ok;
    totalErr += err;
    console.log(`[${table}] ${ok} ok${err ? `, ${err} erreur(s)` : ""}`);

    if (table === "audit_types") {
      auditTypeIdMap = await buildAuditTypeIdMap(supabase, data, dryRun);
      if (!dryRun && auditTypeIdMap.size) {
        console.log(`  → remap audit_type_id : ${auditTypeIdMap.size} correspondance(s) backup → base cible`);
      }
    }
  }

  console.log(`\nTerminé. ${totalOk} lignes traitées${totalErr ? `, ${totalErr} erreurs` : ""}.`);
  if (!skipAuth && !onlyAuth && warnedAuthWithoutMap && userMap.size === 0) {
    console.log(
      "\nÉtape suivante (tables liées à Auth) :\n" +
        "  1. Crée / invite les comptes sur le projet cible (mêmes emails que l’ancien).\n" +
        "  2. Génère un modèle de mapping :\n" +
        "       npm run db:backup-user-ids -- \"…backup.json\" .\\user-id-map.json\n" +
        "  3. Remplace REMPLACE_PAR_UUID_SUPABASE_CIBLE par l’UID de chaque user (Dashboard → Authentication).\n" +
        "  4. Réimporte uniquement ces tables :\n" +
        "       npm run db:import-backup:auth -- \"…backup.json\"\n" +
        "       (évite que npm avale les flags ; utilise .\\user-id-map.json par défaut)\n",
    );
  }
  if (onlyAuth && totalErr > 0 && userMap.size === 0) {
    console.log(
      "\nIl manque --user-map=… avec les correspondances ancien UUID → nouvel UUID (voir npm run db:backup-user-ids).",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
