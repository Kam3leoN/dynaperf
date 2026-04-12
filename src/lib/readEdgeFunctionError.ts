/**
 * Lit le message métier renvoyé par une Edge Function (corps JSON `{ error: string }`).
 * Pour les statuts non-2xx, `functions.invoke` met `data` à null : le détail est dans le corps
 * HTTP (`result.response` ou `FunctionsHttpError.context`).
 */
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
    const err = result.error as { message?: string } | undefined;
    const m = typeof err?.message === "string" ? err.message.trim() : "";
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
