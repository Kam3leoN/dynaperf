import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Charge les modules applicatifs et les surcharges utilisateur.
 * Un module est visible si :
 *  1. Il est activé globalement (app_modules.is_enabled)
 *  2. ET l'utilisateur n'a pas de surcharge `enabled = false`
 *  OU l'utilisateur a une surcharge `enabled = true` (force même si global off — admin volontaire).
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
      const [{ data: modules }, { data: overrides }] = await Promise.all([
        (supabase as any).from("app_modules").select("module_key, is_enabled"),
        (supabase as any).from("user_module_overrides").select("module_key, enabled").eq("user_id", userId),
      ]);
      if (cancelled) return;

      const overrideMap = new Map<string, boolean>();
      for (const o of (overrides ?? []) as any[]) {
        overrideMap.set(o.module_key, o.enabled);
      }

      const next = new Set<string>();
      for (const m of (modules ?? []) as any[]) {
        const override = overrideMap.get(m.module_key);
        if (override !== undefined) {
          if (override) next.add(m.module_key);
        } else if (m.is_enabled) {
          next.add(m.module_key);
        }
      }
      setEnabledModules(next);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const isModuleEnabled = useCallback(
    (key: string) => enabledModules.has(key),
    [enabledModules],
  );

  return { isModuleEnabled, loading, enabledModules };
}
