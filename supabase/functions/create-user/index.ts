import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonError("Non authentifié", 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles").select("role")
      .eq("user_id", user.id);

    const callerIsSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
    const callerIsAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!callerIsAdmin) return jsonError("Non autorisé", 403);

    const body = await req.json();
    const { action } = body;

    // DELETE USER
    if (action === "delete") {
      const { userId } = body;
      if (!userId) return jsonError("userId requis", 400);
      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r: any) => r.role === "super_admin");
      if (targetIsSuperAdmin && !callerIsSuperAdmin) return jsonError("Seul un super admin peut supprimer un super admin", 403);
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
      if (role === "super_admin" && !callerIsSuperAdmin) return jsonError("Seul un super admin peut attribuer ce rôle", 403);
      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r: any) => r.role === "super_admin");
      if (targetIsSuperAdmin && !callerIsSuperAdmin) return jsonError("Seul un super admin peut modifier le rôle d'un super admin", 403);
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (role !== "none") {
        const { error } = await adminClient.from("user_roles").upsert(
          { user_id: userId, role }, { onConflict: "user_id,role" }
        );
        if (error) return jsonError(error.message, 400);
      }
      return jsonOk({ success: true });
    }

    // SAVE CONFIG (objectives + primes per format)
    if (action === "save-config") {
      const { userId, objectif, palier_1, palier_2, palier_3,
        prime_audit_1, prime_audit_2, prime_audit_3_plus,
        prime_distanciel_1, prime_distanciel_2, prime_distanciel_3_plus,
        prime_club_1, prime_club_2, prime_club_3_plus,
        prime_rdv_1, prime_rdv_2, prime_rdv_3_plus,
        prime_suivi_1, prime_suivi_2, prime_suivi_3_plus,
        semaines_indisponibles } = body;
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
          prime_distanciel_1: prime_distanciel_1 ?? 0,
          prime_distanciel_2: prime_distanciel_2 ?? 0,
          prime_distanciel_3_plus: prime_distanciel_3_plus ?? 0,
          prime_club_1: prime_club_1 ?? 0,
          prime_club_2: prime_club_2 ?? 0,
          prime_club_3_plus: prime_club_3_plus ?? 0,
          prime_rdv_1: prime_rdv_1 ?? 0,
          prime_rdv_2: prime_rdv_2 ?? 0,
          prime_rdv_3_plus: prime_rdv_3_plus ?? 0,
          prime_suivi_1: prime_suivi_1 ?? 0,
          prime_suivi_2: prime_suivi_2 ?? 0,
          prime_suivi_3_plus: prime_suivi_3_plus ?? 0,
          semaines_indisponibles: semaines_indisponibles ?? 10,
        },
        { onConflict: "user_id" }
      );
      if (error) return jsonError(error.message, 400);
      return jsonOk({ success: true });
    }

    // UPDATE USER (name, email, title)
    if (action === "update-user") {
      const { userId, email, displayName, title } = body;
      if (!userId) return jsonError("userId requis", 400);

      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r: any) => r.role === "super_admin");
      if (targetIsSuperAdmin && !callerIsSuperAdmin) return jsonError("Seul un super admin peut modifier un super admin", 403);

      if (email) {
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) return jsonError(error.message, 400);
      }
      if (displayName !== undefined) {
        await adminClient.from("profiles").update({ display_name: displayName }).eq("user_id", userId);
      }
      if (title !== undefined) {
        await adminClient.from("profiles").update({ title }).eq("user_id", userId);
      }
      return jsonOk({ success: true });
    }

    // LIST USERS
    if (action === "list") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers();
      if (error) return jsonError(error.message, 400);
      const { data: allRoles } = await adminClient.from("user_roles").select("*");
      const { data: allProfiles } = await adminClient.from("profiles").select("*");
      const { data: allConfigs } = await adminClient.from("collaborateur_config").select("*");

      const result = users.map((u: any) => {
        const profile = allProfiles?.find((p: any) => p.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          displayName: profile?.display_name || u.email,
          avatarUrl: profile?.avatar_url || null,
          title: profile?.title || null,
          roles: allRoles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) || [],
          config: allConfigs?.find((c: any) => c.user_id === u.id) || null,
          createdAt: u.created_at,
        };
      });
      return jsonOk({ users: result });
    }

    // CREATE USER (default action)
    const { email: newEmail, password: newPassword, displayName, role, config } = body;
    if (!newEmail || !newPassword) return jsonError("Email et mot de passe requis", 400);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createError) return jsonError(createError.message, 400);

    if (role && role !== "none") {
      await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role });
    }
    if (config) {
      await adminClient.from("collaborateur_config").upsert({
        user_id: newUser.user.id,
        ...config,
      }, { onConflict: "user_id" });
    }

    return jsonOk({ user: newUser.user });
  } catch (err: any) {
    return jsonError(err.message || "Erreur interne", 500);
  }
});
