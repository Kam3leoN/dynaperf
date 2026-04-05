import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PresenceStatus, UserPresenceRow } from "@/lib/presence";
import { effectivePresence } from "@/lib/presence";
import { toast } from "sonner";

export function useMyPresence(userId: string | undefined) {
  const [row, setRow] = useState<UserPresenceRow | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setRow(null);
      return;
    }
    const { data, error } = await supabase.from("user_presence").select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      console.error("[useMyPresence] select", error);
      toast.error("Présence : impossible de charger le statut.");
      setRow(null);
      return;
    }
    if (!data) {
      const ins = await supabase
        .from("user_presence")
        .upsert({ user_id: userId, status: "invisible" as const, expires_at: null }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (ins.error) {
        console.error("[useMyPresence] upsert (init)", ins.error);
        toast.error("Présence : impossible d'initialiser le statut.");
        setRow(null);
        return;
      }
      setRow(ins.data as UserPresenceRow | null);
      return;
    }
    setRow(data as UserPresenceRow);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`presence-self-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as UserPresenceRow | undefined;
          if (n) setRow(n);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const setPresence = useCallback(
    async (status: PresenceStatus, expiresAtIso: string | null) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("user_presence")
        .upsert(
          { user_id: userId, status, expires_at: expiresAtIso },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) {
        console.error("[useMyPresence] upsert", error);
        toast.error(error.message || "Impossible de mettre à jour le statut.");
        return;
      }
      setRow(data as UserPresenceRow);
    },
    [userId],
  );

  const effective = effectivePresence(row);

  return { row, effective, setPresence, reload: load };
}
