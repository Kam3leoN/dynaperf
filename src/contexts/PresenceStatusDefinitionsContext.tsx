import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  type PresenceDisplayKey,
  presenceLabelFor,
  type UserPresenceRow,
} from "@/lib/presence";
import type { PresenceStatusDefinitionRow } from "@/lib/presenceStatusDefinition";
import { STATIC_PRESENCE_DEFINITIONS } from "@/data/presenceStatusStatic";

export type { PresenceStatusDefinitionRow };

interface PresenceStatusDefinitionsValue {
  rows: PresenceStatusDefinitionRow[];
  defsByKey: Partial<Record<string, PresenceStatusDefinitionRow>>;
  labelByKey: Partial<Record<PresenceDisplayKey, string>>;
  loading: boolean;
  invalidate: () => void;
  labelForRow: (presence: UserPresenceRow | null | undefined) => string;
}

const PresenceStatusDefinitionsContext = createContext<PresenceStatusDefinitionsValue | null>(null);

export function PresenceStatusDefinitionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: fetched, isLoading } = useQuery({
    queryKey: ["presence-status-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presence_status_definitions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PresenceStatusDefinitionRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
    placeholderData: STATIC_PRESENCE_DEFINITIONS,
  });

  const rows = useMemo(() => {
    if (!user) return STATIC_PRESENCE_DEFINITIONS;
    if (fetched && fetched.length > 0) return fetched;
    return STATIC_PRESENCE_DEFINITIONS;
  }, [user, fetched]);

  const defsByKey = useMemo(() => {
    const m: Partial<Record<string, PresenceStatusDefinitionRow>> = {};
    for (const r of rows) m[r.status_key] = r;
    return m;
  }, [rows]);

  const labelByKey = useMemo(() => {
    const m: Partial<Record<PresenceDisplayKey, string>> = {};
    for (const r of rows) {
      m[r.status_key as PresenceDisplayKey] = r.label_fr;
    }
    return m;
  }, [rows]);

  const labelForRow = useCallback(
    (presence: UserPresenceRow | null | undefined) => presenceLabelFor(presence, labelByKey),
    [labelByKey],
  );

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["presence-status-definitions"] });
  }, [qc]);

  const value = useMemo<PresenceStatusDefinitionsValue>(
    () => ({
      rows,
      defsByKey,
      labelByKey,
      loading: !!user && isLoading,
      invalidate,
      labelForRow,
    }),
    [rows, defsByKey, labelByKey, user, isLoading, invalidate, labelForRow],
  );

  return (
    <PresenceStatusDefinitionsContext.Provider value={value}>{children}</PresenceStatusDefinitionsContext.Provider>
  );
}

export function usePresenceStatusDefinitions(): PresenceStatusDefinitionsValue {
  const ctx = useContext(PresenceStatusDefinitionsContext);
  if (!ctx) {
    throw new Error("usePresenceStatusDefinitions doit être utilisé sous PresenceStatusDefinitionsProvider");
  }
  return ctx;
}
