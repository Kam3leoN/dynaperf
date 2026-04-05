import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserPresenceRow } from "@/lib/presence";
import { primaryRoleFromRoles, PRIMARY_ROLE_ORDER, type PrimaryRole } from "@/lib/memberDirectory";

export interface DirectoryMember {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  roles: string[];
  primaryRole: PrimaryRole;
  presence: UserPresenceRow | null;
}

function buildMembers(
  profiles: { user_id: string; display_name: string | null; avatar_url: string | null; title: string | null }[],
  roleRows: { user_id: string; role: string }[],
  presenceRows: UserPresenceRow[],
): DirectoryMember[] {
  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }
  const presenceByUser = new Map(presenceRows.map((p) => [p.user_id, p]));

  return profiles.map((p) => {
    const roles = rolesByUser.get(p.user_id) ?? [];
    return {
      userId: p.user_id,
      displayName: p.display_name?.trim() || "Utilisateur",
      avatarUrl: p.avatar_url,
      title: p.title,
      roles,
      primaryRole: primaryRoleFromRoles(roles),
      presence: presenceByUser.get(p.user_id) ?? null,
    };
  });
}

/**
 * Charge profils, rôles et présence pour l’annuaire global, avec abonnement Realtime sur user_presence.
 */
export function useDirectoryMembers(enabled: boolean) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [profilesRes, rolesRes, presenceRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, title").order("display_name", { ascending: true }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_presence").select("*"),
    ]);
    if (profilesRes.error) {
      setError(profilesRes.error.message);
      setMembers([]);
      setLoading(false);
      return;
    }
    if (rolesRes.error) {
      setError(rolesRes.error.message);
      setMembers([]);
      setLoading(false);
      return;
    }
    if (presenceRes.error) {
      setError(presenceRes.error.message);
      setMembers([]);
      setLoading(false);
      return;
    }
    const list = buildMembers(
      profilesRes.data ?? [],
      rolesRes.data ?? [],
      (presenceRes.data as UserPresenceRow[]) ?? [],
    );
    setMembers(list);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("directory-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row = payload.new as UserPresenceRow | undefined;
        if (row?.user_id) {
          setMembers((prev) =>
            prev.map((m) => (m.userId === row.user_id ? { ...m, presence: row } : m)),
          );
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);

  const bySection = useMemo(() => {
    const map = new Map<PrimaryRole, DirectoryMember[]>();
    for (const r of PRIMARY_ROLE_ORDER) {
      map.set(r, []);
    }
    for (const m of members) {
      map.get(m.primaryRole)?.push(m);
    }
    return map;
  }, [members]);

  return { members, bySection, loading, error, reload: load };
}
