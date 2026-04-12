/**
 * Lit le message métier renvoyé par une Edge Function (corps JSON `{ error: string }`).
 * Pour les statuts non-2xx, `functions.invoke` met `data` à null : le détail est dans le corps
 * HTTP (`result.response` ou `FunctionsHttpError.context`).
 *
 * `FunctionsFetchError` (« Failed to send a request… ») = aucune réponse HTTP : URL / réseau / CORS / SSL,
 * pas une erreur métier renvoyée par Deno.
 */
const FUNCTIONS_FETCH_MESSAGE = "Failed to send a request to the Edge Function";

function responseFromInvokeResult(result: {
  error: unknown;
  response?: Response;
}): Response | undefined {
  if (result.response instanceof Response) return result.response;
  const e = result.error;
  if (e && typeof e === "object" && "context" in e) {
    const c = (e as { context: unknown }).context;
    if (c instanceof Response) return c;
  }
  return undefined;
}

/** Message lisible quand le navigateur n’atteint même pas l’Edge Function (réseau). */
function formatFunctionsFetchError(err: { message?: string; name?: string; context?: unknown }): string {
  const ctx = err.context;
  let inner = "";
  if (ctx instanceof Error && ctx.message.trim()) inner = ctx.message.trim();
  else if (typeof ctx === "string" && ctx.trim()) inner = ctx.trim();

  const hint =
    "Vérifiez que l’URL du projet (VITE_SUPABASE_URL) est https://<ref>.supabase.co, que les fonctions `backup-all` / `sql-backup` sont déployées (`supabase functions deploy`), et l’onglet Réseau (F12) pour une erreur CORS, SSL ou bloquée.";

  if (inner && inner !== FUNCTIONS_FETCH_MESSAGE) {
    return `Connexion aux Edge Functions impossible (${inner}). ${hint}`;
  }
  return `Connexion aux Edge Functions impossible — aucune réponse du serveur. ${hint}`;
}

export async function readEdgeFunctionErrorMessage(result: {
  data: unknown;
  error: unknown;
  response?: Response;
}): Promise<string | null> {
  if (result.data && typeof result.data === "object" && result.data !== null) {
    const row = result.data as { error?: unknown; message?: unknown };
    if (typeof row.error === "string" && row.error.trim()) return row.error.trim();
    if (typeof row.message === "string" && row.message.trim()) return row.message.trim();
  }

  const res = responseFromInvokeResult(result);
  if (!res) {
    const err = result.error as { message?: string; name?: string; context?: unknown } | undefined;
    const m = typeof err?.message === "string" ? err.message.trim() : "";
    if (m === FUNCTIONS_FETCH_MESSAGE || err?.name === "FunctionsFetchError") {
      return formatFunctionsFetchError(err ?? {});
    }
    return m && m !== "Edge Function returned a non-2xx status code" ? m : null;
  }

  try {
    const text = await res.clone().text();
    if (!text?.trim()) return null;
    try {
      const j = JSON.parse(text) as { error?: unknown; message?: unknown };
      if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
      if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
    } catch {
      return text.length > 280 ? `${text.slice(0, 280)}…` : text;
    }
  } catch {
    return null;
  }
  return null;
}
