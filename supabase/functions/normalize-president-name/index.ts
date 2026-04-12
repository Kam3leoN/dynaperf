import { normalizePresidentImportName } from "../_shared/personNameNormalize.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = { text?: unknown; texts?: unknown };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée (POST attendu)." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Body;

    if (Array.isArray(body.texts)) {
      const normalized = body.texts.map((t) =>
        typeof t === "string" ? normalizePresidentImportName(t) : "",
      );
      return new Response(JSON.stringify({ normalized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof body.text === "string") {
      return new Response(JSON.stringify({ normalized: normalizePresidentImportName(body.text) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Corps JSON invalide. Utilisez { \"text\": \"NOM/Prénom\" } ou { \"texts\": [\"...\"] }.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
