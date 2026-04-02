import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faRightToBracket, faFingerprint, faSpinner, faDesktop } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  isWebAuthnSupported,
  hasStoredCredential,
  getStoredUserEmail,
  authenticateWithWebAuthn,
} from "@/services/WebAuthnService";
import {
  getBiometricRefreshToken,
  markAppSessionUnlocked,
  storeBiometricRefreshToken,
  clearBiometricRefreshToken,
} from "@/services/BiometricSessionService";

/** Sanitize string input to prevent XSS */
function sanitize(value: string): string {
  return value.replace(/[<>"'&]/g, "").trim();
}

/** Log login IP via edge function (fire-and-forget) */
async function logLoginIp() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    await fetch(`https://${projectId}.supabase.co/functions/v1/log-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    // non-blocking
  }
}

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const autoTriggered = useRef(false);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    (async () => {
      const supported = await isWebAuthnSupported();
      const hasCredential = hasStoredCredential();
      const hasToken = !!getBiometricRefreshToken();
      const available = supported && hasCredential && hasToken;
      setBiometricAvailable(available);

      if (hasCredential) {
        const storedEmail = getStoredUserEmail();
        if (storedEmail) setEmail(storedEmail);
      }

      // Auto-trigger on mobile only; on desktop user clicks the button
      if (available && isMobile && !autoTriggered.current) {
        autoTriggered.current = true;
        setTimeout(() => triggerBiometricLogin(), 300);
      }
    })();
  }, []);

  const triggerBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const result = await authenticateWithWebAuthn();
      if (result.success) {
        const refreshToken = getBiometricRefreshToken();
        if (!refreshToken) {
          toast.info("Veuillez vous reconnecter avec votre mot de passe.");
          return;
        }

        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (error) {
          clearBiometricRefreshToken();
          toast.info("Session expirée. Reconnectez-vous avec votre mot de passe.");
        } else {
          markAppSessionUnlocked();
          // Rotate token
          if (data.session?.refresh_token) {
            storeBiometricRefreshToken(data.session.refresh_token);
          }
          toast.success("Connexion biométrique réussie !");
          logLoginIp();
        }
      }
    } catch (error: any) {
      if (!error.message?.includes("annulée")) {
        toast.error(error.message);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitize(email);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Adresse email invalide");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Connexion réussie");
      markAppSessionUnlocked();
      if (data.session?.refresh_token && hasStoredCredential()) {
        storeBiometricRefreshToken(data.session.refresh_token);
      }
      logLoginIp();
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const cleanEmail = sanitize(email);
    if (!cleanEmail) {
      toast.error("Entrez votre email d'abord");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de réinitialisation envoyé");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-5">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-card rounded-3xl shadow-elevated border border-border/30 p-7 sm:p-8 w-full max-w-md">
        {/* Header — Logo + DynaPerf */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-soft">
            <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight font-display">DynaPerf</h1>
        </div>

        {/* Biometric section — 4 lines only */}
        {biometricAvailable && (
          <>
            <div className="mb-4">
              <p className="text-base font-semibold text-foreground">
                {isMobile ? "Biométrie" : "Windows Hello"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isMobile
                  ? "Utilisez la biométrie pour vous connecter"
                  : "Utilisez Windows Hello (empreinte, visage ou PIN) pour vous connecter"}
              </p>
            </div>
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={triggerBiometricLogin}
                disabled={biometricLoading}
                className="w-full gap-3 h-14 text-base rounded-2xl border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                {biometricLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <FontAwesomeIcon icon={isMobile ? faFingerprint : faDesktop} className="h-5 w-5 text-primary" />
                )}
                {isMobile ? "Se connecter avec la biométrie" : "Se connecter avec Windows Hello"}
              </Button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 border-t border-border" />
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label className="m3-label-medium text-muted-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="h-12 text-sm"
              required
              maxLength={255}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="m3-label-medium text-muted-foreground mb-1.5 block">Mot de passe</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 text-sm"
              required
              minLength={6}
              maxLength={128}
              autoComplete="current-password"
            />
          </div>

          <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline font-medium">
            Mot de passe oublié ?
          </button>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4" />
            {loading ? "Chargement…" : "Se connecter"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Contactez votre administrateur pour obtenir un compte.
        </p>
      </div>
    </div>
  );
}
