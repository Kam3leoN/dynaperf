#!/usr/bin/env node
/**
 * Affiche id + email de tous les comptes Auth (API admin / service_role).
 * Utile pour remplir user-id-map.json avec les UUID exacts du projet cible.
 *
 *   npm run db:list-auth-users
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

function loadRootEnv() {
  const root = process.cwd();
  const paths = [resolve(root, ".env"), resolve(root, ".env.local")];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const override = i === 1;
    for (const line of raw.split("\n")) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const { key, val } = parsed;
      if (override || process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function listAllAuth(supabase) {
  const perPage = 200;
  let page = 1;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("[auth] listUsers :", error.message);
      process.exit(1);
    }
    const batch = data?.users ?? [];
    for (const u of batch) {
      if (u?.id) rows.push({ id: u.id, email: u.email ?? "" });
    }
    if (batch.length < perPage) break;
    page += 1;
  }
  return rows;
}

loadRootEnv();
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Définis VITE_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY dans .env / .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = await listAllAuth(supabase);
rows.sort((a, b) => a.email.localeCompare(b.email, "fr"));
console.log("id\temail\n");
for (const r of rows) {
  console.log(`${r.id}\t${r.email}`);
}
console.log(`\nTotal : ${rows.length}`);
