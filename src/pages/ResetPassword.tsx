import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWaveSquare, faKey } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast.error("Lien de réinitialisation invalide");
      navigate("/auth");
    }
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4">
      <div className="bg-card rounded-lg shadow-soft p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <FontAwesomeIcon icon={faWaveSquare} className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Nouveau mot de passe</h1>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nouveau mot de passe</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 text-sm"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <FontAwesomeIcon icon={faKey} className="h-4 w-4" />
            {loading ? "Mise à jour…" : "Mettre à jour"}
          </Button>
        </form>
      </div>
    </div>
  );
}
