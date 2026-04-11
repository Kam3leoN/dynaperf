import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Charge les modules applicatifs et les surcharges utilisateur.
 * Un module est visible dans l’app si :
 *  1. Il est activé globalement (`app_modules.is_enabled`) — si OFF, personne ne l’a (overrides ignorés).
 *  2. Et l’utilisateur n’a pas de surcharge `enabled = false` (refus explicite).
 * Surcharge `enabled = true` sans ligne : hérite du global (module actif).
 */
export function useAppModules(userId: string | undefined) {
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setEnabledModules(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const [{ data: modules, error: modErr }, { data: overrides }] = await Promise.all([
          (supabase as any).from("app_modules").select("module_key, is_enabled"),
          (supabase as any).from("user_module_overrides").select("module_key, enabled").eq("user_id", userId),
        ]);
        if (cancelled) return;

        // Si la table n'existe pas encore, tout est visible par défaut
        if (modErr || !modules || modules.length === 0) {
          setEnabledModules(new Set<string>());
          setLoading(false);
          return;
        }

        const overrideMap = new Map<string, boolean>();
        for (const o of (overrides ?? []) as any[]) {
          overrideMap.set(o.module_key, o.enabled);
        }

        const next = new Set<string>();
        for (const m of (modules ?? []) as any[]) {
          if (!m.is_enabled) {
            continue;
          }
          const override = overrideMap.get(m.module_key);
          if (override === false) {
            continue;
          }
          next.add(m.module_key);
        }
        setEnabledModules(next);
      } catch {
        // Fallback : tout visible si erreur
        setEnabledModules(new Set<string>());
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const isModuleEnabled = useCallback(
    // Si aucun module chargé (table absente ou vide), tout est visible par défaut
    (key: string) => enabledModules.size === 0 ? true : enabledModules.has(key),
    [enabledModules],
  );

  return { isModuleEnabled, loading, enabledModules };
}
