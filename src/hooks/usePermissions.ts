import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MyPermissionRow = { permission_key: string; allowed: boolean };

/**
 * Charge les permissions effectives via RPC `get_my_permissions` (defaults rôle + overrides).
 */
export function usePermissions(userId: string | undefined, authLoading: boolean) {
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    if (!userId) {
      setAllowedKeys(new Set());
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    (async () => {
      const { data, error } = await supabase.rpc("get_my_permissions");
      if (cancelled) return;
      if (error) {
        setAllowedKeys(new Set());
        setLoading(false);
        return;
      }
      const next = new Set<string>();
      for (const row of (data ?? []) as MyPermissionRow[]) {
        if (row.allowed) next.add(row.permission_key);
      }
      setAllowedKeys(next);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const hasPermission = useCallback((key: string) => allowedKeys.has(key), [allowedKeys]);

  return { hasPermission, loading, allowedKeys };
}
