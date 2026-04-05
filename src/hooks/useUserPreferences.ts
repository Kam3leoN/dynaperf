import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

export interface NotifPref {
  key: string;
  label: string;
  email: boolean;
  push: boolean;
}

const defaultNotifItems: NotifPref[] = [
  { key: "auditCreated", label: "Nouvel audit créé", email: true, push: true },
  { key: "auditCompleted", label: "Audit complété", email: true, push: false },
  { key: "suiviCreated", label: "Nouveau suivi d'activité", email: false, push: true },
  { key: "weeklyDigest", label: "Résumé hebdomadaire", email: true, push: false },
  { key: "partenaireUpdates", label: "Mises à jour partenaires", email: false, push: false },
  { key: "clubUpdates", label: "Mises à jour clubs d'affaires", email: false, push: false },
  { key: "reminders", label: "Rappels", email: true, push: true },
];

export interface UserPreferences {
  notifications: NotifPref[];
  biometricEnabled: boolean;
}

const defaults: UserPreferences = {
  notifications: defaultNotifItems,
  biometricEnabled: false,
};

/**
 * Hook pour charger et sauvegarder les préférences utilisateur en base de données.
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaults);
  const [loading, setLoading] = useState(true);

  // Charge les préférences depuis la DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.preferences) {
        const stored = data.preferences as unknown as Partial<UserPreferences>;
        setPreferences({
          notifications: stored.notifications || defaults.notifications,
          biometricEnabled: stored.biometricEnabled ?? defaults.biometricEnabled,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const savePreferences = useCallback(async (prefs: UserPreferences) => {
    if (!user) return;
    setPreferences(prefs);
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_preferences")
        .update({ preferences: prefs as unknown as Json, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("user_preferences")
        .insert({ user_id: user.id, preferences: prefs as unknown as Json });
    }
  }, [user]);

  return { preferences, loading, savePreferences };
}
