import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faSort, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface UserConfig {
  objectif: number;
  palier_1: number | null;
  palier_2: number | null;
  palier_3: number | null;
  prime_audit_1: number;
  prime_audit_2: number;
  prime_audit_3_plus: number;
}

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  config: UserConfig | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  redacteur: "Rédacteur",
  lecteur: "Lecteur",
};

function getUserRole(u: ManagedUser) {
  if (u.roles.includes("admin")) return "admin";
  if (u.roles.includes("redacteur")) return "redacteur";
  return "lecteur";
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-primary/10 text-primary",
    redacteur: "bg-accent/20 text-accent-foreground",
    lecteur: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${styles[role] || styles.lecteur}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default function Admin() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "list" },
    });
    if (res.data?.users) setUsers(res.data.users);
    setUsersLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setCreating(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { email, password, displayName },
    });
    if (res.error) toast.error(res.error.message || "Erreur lors de la création");
    else if (res.data?.error) toast.error(res.data.error);
    else {
      toast.success(`Utilisateur ${email} créé avec succès`);
      setEmail(""); setPassword(""); setDisplayName("");
      setCreateOpen(false);
      loadUsers();
    }
    setCreating(false);
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Supprimer l'utilisateur ${userEmail} ?`)) return;
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "delete", userId },
    });
    if (res.data?.error) toast.error(res.data.error);
    else { toast.success("Utilisateur supprimé"); loadUsers(); }
  };

  const handleSetRole = async (userId: string, role: string) => {
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "set-role", userId, role },
    });
    if (res.data?.error) toast.error(res.data.error);
    else { toast.success("Rôle mis à jour"); loadUsers(); }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.displayName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
  });

  const MobileCard = ({ u }: { u: ManagedUser }) => {
    const role = getUserRole(u);
    const isAdmin = role === "admin";
    const isExpanded = expandedUser === u.id;
    return (
      <motion.div
        key={u.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="bg-card border border-border rounded-lg p-3 space-y-2"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{u.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {!isAdmin && (
              <>
                <button onClick={() => setExpandedUser(isExpanded ? null : u.id)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors">
                  <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(u.id, u.email)} className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors">
                  <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={role} />
          {!isAdmin && (
            <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
              <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lecteur">Lecteur</SelectItem>
                <SelectItem value="redacteur">Rédacteur</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        {isExpanded && !isAdmin && (
          <UserConfigPanel userId={u.id} config={u.config} onSaved={loadUsers} />
        )}
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="bg-card rounded-lg shadow-soft p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-foreground">Gestion des collaborateurs</h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-[200px] h-9 text-sm rounded-md"
            />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5 shrink-0">
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvel utilisateur</DialogTitle>
                  <DialogDescription>
                    Créez un collaborateur puis attribuez-lui son rôle, ses objectifs et ses primes.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="grid gap-3 py-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nom d'affichage</label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Prénom Nom" className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" className="h-9 text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Mot de passe</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" required minLength={6} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="rounded-md">Annuler</Button>
                    <Button type="submit" size="sm" disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                      {creating ? "Création…" : "Créer"}
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-muted-foreground">
                  L'utilisateur pourra se connecter immédiatement. Rôle par défaut : Lecteur.
                </p>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {usersLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs uppercase tracking-wider">Nom</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Rôle</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Objectif</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Primes (1/2/3+)</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((u) => {
                      const role = getUserRole(u);
                      const isAdmin = role === "admin";
                      const isExpanded = expandedUser === u.id;
                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border hover:bg-secondary/50 transition-colors"
                        >
                          <TableCell className="text-sm font-medium">{u.displayName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <RoleBadge role={role} />
                            ) : (
                              <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lecteur">Lecteur</SelectItem>
                                  <SelectItem value="redacteur">Rédacteur</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {u.config?.objectif ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {u.config ? `${u.config.prime_audit_1}€ / ${u.config.prime_audit_2}€ / ${u.config.prime_audit_3_plus}€` : "—"}
                          </TableCell>
                          <TableCell>
                            {!isAdmin && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                  className="p-1.5 rounded-sm hover:bg-secondary transition-colors"
                                  title="Objectifs & Primes"
                                >
                                  <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => handleDelete(u.id, u.email)}
                                  className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors"
                                >
                                  <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
                                </button>
                              </div>
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {/* Expanded config panel below the table for the selected user */}
              {expandedUser && (() => {
                const u = users.find((x) => x.id === expandedUser);
                if (!u || getUserRole(u) === "admin") return null;
                return (
                  <div className="mt-2 rounded-lg border border-border overflow-hidden">
                    <div className="bg-secondary/30 px-4 py-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">Configuration de {u.displayName}</span>
                      <button onClick={() => setExpandedUser(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                        Fermer
                      </button>
                    </div>
                    <UserConfigPanel userId={u.id} config={u.config} onSaved={loadUsers} />
                  </div>
                );
              })()}
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              <AnimatePresence>
                {filtered.map((u) => (
                  <MobileCard key={u.id} u={u} />
                ))}
              </AnimatePresence>
            </div>

            <p className="text-xs text-muted-foreground mt-3 tabular-nums">
              {filtered.length} collaborateur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}

/* ─── Inline sub-component for user config (objectives + primes) ─── */

function UserConfigPanel({
  userId,
  config,
  onSaved,
}: {
  userId: string;
  config: UserConfig | null;
  onSaved: () => void;
}) {
  const [objectif, setObjectif] = useState(config?.objectif ?? 0);
  const [palier1, setPalier1] = useState<string>(config?.palier_1?.toString() ?? "");
  const [palier2, setPalier2] = useState<string>(config?.palier_2?.toString() ?? "");
  const [palier3, setPalier3] = useState<string>(config?.palier_3?.toString() ?? "");
  const [prime1, setPrime1] = useState(config?.prime_audit_1 ?? 0);
  const [prime2, setPrime2] = useState(config?.prime_audit_2 ?? 0);
  const [prime3, setPrime3] = useState(config?.prime_audit_3_plus ?? 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await supabase.functions.invoke("create-user", {
      body: {
        action: "save-config",
        userId,
        objectif,
        palier_1: palier1 ? parseInt(palier1) : null,
        palier_2: palier2 ? parseInt(palier2) : null,
        palier_3: palier3 ? parseInt(palier3) : null,
        prime_audit_1: prime1,
        prime_audit_2: prime2,
        prime_audit_3_plus: prime3,
      },
    });
    if (res.data?.error) toast.error(res.data.error);
    else { toast.success("Configuration enregistrée"); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="border-t border-border p-4 space-y-4 bg-card/50">
      <div>
        <label className="text-xs font-semibold text-foreground block mb-2">Objectif global</label>
        <Input
          type="number" min={0} value={objectif}
          onChange={(e) => setObjectif(parseInt(e.target.value) || 0)}
          className="h-9 text-sm w-32"
          placeholder="0"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground block mb-2">Paliers (optionnels)</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Palier 1</span>
            <Input type="number" min={0} value={palier1} onChange={(e) => setPalier1(e.target.value)} className="h-9 text-sm" placeholder="—" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Palier 2</span>
            <Input type="number" min={0} value={palier2} onChange={(e) => setPalier2(e.target.value)} className="h-9 text-sm" placeholder="—" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Palier 3</span>
            <Input type="number" min={0} value={palier3} onChange={(e) => setPalier3(e.target.value)} className="h-9 text-sm" placeholder="—" />
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground block mb-2">Primes par audit (€)</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">1er audit</span>
            <Input type="number" min={0} step={0.01} value={prime1} onChange={(e) => setPrime1(parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">2e audit</span>
            <Input type="number" min={0} step={0.01} value={prime2} onChange={(e) => setPrime2(parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">3e et suivants</span>
            <Input type="number" min={0} step={0.01} value={prime3} onChange={(e) => setPrime3(parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
          </div>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2 h-9 text-sm">
        <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}
