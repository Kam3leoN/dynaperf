import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="https://deno.land/x/postgresjs@v3.4.5/types/index.d.ts"
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return "NULL";
    return String(val);
  }
  if (typeof val === "bigint") return val.toString();
  if (val instanceof Date) {
    return `'${val.toISOString().replace(/'/g, "''")}'::timestamptz`;
  }
  if (val instanceof Uint8Array) {
    const hex = Array.from(val).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `'\\x${hex}'::bytea`;
  }
  if (typeof val === "object") {
    try {
      return `'${JSON.stringify(val).replace(/\\/g, "\\\\").replace(/'/g, "''")}'::jsonb`;
    } catch {
      return "NULL";
    }
  }
  if (typeof val === "string") {
    if (val.startsWith("\\x") && /^\\x[0-9a-fA-F]*$/.test(val)) {
      return `E'${val.replace(/\\/g, "\\\\").replace(/'/g, "''")}'::bytea`;
    }
    return `'${val.replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

type AuthResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Autorise : Bearer BACKUP_CRON_SECRET (CRON / scheduler) ou JWT session super_admin.
 */
async function authorizeRequest(req: Request): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const cronSecret = Deno.env.get("BACKUP_CRON_SECRET");
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (cronSecret && bearer === cronSecret) {
    return { ok: true };
  }

  if (!auth.trim()) {
    return { ok: false, status: 401, message: "Authorization manquant (JWT ou secret CRON)" };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return { ok: false, status: 401, message: "Non authentifié" };
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
  const isSuperAdmin = roles?.some((r: { role: string }) => r.role === "super_admin");
  if (!isSuperAdmin) {
    return { ok: false, status: 403, message: "Réservé au super administrateur" };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Méthode non supportée" }, 405);
  }

  const authz = await authorizeRequest(req);
  if (!authz.ok) {
    return jsonResponse({ error: authz.message }, authz.status);
  }

  const dbUrlRaw = Deno.env.get("SUPABASE_DB_URL") ?? Deno.env.get("DATABASE_URL");
  if (!dbUrlRaw?.trim()) {
    return jsonResponse({
      error:
        "Secret SUPABASE_DB_URL (ou DATABASE_URL) manquant sur les Edge Functions : chaîne Postgres **directe** (port **5432**, mode session). Dashboard → Project Settings → Database → Connection string → URI. Redéployez `sql-backup` après avoir ajouté le secret.",
    }, 503);
  }

  const dbUrl = dbUrlRaw.trim();
  if (dbUrl.includes(":6543")) {
    return jsonResponse({
      error:
        "URL Postgres : utilisez le port **5432** (connexion directe / session), pas le pooler transactionnel (6543). Copiez l’URI « Session mode » depuis Supabase.",
    }, 400);
  }

  const maxRowsRaw = Deno.env.get("MAX_BACKUP_ROWS_PER_TABLE");
  const maxRows = maxRowsRaw ? Number(maxRowsRaw) : 50_000;
  const lim = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : 50_000;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const isLocal =
    /localhost|127\.0\.0\.1/.test(dbUrl) ||
    dbUrl.includes("@localhost") ||
    dbUrl.includes("@127.0.0.1");

  let db: ReturnType<typeof postgres> | null = null;

  try {
    db = postgres(dbUrl, {
      max: 1,
      prepare: false,
      connect_timeout: 45,
      ssl: isLocal ? false : true,
    });

    const tables = await db<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `;

    const lines: string[] = [
      "-- DynaPerf dump SQL (données INSERT, schéma non inclus)",
      `-- Généré : ${new Date().toISOString()}`,
      "SET session_replication_role = replica;",
      "",
    ];

    for (const { tablename } of tables) {
      const tq = `${quoteIdent("public")}.${quoteIdent(tablename)}`;
      const cols = await db<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tablename}
        ORDER BY ordinal_position
      `;
      if (cols.length === 0) continue;

      const colNames = cols.map((c) => quoteIdent(c.column_name));
      const colList = colNames.join(", ");

      const rows = await db.unsafe(
        `SELECT * FROM ${tq} LIMIT ${lim}`,
      ) as Record<string, unknown>[];

      lines.push(`-- Table public.${tablename} (${rows.length} ligne(s), max ${lim})`);
      if (rows.length === 0) {
        lines.push("");
        continue;
      }

      const chunk = 50;
      for (let i = 0; i < rows.length; i += chunk) {
        const slice = rows.slice(i, i + chunk);
        const valuesSql = slice.map((row) => {
          const vals = cols.map((c) => sqlLiteral(row[c.column_name]));
          return `(${vals.join(", ")})`;
        });
        lines.push(`INSERT INTO ${tq} (${colList}) VALUES`);
        lines.push(valuesSql.join(",\n") + ";");
        lines.push("");
      }
    }

    lines.push("SET session_replication_role = DEFAULT;");

    const dumpText = lines.join("\n");
    const fileName = `dump_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: uploadError } = await adminClient.storage.from("avatars").upload(
      `backups/sql/${fileName}`,
      new Blob([dumpText], { type: "application/sql" }),
      { contentType: "application/sql", upsert: false },
    );

    if (uploadError) {
      return jsonResponse({ error: uploadError.message }, 500);
    }

    const { data: files } = await adminClient.storage.from("avatars").list("backups/sql", {
      sortBy: { column: "created_at", order: "desc" },
    });

    if (files && files.length > 14) {
      const toDelete = files.slice(14).map((f) => `backups/sql/${f.name}`);
      await adminClient.storage.from("avatars").remove(toDelete);
    }

    return jsonResponse({
      success: true,
      file: fileName,
      path: `backups/sql/${fileName}`,
      tables: tables.length,
      note: "Dump logique INSERT uniquement ; restaurer le schéma via migrations Supabase avant import.",
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  } finally {
    if (db) await db.end({ timeout: 5 });
  }
});
