import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/withTimeout";

export type MyPermissionRow = { permission_key: string; allowed: boolean };

const RPC_TIMEOUT_MS = 15_000;
const RPC_MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 600;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Charge les permissions effectives via RPC `get_my_permissions` (defaults rôle + overrides).
 * Plusieurs tentatives en cas d’échec réseau / timeout pour éviter une redirection admin intempestive.
 */
export function usePermissions(userId: string | undefined, authLoading: boolean) {
  const [allowedKeys, setAllowedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  /** True uniquement si toutes les tentatives RPC ont échoué (pas « liste vide » légitime). */
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      setFetchFailed(false);
      return () => {
        cancelled = true;
      };
    }

    if (!userId) {
      setAllowedKeys(new Set());
      setFetchFailed(false);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setFetchFailed(false);

    (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < RPC_MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const res = await withTimeout((supabase.rpc as any)("get_my_permissions"), RPC_TIMEOUT_MS, "get_my_permissions");
          if (res.error) {
            lastError = res.error;
            if (attempt < RPC_MAX_ATTEMPTS - 1) await delay(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
          if (cancelled) return;
          const next = new Set<string>();
          for (const row of (res.data ?? []) as MyPermissionRow[]) {
            if (row.allowed) next.add(row.permission_key);
          }
          setAllowedKeys(next);
          setFetchFailed(false);
          setLoading(false);
          return;
        } catch (e) {
          lastError = e;
          console.warn("[usePermissions] RPC timeout ou erreur", e);
          if (attempt < RPC_MAX_ATTEMPTS - 1) await delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
      if (cancelled) return;
      console.error("[usePermissions] get_my_permissions échoué après", RPC_MAX_ATTEMPTS, "tentatives", lastError);
      setAllowedKeys(new Set());
      setFetchFailed(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  const hasPermission = useCallback((key: string) => allowedKeys.has(key), [allowedKeys]);

  return { hasPermission, loading, allowedKeys, fetchFailed };
}
