import { supabase } from "@/integrations/supabase/client";
import { readEdgeFunctionErrorMessage } from "@/lib/readEdgeFunctionError";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function supabaseUrlConfigured(): boolean {
  return Boolean(SUPABASE_URL?.trim());
}

/**
 * Appelle une Edge Function comme le client SQL inline : `fetch` + en-têtes `apikey` + JWT.
 * Plus fiable que `supabase.functions.invoke` sur certains hébergeurs (ex. Pages) où « Failed to fetch » apparaît sans réponse HTTP.
 */
async function invokeEdgeFetch(name: string, body?: Record<string, unknown>): Promise<{
  data: unknown;
  error: unknown;
  response?: Response;
}> {
  if (!supabaseUrlConfigured()) {
    return {
      data: null,
      error: Object.assign(new Error("VITE_SUPABASE_URL manquant"), { name: "ConfigError" }),
      response: undefined,
    };
  }
  if (!SUPABASE_PUBLISHABLE_KEY?.trim()) {
    return {
      data: null,
      error: Object.assign(new Error("VITE_SUPABASE_PUBLISHABLE_KEY manquant"), { name: "ConfigError" }),
      response: undefined,
    };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_PUBLISHABLE_KEY,
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const base = SUPABASE_URL!.replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/functions/v1/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return {
      data: null,
      error: Object.assign(new Error(msg), { name: "FunctionsFetchError" }),
      response: undefined,
    };
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    return {
      data,
      error: Object.assign(new Error(`Edge Function returned ${res.status}`), { name: "FunctionsHttpError" }),
      response: res,
    };
  }
  return { data, error: null, response: res };
}

export async function runBackupAllJson(): Promise<{
  ok: boolean;
  message: string;
  file?: string;
}> {
  const res = await invokeEdgeFetch("backup-all");
  const err = res.error as { name?: string; message?: string } | undefined;
  if (err?.name === "ConfigError" && typeof err.message === "string") {
    return { ok: false, message: `${err.message} Rebuild du front avec les variables d’environnement Supabase.` };
  }
  const data = res.data as { success?: boolean; file?: string; error?: string } | null;
  const ok = data && typeof data === "object" && data.success === true;
  if (ok) {
    const file = data.file ?? "";
    return {
      ok: true,
      message: file ? `Sauvegarde réussie : ${file}` : "Sauvegarde réussie",
      file,
    };
  }
  const detail = await readEdgeFunctionErrorMessage(res);
  return {
    ok: false,
    message: detail?.trim() || err?.message || data?.error || "Erreur de sauvegarde",
  };
}

export async function runSqlBackupToStorage(): Promise<{
  ok: boolean;
  message: string;
  file?: string;
}> {
  const res = await invokeEdgeFetch("sql-backup");
  const err = res.error as { name?: string; message?: string } | undefined;
  if (err?.name === "ConfigError" && typeof err.message === "string") {
    return { ok: false, message: `${err.message} Rebuild du front avec les variables d’environnement Supabase.` };
  }
  const data = res.data as { success?: boolean; file?: string; path?: string; error?: string } | null;
  if (data && typeof data === "object" && data.success) {
    const d = data;
    return {
      ok: true,
      message: `Dump SQL créé : ${d.file ?? d.path ?? "OK"}`,
      file: d.file,
    };
  }
  const detail = await readEdgeFunctionErrorMessage(res);
  return {
    ok: false,
    message: detail?.trim() || err?.message || data?.error || "Erreur dump SQL",
  };
}

/**
 * Télécharge un dump SQL (INSERT) via `sql-backup` en mode `output: inline` (fichier joint).
 */
export async function downloadSqlBackupFile(): Promise<{ ok: boolean; message: string }> {
  if (!supabaseUrlConfigured()) {
    return { ok: false, message: "VITE_SUPABASE_URL manquant (rebuild du front)." };
  }
  if (!SUPABASE_PUBLISHABLE_KEY?.trim()) {
    return { ok: false, message: "VITE_SUPABASE_PUBLISHABLE_KEY manquant." };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_PUBLISHABLE_KEY,
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const base = SUPABASE_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}/functions/v1/sql-backup`, {
    method: "POST",
    headers,
    body: JSON.stringify({ output: "inline" }),
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: string };
      return { ok: false, message: j.error?.trim() || text.slice(0, 400) };
    } catch {
      return { ok: false, message: text.slice(0, 400) };
    }
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let filename = `dump_${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
  const m = cd?.match(/filename="([^"]+)"/i) ?? cd?.match(/filename=([^;\s]+)/i);
  if (m?.[1]) filename = m[1].trim();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true, message: `Fichier téléchargé : ${filename}` };
}
