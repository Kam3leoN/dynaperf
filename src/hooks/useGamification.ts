import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalPermissionGate } from "@/contexts/PermissionsContext";
import { useAuth } from "./useAuth";

export interface Badge {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_audits: number;
  total_suivis: number;
  total_messages_sent: number;
  level: number;
  xp: number;
}

export interface EarnedBadge extends Badge {
  earned_at: string;
}

export function useGamification() {
  const { user } = useAuth();
  const perm = useOptionalPermissionGate();
  const gamificationOn = perm?.isModuleEnabled("gamification") ?? true;
  const permLoading = perm?.loading ?? false;

  const [streaks, setStreaks] = useState<UserStreak | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !gamificationOn) return;
    setLoading(true);

    const [streakRes, badgesRes, earnedRes] = await Promise.all([
      supabase.from("user_streaks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("badges").select("*").order("threshold"),
      supabase
        .from("user_badges")
        .select("*, badge:badges(*)")
        .eq("user_id", user.id),
    ]);

    if (streakRes.data) {
      setStreaks(streakRes.data as unknown as UserStreak);
    }
    if (badgesRes.data) {
      setAllBadges(badgesRes.data as Badge[]);
    }
    if (earnedRes.data) {
      setEarnedBadges(
        earnedRes.data.map((e: { earned_at: string; badge: Badge }) => ({
          ...e.badge,
          earned_at: e.earned_at,
        }))
      );
    }
    setLoading(false);
  }, [user, gamificationOn]);

  useEffect(() => {
    if (!user) {
      setStreaks(null);
      setEarnedBadges([]);
      setAllBadges([]);
      setNewBadge(null);
      setLoading(false);
      return;
    }
    if (permLoading) {
      setLoading(true);
      return;
    }
    if (!gamificationOn) {
      setStreaks(null);
      setEarnedBadges([]);
      setAllBadges([]);
      setNewBadge(null);
      setLoading(false);
      return;
    }
    void fetchData();
  }, [user, permLoading, gamificationOn, fetchData]);

  /** Record activity via secure server-side RPC */
  const recordActivity = useCallback(
    async (type: "audit" | "suivi" | "message", score?: number) => {
      if (!user || !gamificationOn) return;

      const { data, error } = await supabase.rpc("record_activity", {
        p_type: type,
        p_score: score ?? null,
      });

      if (error) {
        console.error("record_activity RPC error:", error);
        return;
      }

      // Check for newly earned badges
      if (data && typeof data === "object") {
        const result = data as { new_badge_ids?: string[] };
        if (result.new_badge_ids && result.new_badge_ids.length > 0) {
          // Fetch the first new badge to display
          const { data: badgeData } = await supabase
            .from("badges")
            .select("*")
            .eq("id", result.new_badge_ids[0])
            .single();
          if (badgeData) {
            setNewBadge(badgeData as Badge);
          }
        }
      }

      fetchData();
    },
    [user, gamificationOn, fetchData]
  );

  const dismissBadge = useCallback(() => setNewBadge(null), []);

  return {
    streaks,
    earnedBadges,
    allBadges,
    newBadge,
    dismissBadge,
    recordActivity,
    loading,
  };
}
