import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/withTimeout";

/**
 * Modules applicatifs visibles pour l’utilisateur courant.
 *
 * Règles (module globalement actif `app_modules.is_enabled`) :
 * 1. Si le module est désactivé globalement → personne ne l’a (surcharges ignorées côté navigation).
 * 2. Surcharge `user_module_overrides.enabled = false` → accès refusé.
 * 3. Surcharge `enabled = true` → accès autorisé (exception).
 * 4. Sans surcharge : accès selon l'état global du module (`app_modules.is_enabled`) pour tous.
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
        const [
          { data: modules, error: modErr },
          { data: overrides },
          { data: roleRows },
          { data: profile },
        ] = await withTimeout(
          Promise.all([
            (supabase as any).from("app_modules").select("module_key, is_enabled"),
            (supabase as any).from("user_module_overrides").select("module_key, enabled").eq("user_id", userId),
            supabase.from("user_roles").select("role").eq("user_id", userId),
            (supabase as any).from("profiles").select("org_titles").eq("user_id", userId).maybeSingle(),
          ]),
          18_000,
          "useAppModules.queries",
        );
        if (cancelled) return;

        if (modErr || !modules || modules.length === 0) {
          setEnabledModules(new Set<string>());
          setLoading(false);
          return;
        }

        // Legacy roles/profile conservés dans la requête pour compat, mais la règle
        // d'accès "switch unique" n'en dépend plus.
        void roleRows;
        void profile;

        const overrideMap = new Map<string, boolean>();
        for (const o of (overrides ?? []) as { module_key: string; enabled: boolean }[]) {
          overrideMap.set(o.module_key, o.enabled);
        }

        const next = new Set<string>();
        for (const m of modules as { module_key: string; is_enabled: boolean }[]) {
          const key = m.module_key;
          const override = overrideMap.get(key);

          if (override === false) continue;
          // "Forcer oui" doit primer même si le module global est désactivé.
          if (override === true) {
            next.add(key);
            continue;
          }

          if (m.is_enabled) next.add(key);
        }
        setEnabledModules(next);
      } catch (e) {
        console.warn("[useAppModules] chargement modules", e);
        setEnabledModules(new Set<string>());
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isModuleEnabled = useCallback((key: string) => enabledModules.has(key), [enabledModules]);

  return { isModuleEnabled, loading, enabledModules };
}
