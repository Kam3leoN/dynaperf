import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faRightToBracket, faFingerprint, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  isWebAuthnSupported,
  hasStoredCredential,
  getStoredUserEmail,
  authenticateWithWebAuthn,
} from "@/services/WebAuthnService";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Vérifie si un credential biométrique est disponible au montage
  useEffect(() => {
    (async () => {
      const supported = await isWebAuthnSupported();
      const hasCredential = hasStoredCredential();
      setBiometricAvailable(supported && hasCredential);

      // Pré-remplit l'email si un credential existe
      if (hasCredential) {
        const storedEmail = getStoredUserEmail();
        if (storedEmail) setEmail(storedEmail);
      }
    })();
  }, []);

  /** Connexion classique email/mot de passe */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Connexion réussie");
    }
    setLoading(false);
  };

  /** Connexion biométrique */
  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const result = await authenticateWithWebAuthn();
      if (result.success) {
        // Récupère l'email et le mot de passe stockés pour la session Supabase
        // WebAuthn valide l'identité locale ; on utilise un token refresh ou
        // on reconnecte via la session persistante de Supabase
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          toast.success("Connexion biométrique réussie !");
        } else {
          // Pas de session active, redirige vers le login classique
          toast.info("Veuillez vous reconnecter avec votre mot de passe une première fois.");
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBiometricLoading(false);
    }
  };

  /** Mot de passe oublié */
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Entrez votre email d'abord");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de réinitialisation envoyé");
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-card rounded-lg shadow-soft p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">DynaPerf</h1>
            <p className="text-xs text-muted-foreground">Connexion</p>
          </div>
        </div>

        {/* Bouton biométrique si disponible */}
        {biometricAvailable && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full gap-3 h-14 text-base border-primary/30 hover:border-primary/60 hover:bg-primary/5"
            >
              {biometricLoading ? (
                <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <FontAwesomeIcon icon={faFingerprint} className="h-5 w-5 text-primary" />
              )}
              Se connecter avec la biométrie
            </Button>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="h-10 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mot de passe</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 text-sm"
              required
              minLength={6}
            />
          </div>

          <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">
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
