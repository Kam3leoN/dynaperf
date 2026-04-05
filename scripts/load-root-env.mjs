/**
 * Charge .env puis .env.local (ce dernier surcharge) dans process.env.
 * Réutilisé par les scripts npm (link, sync project id, import, etc.).
 */
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

/**
 * @param {string} [cwd]
 */
export function loadRootEnv(cwd = process.cwd()) {
  const paths = [resolve(cwd, ".env"), resolve(cwd, ".env.local")];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const override = i === 1;
    for (const line of raw.split("\n")) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (override || process.env[parsed.key] === undefined) process.env[parsed.key] = parsed.val;
    }
  }
}

/**
 * Référence projet Supabase (sous-domaine, ex. abcdefghi pour abcdefghi.supabase.co).
 * @param {string} [cwd]
 * @returns {string | null}
 */
export function getSupabaseProjectRef(cwd = process.cwd()) {
  loadRootEnv(cwd);
  let r = (process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || "").trim();
  if ((r.startsWith('"') && r.endsWith('"')) || (r.startsWith("'") && r.endsWith("'"))) r = r.slice(1, -1);
  return r || null;
}
