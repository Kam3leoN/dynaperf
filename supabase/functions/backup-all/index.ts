import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    // If called with auth header, verify super_admin
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await userClient.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
      const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Réservé au super admin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If no auth header, it's the CRON calling — proceed
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const tables = [
      "profiles", "user_roles", "collaborateur_config",
      "partenaires", "clubs", "secteurs",
      "audits", "audit_details", "audit_types", "audit_categories", "audit_items_config",
      "suivi_activite", "suivi_activite_items_config",
      "messages", "activity_log", "prenoms_genre",
    ];

    const backup: Record<string, any> = { created_at: new Date().toISOString() };

    for (const table of tables) {
      const { data, error } = await adminClient.from(table).select("*").limit(10000);
      backup[table] = { count: data?.length ?? 0, data: data ?? [], error: error?.message ?? null };
    }

    const jsonStr = JSON.stringify(backup, null, 2);
    const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("avatars") // reuse existing bucket
      .upload(`backups/${fileName}`, new Blob([jsonStr], { type: "application/json" }), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean old backups (keep last 7)
    const { data: files } = await adminClient.storage.from("avatars").list("backups", {
      sortBy: { column: "created_at", order: "desc" },
    });

    if (files && files.length > 7) {
      const toDelete = files.slice(7).map(f => `backups/${f.name}`);
      await adminClient.storage.from("avatars").remove(toDelete);
    }

    return new Response(JSON.stringify({ success: true, file: fileName, tables: tables.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
