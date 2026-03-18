import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("create-user", {
      body: { email, password, displayName },
    });

    if (res.error) {
      toast.error(res.error.message || "Erreur lors de la création");
    } else if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`Utilisateur ${email} créé avec succès`);
      setEmail("");
      setPassword("");
      setDisplayName("");
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="max-w-lg">
        <h2 className="font-sora text-lg font-bold text-foreground mb-6">Gestion des utilisateurs</h2>
        <div className="bg-card rounded-lg shadow-soft p-6">
          <h3 className="font-sora text-sm font-semibold text-foreground mb-4">Créer un nouvel utilisateur</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nom d'affichage</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Prénom Nom"
                className="h-10 text-sm"
              />
            </div>
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
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
              {loading ? "Création…" : "Créer l'utilisateur"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4">
            L'utilisateur pourra se connecter immédiatement avec ses identifiants.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
