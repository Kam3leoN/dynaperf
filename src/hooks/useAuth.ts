import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  clearPersistedAuthSession,
  hasAppSessionUnlocked,
  lockAppLocally,
  markAppSessionUnlocked,
  storeBiometricRefreshToken,
} from "@/services/BiometricSessionService";
import { hasStoredCredential } from "@/services/WebAuthnService";

type SupabaseAuthWithSessionRemoval = typeof supabase.auth & {
  _removeSession?: () => Promise<void>;
};

const LAST_AUTH_USER_ID_KEY = "dynaperf_last_auth_user_id_v1";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setInvisible = async (userId: string | null | undefined) => {
      if (!userId) return;
      try {
        await supabase
          .from("user_presence")
          .upsert({ user_id: userId, status: "invisible", expires_at: null }, { onConflict: "user_id" });
      } catch (e) {
        console.error("[Auth] presence invisible update failed", e);
      }
    };

    const setOnline = async (userId: string | null | undefined) => {
      if (!userId) return;
      try {
        await supabase
          .from("user_presence")
          .upsert({ user_id: userId, status: "online", expires_at: null }, { onConflict: "user_id" });
      } catch (e) {
        console.error("[Auth] presence online update failed", e);
      }
    };

    const applySession = (session: Session | null) => {
      if (!mounted) return;
      const nextUserId = session?.user?.id ?? null;
      const prevUserId = currentUserIdRef.current;
      const persistedPrevUserId = localStorage.getItem(LAST_AUTH_USER_ID_KEY);
      const previousKnownUserId = prevUserId ?? persistedPrevUserId;
      if (prevUserId !== nextUserId) {
        void (async () => {
          if (previousKnownUserId && previousKnownUserId !== nextUserId) {
            await setInvisible(previousKnownUserId);
          }
          if (nextUserId && previousKnownUserId !== nextUserId) {
            // Nouvelle session utilisateur: statut initial prioritaire = En ligne.
            await setOnline(nextUserId);
          }
        })();
      }
      currentUserIdRef.current = nextUserId;
      if (nextUserId) localStorage.setItem(LAST_AUTH_USER_ID_KEY, nextUserId);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    const syncBiometricToken = (session: Session | null) => {
      if (!session?.refresh_token || !hasStoredCredential()) return;
      storeBiometricRefreshToken(session.refresh_token);
      markAppSessionUnlocked();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncBiometricToken(session);
      applySession(session);
    });

    (async () => {
      if (hasStoredCredential() && !hasAppSessionUnlocked()) {
        await supabase.auth.stopAutoRefresh().catch(() => undefined);
        await (supabase.auth as SupabaseAuthWithSessionRemoval)._removeSession?.();
        clearPersistedAuthSession();
      }

      const { data: { session } } = await supabase.auth.getSession();
      syncBiometricToken(session);
      applySession(session);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    lockAppLocally();
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser.user) {
      localStorage.setItem(LAST_AUTH_USER_ID_KEY, authUser.user.id);
      try {
        await supabase.from("user_presence").upsert(
          { user_id: authUser.user.id, status: "invisible", expires_at: null },
          { onConflict: "user_id" },
        );
      } catch (e) {
        console.error("[Auth] signOut presence update failed", e);
      }
    }
    await supabase.auth.signOut().catch(() => undefined);
    await supabase.auth.stopAutoRefresh().catch(() => undefined);
    await (supabase.auth as SupabaseAuthWithSessionRemoval)._removeSession?.();
    currentUserIdRef.current = null;
    setUser(null);
    setLoading(false);
  };

  const value = useMemo(() => ({ user, loading, signOut }), [user, loading]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    // During HMR or initial mount race, return safe defaults instead of throwing
    return { user: null, loading: true, signOut: async () => {} } as AuthContextValue;
  }

  return context;
}
