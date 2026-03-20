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
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin");

    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // DELETE USER
    if (action === "delete") {
      const { userId } = body;
      if (!userId) return jsonError("userId requis", 400);
      await adminClient.from("collaborateur_config").delete().eq("user_id", userId);
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("user_id", userId);
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) return jsonError(error.message, 400);
      return jsonOk({ success: true });
    }

    // SET ROLE
    if (action === "set-role") {
      const { userId, role } = body;
      if (!userId || !role) return jsonError("userId et role requis", 400);
      await adminClient.from("user_roles").delete().eq("user_id", userId).neq("role", "admin");
      if (role !== "none") {
        const { error } = await adminClient.from("user_roles").upsert(
          { user_id: userId, role },
          { onConflict: "user_id,role" }
        );
        if (error) return jsonError(error.message, 400);
      }
      return jsonOk({ success: true });
    }

    // SAVE CONFIG (objectives + primes)
    if (action === "save-config") {
      const { userId, objectif, palier_1, palier_2, palier_3, prime_audit_1, prime_audit_2, prime_audit_3_plus } = body;
      if (!userId) return jsonError("userId requis", 400);
      const { error } = await adminClient.from("collaborateur_config").upsert(
        {
          user_id: userId,
          objectif: objectif ?? 0,
          palier_1: palier_1 ?? null,
          palier_2: palier_2 ?? null,
          palier_3: palier_3 ?? null,
          prime_audit_1: prime_audit_1 ?? 0,
          prime_audit_2: prime_audit_2 ?? 0,
          prime_audit_3_plus: prime_audit_3_plus ?? 0,
        },
        { onConflict: "user_id" }
      );
      if (error) return jsonError(error.message, 400);
      return jsonOk({ success: true });
    }

    // LIST USERS
    if (action === "list") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers();
      if (error) return jsonError(error.message, 400);
      const { data: allRoles } = await adminClient.from("user_roles").select("*");
      const { data: allProfiles } = await adminClient.from("profiles").select("*");
      const { data: allConfigs } = await adminClient.from("collaborateur_config").select("*");

      const result = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        displayName: allProfiles?.find((p: any) => p.user_id === u.id)?.display_name || u.email,
        roles: allRoles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) || [],
        config: allConfigs?.find((c: any) => c.user_id === u.id) || null,
        createdAt: u.created_at,
      }));

      return jsonOk({ users: result });
    }

    // CREATE USER (default)
    const { email, password, displayName } = body;
    if (!email || !password) return jsonError("Email et mot de passe requis", 400);

    const { data, error } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName || email },
    });
    if (error) return jsonError(error.message, 400);

    return jsonOk({ user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    return jsonError(err.message, 500);
  }
});

function jsonOk(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const corsHeaders = undefined as any; // redeclared above, this line removed
