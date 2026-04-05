/**
 * Lit le message métier renvoyé par une Edge Function (corps JSON `{ error: string }`)
 * lorsque le client Supabase ne remonte que « Edge Function returned a non-2xx status code ».
 */
export async function readEdgeFunctionErrorMessage(result: {
  data: unknown;
  error: unknown;
  response?: Response;
}): Promise<string | null> {
  if (result.data && typeof result.data === "object" && result.data !== null) {
    const e = (result.data as { error?: unknown }).error;
    if (typeof e === "string" && e.trim()) return e;
  }
  const res = result.response;
  if (!res) return null;
  try {
    const text = await res.clone().text();
    if (!text?.trim()) return null;
    try {
      const j = JSON.parse(text) as { error?: unknown };
      if (typeof j.error === "string" && j.error.trim()) return j.error;
    } catch {
      return text.length > 280 ? `${text.slice(0, 280)}…` : text;
    }
  } catch {
    return null;
  }
  return null;
}
