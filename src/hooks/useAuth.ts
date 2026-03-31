import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
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

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applySession = (session: Session | null) => {
      if (!mounted) return;
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
        await (supabase.auth as any)._removeSession?.();
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
    await supabase.auth.stopAutoRefresh().catch(() => undefined);
    await (supabase.auth as any)._removeSession?.();
    setUser(null);
    setLoading(false);
  };

  const value = useMemo(() => ({ user, loading, signOut }), [user, loading]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
