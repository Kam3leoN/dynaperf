import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faRightToBracket } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
