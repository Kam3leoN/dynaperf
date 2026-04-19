import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserRoleRow {
  user_id: string;
  role: string;
}

interface ProfileRow {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  [key: string]: unknown;
}

interface CollaborateurConfigRow {
  user_id: string;
  [key: string]: unknown;
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Récupère tous les utilisateurs Auth avec pagination explicite.
 * Sans `page` / `perPage`, l’API peut recevoir des query vides et renvoyer une liste vide
 * alors que des comptes existent (comportement observé vs. listUsers({ page: 1, perPage: 200 })).
 */
async function listAllAuthUsers(adminClient: ReturnType<typeof createClient>) {
  const perPage = 200;
  const users: User[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) return { users: null as User[] | null, error };
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return { users, error: null as null };
}

function normUuidStr(s: string | undefined | null): string {
  if (typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

/**
 * Repli si `listUsers` renvoie un tableau vide côté Edge (bundle Deno / API),
 * alors que `profiles` référence bien des lignes dans auth.users (FK).
 */
async function hydrateAuthUsersFromProfiles(adminClient: ReturnType<typeof createClient>): Promise<User[]> {
  const { data: profRows, error: profErr } = await adminClient.from("profiles").select("user_id");
  if (profErr || !profRows?.length) return [];
  const ids = [
    ...new Set(
      (profRows as { user_id: string }[]).map((p) => p.user_id).filter(Boolean),
    ),
  ];
  const out: User[] = [];
  for (const uid of ids) {
    const { data, error } = await adminClient.auth.admin.getUserById(uid);
    if (!error && data?.user) out.push(data.user);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!anonKey) missing.push("SUPABASE_ANON_KEY");
    if (missing.length > 0) {
      return jsonError(
        `Secrets Edge manquants : ${missing.join(", ")}. ` +
          "Dashboard Supabase → Edge Functions → create-user → Secrets (ou redéploie le projet lié).",
        500,
      );
    }

    const authHeader = req.headers.get("Authorization")?.trim();
    if (!authHeader) {
      return jsonError("Non authentifié (en-tête Authorization manquant)", 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonError("Non authentifié", 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles").select("role")
      .eq("user_id", user.id);

    const callerIsSuperAdmin = roles?.some((r: UserRoleRow) => r.role === "super_admin");
    const callerIsAdmin = roles?.some((r: UserRoleRow) => r.role === "admin" || r.role === "super_admin");
    if (!callerIsAdmin) return jsonError("Non autorisé", 403);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("Corps JSON invalide", 400);
    }
    const { action } = body;

    // DELETE USER
    if (action === "delete") {
      const { userId } = body;
      if (!userId) return jsonError("userId requis", 400);
      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r: UserRoleRow) => r.role === "super_admin");
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
      const targetIsSuperAdmin = targetRoles?.some((r: UserRoleRow) => r.role === "super_admin");
      if (targetIsSuperAdmin && !callerIsSuperAdmin) return jsonError("Seul un super admin peut modifier le rôle d'un super admin", 403);
      const { error: delRoleErr } = await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (delRoleErr) return jsonError(delRoleErr.message, 400);
      if (role !== "none") {
        const { error: insErr } = await adminClient.from("user_roles").insert({ user_id: userId, role });
        if (insErr) return jsonError(insErr.message, 400);
      }
      return jsonOk({ success: true });
    }

    // UPDATE USER (name, email, title)
    if (action === "update-user") {
      const { userId, email, displayName, title } = body;
      if (!userId) return jsonError("userId requis", 400);

      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r: UserRoleRow) => r.role === "super_admin");
      if (targetIsSuperAdmin && !callerIsSuperAdmin) return jsonError("Seul un super admin peut modifier un super admin", 403);

      if (email) {
        const { error } = await adminClient.auth.admin.updateUserById(userId, { email });
        if (error) return jsonError(error.message, 400);
      }
      if (displayName !== undefined) {
        const { error: dnErr } = await adminClient.from("profiles").update({ display_name: displayName }).eq("user_id", userId);
        if (dnErr) return jsonError(dnErr.message, 400);
      }
      if (title !== undefined) {
        const { error: titleErr } = await adminClient.from("profiles").update({ title }).eq("user_id", userId);
        if (titleErr) return jsonError(titleErr.message, 400);
      }
      return jsonOk({ success: true });
    }

    // SAVE AVATAR (URL publique après upload Storage côté client — admin met à jour profiles)
    if (action === "save-avatar") {
      const { userId, avatar_url } = body;
      if (!userId || typeof avatar_url !== "string" || !avatar_url.trim()) {
        return jsonError("userId et avatar_url requis", 400);
      }
      const { data: targetRoles } = await adminClient.from("user_roles").select("role").eq("user_id", userId);
      const targetIsSuperAdmin = targetRoles?.some((r: UserRoleRow) => r.role === "super_admin");
      if (targetIsSuperAdmin && !callerIsSuperAdmin) {
        return jsonError("Seul un super admin peut modifier l'avatar d'un super admin", 403);
      }
      const { error } = await adminClient.from("profiles").update({ avatar_url: avatar_url.trim() }).eq("user_id", userId);
      if (error) return jsonError(error.message, 400);
      return jsonOk({ success: true });
    }

    // LIST USERS
    if (action === "list") {
      const { users: listed, error: listErr } = await listAllAuthUsers(adminClient);
      if (listErr) return jsonError(listErr.message, 400);
      if (!listed) return jsonError("Impossible de charger les utilisateurs Auth", 400);
      let authUsers = listed;
      if (authUsers.length === 0) {
        authUsers = await hydrateAuthUsersFromProfiles(adminClient);
      }
      const { data: allRoles } = await adminClient.from("user_roles").select("*");
      const { data: allProfiles } = await adminClient.from("profiles").select("*");
      const { data: allConfigs } = await adminClient.from("collaborateur_config").select("*");

      const result = authUsers.map((u: User) => {
        const uid = normUuidStr(u.id);
        const profile = (allProfiles as ProfileRow[] | null | undefined)?.find(
          (p: ProfileRow) => normUuidStr(p.user_id) === uid,
        );
        return {
          id: u.id,
          email: u.email,
          displayName: profile?.display_name || u.email,
          avatarUrl: profile?.avatar_url || null,
          title: profile?.title || null,
          roles:
            (allRoles as UserRoleRow[] | null | undefined)
              ?.filter((r: UserRoleRow) => normUuidStr(r.user_id) === uid)
              .map((r: UserRoleRow) => r.role) || [],
          config:
            (allConfigs as CollaborateurConfigRow[] | null | undefined)?.find(
              (c: CollaborateurConfigRow) => normUuidStr(c.user_id) === uid,
            ) || null,
          createdAt: u.created_at,
        };
      });
      return jsonOk({ users: result });
    }

    // CREATE USER (default action)
    const { email: newEmail, password: newPassword, displayName, role, config } = body;
    if (!newEmail || !newPassword) return jsonError("Email et mot de passe requis", 400);
    if (role === "super_admin" && !callerIsSuperAdmin) {
      return jsonError("Seul un super admin peut attribuer le rôle super admin", 403);
    }

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg || "Erreur interne", 500);
  }
});
