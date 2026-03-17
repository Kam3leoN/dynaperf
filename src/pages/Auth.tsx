import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWaveSquare, faRightToBracket, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Connexion réussie");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Vérifiez votre email pour confirmer votre inscription");
      }
    }
    setLoading(false);
  };

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
            <FontAwesomeIcon icon={faWaveSquare} className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-sora text-lg font-bold text-foreground tracking-tight">AuditPulse</h1>
            <p className="text-xs text-muted-foreground">{isLogin ? "Connexion" : "Inscription"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nom d'affichage</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom"
                className="h-10 text-sm"
                required={!isLogin}
              />
            </div>
          )}
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
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 text-sm"
              required
              minLength={6}
            />
          </div>

          {isLogin && (
            <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">
              Mot de passe oublié ?
            </button>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <FontAwesomeIcon icon={isLogin ? faRightToBracket : faUserPlus} className="h-4 w-4" />
            {loading ? "Chargement…" : isLogin ? "Se connecter" : "S'inscrire"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-4">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium ml-1 hover:underline">
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
