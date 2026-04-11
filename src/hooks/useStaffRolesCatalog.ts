import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StaffRoleCatalogRow {
  role_key: string;
  label: string;
  sort_rank: number;
  is_system: boolean;
  created_at: string;
  color_hex?: string | null;
  icon_url?: string | null;
}

/**
 * Catalogue des rôles staff (dynamique en base). Tri par `sort_rank` décroissant (rôle le plus élevé en premier).
 */
export function useStaffRolesCatalog(enabled = true) {
  const [roles, setRoles] = useState<StaffRoleCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await (supabase as any)
      .from("app_roles_catalog")
      .select("role_key, label, sort_rank, is_system, created_at, color_hex, icon_url")
      .order("sort_rank", { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setRoles([]);
    } else {
      setRoles((data ?? []) as StaffRoleCatalogRow[]);
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rolePriorityOrder = roles.map((r) => r.role_key);
  const sectionLabels = Object.fromEntries(roles.map((r) => [r.role_key, r.label])) as Record<string, string>;

  return { roles, rolePriorityOrder, sectionLabels, loading, error, reload };
}
