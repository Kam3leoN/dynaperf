import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt: string;

    if (mode === "observation") {
      systemPrompt = `Tu es un assistant expert en audits Dynabuy. Tu aides à rédiger des observations d'audit professionnelles et constructives.
Quand on te donne un contexte d'audit (type d'événement, score, items évalués), tu proposes :
1. Une observation synthétique et factuelle
2. Des points forts identifiés
3. Des axes d'amélioration concrets
4. Un plan d'action avec des échéances suggérées

Réponds toujours en français, de manière professionnelle et bienveillante. Utilise le markdown pour la mise en forme.`;
    } else if (mode === "plan_action") {
      systemPrompt = `Tu es un consultant expert en amélioration continue chez Dynabuy. À partir des résultats d'audit, tu proposes des plans d'action SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporel).
Structure tes plans d'action avec :
- **Objectif** : ce qu'il faut améliorer
- **Action** : ce qu'il faut faire concrètement
- **Responsable** : qui doit agir
- **Échéance** : quand
- **Indicateur** : comment mesurer le succès

Réponds en français, sois concret et actionnable.`;
    } else {
      systemPrompt = `Tu es DynaBot, l'assistant IA de DynaPerf, l'application de gestion d'audits et de suivi d'activité de Dynabuy.
Tu peux aider avec :
- La rédaction d'observations d'audit
- Des suggestions de plans d'action
- Des conseils sur les bonnes pratiques d'audit
- L'interprétation des résultats et scores
- Des conseils de networking et développement commercial

Réponds toujours en français, sois concis et professionnel. Utilise le markdown.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez l'administrateur." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
