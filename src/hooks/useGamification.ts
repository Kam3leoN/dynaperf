import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  level: number;
  xp: number;
}

export interface EarnedBadge extends Badge {
  earned_at: string;
}

const XP_PER_AUDIT = 50;
const XP_PER_SUIVI = 30;
const XP_PER_LEVEL = 200;

export function useGamification() {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<UserStreak | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
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
        earnedRes.data.map((e: any) => ({
          ...e.badge,
          earned_at: e.earned_at,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Record activity and check for new badges */
  const recordActivity = useCallback(
    async (type: "audit" | "suivi", score?: number) => {
      if (!user) return;

      const today = new Date().toISOString().slice(0, 10);

      // Upsert streak
      const { data: existing } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let streak: any;
      if (!existing) {
        const newStreak = {
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
          total_audits: type === "audit" ? 1 : 0,
          total_suivis: type === "suivi" ? 1 : 0,
          level: 1,
          xp: type === "audit" ? XP_PER_AUDIT : XP_PER_SUIVI,
        };
        const { data } = await supabase
          .from("user_streaks")
          .insert(newStreak)
          .select()
          .single();
        streak = data;
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const isConsecutive = existing.last_activity_date === yesterdayStr;
        const isSameDay = existing.last_activity_date === today;
        const newCurrentStreak = isSameDay
          ? existing.current_streak
          : isConsecutive
          ? existing.current_streak + 1
          : 1;

        const xpGain = type === "audit" ? XP_PER_AUDIT : XP_PER_SUIVI;
        const newXp = existing.xp + xpGain;
        const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;

        const updates = {
          current_streak: newCurrentStreak,
          longest_streak: Math.max(existing.longest_streak, newCurrentStreak),
          last_activity_date: today,
          total_audits: existing.total_audits + (type === "audit" ? 1 : 0),
          total_suivis: existing.total_suivis + (type === "suivi" ? 1 : 0),
          xp: newXp,
          level: newLevel,
        };

        const { data } = await supabase
          .from("user_streaks")
          .update(updates)
          .eq("user_id", user.id)
          .select()
          .single();
        streak = data;
      }

      if (!streak) return;

      // Check for new badges
      const { data: currentBadges } = await supabase
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", user.id);

      const earnedIds = new Set((currentBadges || []).map((b: any) => b.badge_id));

      const { data: allB } = await supabase.from("badges").select("*");
      if (!allB) return;

      for (const badge of allB) {
        if (earnedIds.has(badge.id)) continue;

        let earned = false;
        switch (badge.key) {
          case "first_audit": earned = streak.total_audits >= 1; break;
          case "audit_10": earned = streak.total_audits >= 10; break;
          case "audit_25": earned = streak.total_audits >= 25; break;
          case "audit_50": earned = streak.total_audits >= 50; break;
          case "audit_100": earned = streak.total_audits >= 100; break;
          case "streak_3": earned = streak.current_streak >= 3; break;
          case "streak_7": earned = streak.current_streak >= 7; break;
          case "streak_30": earned = streak.current_streak >= 30; break;
          case "perfect_10": earned = score === 10; break;
          case "suivi_5": earned = streak.total_suivis >= 5; break;
          case "suivi_20": earned = streak.total_suivis >= 20; break;
          case "level_5": earned = streak.level >= 5; break;
          case "level_10": earned = streak.level >= 10; break;
        }

        if (earned) {
          await supabase.from("user_badges").insert({
            user_id: user.id,
            badge_id: badge.id,
          });
          setNewBadge(badge as Badge);
        }
      }

      fetchData();
    },
    [user, fetchData]
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
