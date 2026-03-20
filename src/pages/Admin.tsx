import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faTrash, faUsers, faUserPen } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  createdAt: string;
}

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "list" },
    });
    if (res.data?.users) {
      setUsers(res.data.users);
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
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
      loadUsers();
    }
    setLoading(false);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Supprimer l'utilisateur ${userEmail} ?`)) return;
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "delete", userId },
    });
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success("Utilisateur supprimé");
      loadUsers();
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "set-role", userId, role },
    });
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success("Rôle mis à jour");
      loadUsers();
    }
  };

  const getUserRole = (u: ManagedUser) => {
    if (u.roles.includes("admin")) return "admin";
    if (u.roles.includes("redacteur")) return "redacteur";
    if (u.roles.includes("lecteur")) return "lecteur";
    return "lecteur";
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: "bg-primary/10 text-primary",
      redacteur: "bg-accent/20 text-accent-foreground",
      lecteur: "bg-secondary text-muted-foreground",
    };
    const labels: Record<string, string> = {
      admin: "Admin",
      redacteur: "Rédacteur",
      lecteur: "Lecteur",
    };
    return (
      <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${map[role] || map.lecteur}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-3xl">
        <h2 className="text-lg font-bold text-foreground mb-6">Gestion des utilisateurs</h2>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="gap-2 text-xs sm:text-sm">
              <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2 text-xs sm:text-sm">
              <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
              Nouveau compte
            </TabsTrigger>
          </TabsList>

          {/* User list */}
          <TabsContent value="list">
            <div className="bg-card rounded-lg shadow-soft p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Comptes existants</h3>
              {usersLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => {
                    const role = getUserRole(u);
                    const isAdmin = role === "admin";
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 flex-wrap sm:flex-nowrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {roleBadge(role)}
                        {!isAdmin && (
                          <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lecteur">Lecteur</SelectItem>
                              <SelectItem value="redacteur">Rédacteur</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {!isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id, u.email)}>
                            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Create user */}
          <TabsContent value="create">
            <div className="bg-card rounded-lg shadow-soft p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Créer un nouvel utilisateur</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nom d'affichage</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Prénom Nom" className="h-10 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" className="h-10 text-sm" required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Mot de passe</label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10 text-sm" required minLength={6} />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
                  {loading ? "Création…" : "Créer l'utilisateur"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4">
                L'utilisateur pourra se connecter immédiatement. Rôle par défaut : Lecteur.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
