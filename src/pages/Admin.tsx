import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faChevronDown, faChevronUp, faCamera, faEye } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

function ArcText({ text, radius = 78, fontSize = 13 }: { text: string; radius?: number; fontSize?: number }) {
  const id = "arcPath";
  const svgSize = radius * 2 + 40;
  const cx = svgSize / 2;
  return (
    <svg width={svgSize} height={radius + fontSize + 10} viewBox={`0 0 ${svgSize} ${radius + fontSize + 10}`} className="overflow-visible" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
      <defs>
        <path id={id} d={`M ${cx - radius},${radius + fontSize} A ${radius},${radius} 0 0,1 ${cx + radius},${radius + fontSize}`} fill="none" />
      </defs>
      <text
        fill="hsl(var(--primary))"
        fontSize={fontSize}
        fontWeight="800"
        letterSpacing="0.18em"
        textAnchor="middle"
        fontFamily="Lexend, sans-serif"
      >
        <textPath href={`#${id}`} startOffset="50%">{text}</textPath>
      </text>
    </svg>
  );
}

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
  avatarUrl: string | null;
  title: string | null;
  roles: string[];
  config: UserConfig | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  redacteur: "Rédacteur",
  lecteur: "Lecteur",
};

function getUserRole(u: ManagedUser) {
  if (u.roles.includes("super_admin")) return "super_admin";
  if (u.roles.includes("admin")) return "admin";
  if (u.roles.includes("redacteur")) return "redacteur";
  return "lecteur";
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    super_admin: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
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

function UserAvatar({ url, name, size = "sm" }: { url: string | null; name: string; size?: "sm" | "md" }) {
  const px = size === "md" ? 48 : 32;
  const textCls = size === "md" ? "text-lg" : "text-xs";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={px}
        height={px}
        style={{ width: px, height: px, minWidth: px, minHeight: px }}
        className={`rounded-full object-cover border border-border shrink-0 ${textCls}`}
      />
    );
  }
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      className={`rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center border border-border shrink-0 ${textCls}`}
    >
      {initials}
    </div>
  );
}

// Split displayName into parts and match each search term
function matchesSearch(displayName: string, email: string, searchPrenom: string, searchNom: string) {
  const parts = displayName.toLowerCase().split(/\s+/);
  const prenom = searchPrenom.toLowerCase().trim();
  const nom = searchNom.toLowerCase().trim();

  if (!prenom && !nom) return true;

  // If only one field filled, match against any part or email
  if (prenom && !nom) {
    return parts.some(p => p.includes(prenom)) || email.toLowerCase().includes(prenom);
  }
  if (!prenom && nom) {
    return parts.some(p => p.includes(nom)) || email.toLowerCase().includes(nom);
  }

  // Both filled: prenom matches first part, nom matches last part (or vice versa)
  const matchPrenom = parts.some(p => p.includes(prenom));
  const matchNom = parts.some(p => p.includes(nom));
  return matchPrenom && matchNom;
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchPrenom, setSearchPrenom] = useState("");
  const [searchNom, setSearchNom] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("lecteur");
  const [editPalier1, setEditPalier1] = useState("");
  const [editPalier2, setEditPalier2] = useState("");
  const [editPalier3, setEditPalier3] = useState("");
  const [editPrime1, setEditPrime1] = useState("0");
  const [editPrime2, setEditPrime2] = useState("0");
  const [editPrime3, setEditPrime3] = useState("0");
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("lecteur");
  const [newPalier1, setNewPalier1] = useState("");
  const [newPalier2, setNewPalier2] = useState("");
  const [newPalier3, setNewPalier3] = useState("");
  const [newPrime1, setNewPrime1] = useState("0");
  const [newPrime2, setNewPrime2] = useState("0");
  const [newPrime3, setNewPrime3] = useState("0");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  const resetCreateForm = () => {
    setEmail(""); setPassword(""); setNewFirstName(""); setNewLastName("");
    setNewRole("lecteur");
    setNewPalier1(""); setNewPalier2(""); setNewPalier3("");
    setNewPrime1("0"); setNewPrime2("0"); setNewPrime3("0");
    setAvatarFile(null); setAvatarPreview(null);
  };

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { console.error("Avatar upload error:", error); return null; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setCreating(true);

    const config = {
      objectif: 0,
      palier_1: newPalier1 ? parseInt(newPalier1) : null,
      palier_2: newPalier2 ? parseInt(newPalier2) : null,
      palier_3: newPalier3 ? parseInt(newPalier3) : null,
      prime_audit_1: parseFloat(newPrime1) || 0,
      prime_audit_2: parseFloat(newPrime2) || 0,
      prime_audit_3_plus: parseFloat(newPrime3) || 0,
    };

    const displayName = `${newFirstName.trim()} ${newLastName.trim().toUpperCase()}`.trim();
    const res = await supabase.functions.invoke("create-user", {
      body: { email, password, displayName, role: newRole, config },
    });

    if (res.error) toast.error(res.error.message || "Erreur lors de la création");
    else if (res.data?.error) toast.error(res.data.error);
    else {
      // Upload avatar if provided
      if (avatarFile && res.data?.user?.id) {
        const avatarUrl = await uploadAvatar(res.data.user.id, avatarFile);
        if (avatarUrl) {
          await supabase.functions.invoke("create-user", {
            body: { action: "save-avatar", userId: res.data.user.id, avatar_url: avatarUrl },
          });
        }
      }
      toast.success(`Utilisateur ${email} créé avec succès`);
      resetCreateForm();
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

  const handleAvatarChange = async (userId: string, file: File) => {
    const avatarUrl = await uploadAvatar(userId, file);
    if (avatarUrl) {
      await supabase.functions.invoke("create-user", {
        body: { action: "save-avatar", userId, avatar_url: avatarUrl },
      });
      toast.success("Avatar mis à jour");
      loadUsers();
    } else {
      toast.error("Erreur lors de l'upload de l'avatar");
    }
  };

  const openEditDialog = (u: ManagedUser) => {
    setEditUser(u);
    const parts = u.displayName.split(" ");
    const lastName = parts.filter(p => p === p.toUpperCase() && p.length > 1).join(" ") || parts.slice(-1).join("");
    const firstName = parts.filter(p => !(p === p.toUpperCase() && p.length > 1)).join(" ") || "";
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditEmail(u.email);
    setEditRole(getUserRole(u));
    setEditPalier1(u.config?.palier_1?.toString() ?? "");
    setEditPalier2(u.config?.palier_2?.toString() ?? "");
    setEditPalier3(u.config?.palier_3?.toString() ?? "");
    setEditPrime1((u.config?.prime_audit_1 ?? 0).toString());
    setEditPrime2((u.config?.prime_audit_2 ?? 0).toString());
    setEditPrime3((u.config?.prime_audit_3_plus ?? 0).toString());
    setEditTitle(u.title || "");
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const role = getUserRole(editUser);

    // Update name & email
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "update-user", userId: editUser.id, email: editEmail.trim(), displayName: `${editFirstName.trim()} ${editLastName.trim().toUpperCase()}`.trim(), title: editTitle.trim() },
    });
    if (res.data?.error) { toast.error(res.data.error); setEditSaving(false); return; }

    // Update role if changed and not admin
    if (editRole !== role) {
      await supabase.functions.invoke("create-user", {
        body: { action: "set-role", userId: editUser.id, role: editRole },
      });
    }

    // Update config
    await supabase.functions.invoke("create-user", {
      body: {
        action: "save-config",
        userId: editUser.id,
        objectif: editUser.config?.objectif ?? 0,
        palier_1: editPalier1 ? parseInt(editPalier1) : null,
        palier_2: editPalier2 ? parseInt(editPalier2) : null,
        palier_3: editPalier3 ? parseInt(editPalier3) : null,
        prime_audit_1: parseFloat(editPrime1) || 0,
        prime_audit_2: parseFloat(editPrime2) || 0,
        prime_audit_3_plus: parseFloat(editPrime3) || 0,
      },
    });

    toast.success("Utilisateur mis à jour");
    setEditUser(null);
    loadUsers();
    setEditSaving(false);
  };

  const currentUserRole = users.find(u => u.id === currentUser?.id);
  const isSuperAdmin = currentUserRole ? getUserRole(currentUserRole) === "super_admin" : false;
  const filtered = users.filter((u) => matchesSearch(u.displayName, u.email, searchPrenom, searchNom));

  const MobileCard = ({ u }: { u: ManagedUser }) => {
    const role = getUserRole(u);
    const isAdminOrAbove = role === "admin" || role === "super_admin";
    const isSuperAdminUser = role === "super_admin";
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
          <div className="flex items-center gap-2 min-w-0">
            <AvatarWithUpload user={u} onUpload={handleAvatarChange} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{u.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setViewUser(u)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Voir">
              <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => openEditDialog(u)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Modifier">
              <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {u.id !== currentUser?.id && !(isSuperAdminUser && !isSuperAdmin) && (
              <button onClick={() => handleDelete(u.id, u.email)} className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors" title="Supprimer">
                <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={role} />
          {!isAdminOrAbove && (
            <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
              <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lecteur">Lecteur</SelectItem>
                <SelectItem value="redacteur">Rédacteur</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
              </SelectContent>
            </Select>
          )}
        </div>
        {isExpanded && (
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
            <div className="flex gap-1.5">
              <Input
                placeholder="Prénom"
                value={searchPrenom}
                onChange={(e) => setSearchPrenom(e.target.value)}
                className="w-24 sm:w-[120px] h-9 text-sm rounded-md"
              />
              <Input
                placeholder="Nom"
                value={searchNom}
                onChange={(e) => setSearchNom(e.target.value)}
                className="w-24 sm:w-[120px] h-9 text-sm rounded-md"
              />
            </div>
            <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
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
                  {/* Avatar upload */}
                  <div className="flex justify-center">
                    <label className="relative cursor-pointer group">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-border group-hover:opacity-75 transition-opacity" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary transition-colors">
                          <FontAwesomeIcon icon={faCamera} className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarSelect(e.target.files[0])} />
                      <span className="text-[10px] text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">Avatar</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Prénom</label>
                      <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Prénom" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
                      <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Nom" className="h-9 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" className="h-9 text-sm" required />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Mot de passe</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-9 text-sm" required minLength={6} />
                  </div>

                  {/* Rôle */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Rôle</label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lecteur">Lecteur</SelectItem>
                        <SelectItem value="redacteur">Rédacteur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Objectifs paliers */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Objectifs par palier</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Obj. palier 1</span>
                        <Input type="number" min={0} value={newPalier1} onChange={(e) => setNewPalier1(e.target.value)} className="h-9 text-sm" placeholder="—" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Obj. palier 2</span>
                        <Input type="number" min={0} value={newPalier2} onChange={(e) => setNewPalier2(e.target.value)} className="h-9 text-sm" placeholder="—" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Obj. palier 3</span>
                        <Input type="number" min={0} value={newPalier3} onChange={(e) => setNewPalier3(e.target.value)} className="h-9 text-sm" placeholder="—" />
                      </div>
                    </div>
                  </div>

                  {/* Primes */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Primes par palier (€)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Prime palier 1</span>
                        <Input type="number" min={0} step={0.01} value={newPrime1} onChange={(e) => setNewPrime1(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Prime palier 2</span>
                        <Input type="number" min={0} step={0.01} value={newPrime2} onChange={(e) => setNewPrime2(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Prime palier 3</span>
                        <Input type="number" min={0} step={0.01} value={newPrime3} onChange={(e) => setNewPrime3(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="rounded-md">Annuler</Button>
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
                    <TableHead className="text-xs uppercase tracking-wider w-10"></TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Nom</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Rôle</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Paliers</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Primes (1/2/3)</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((u) => {
                      const role = getUserRole(u);
                      const isAdminOrAbove = role === "admin" || role === "super_admin";
                      const isSuperAdminUser = role === "super_admin";
                      const isExpanded = expandedUser === u.id;
                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border hover:bg-secondary/50 transition-colors"
                        >
                          <TableCell>
                            <AvatarWithUpload user={u} onUpload={handleAvatarChange} />
                          </TableCell>
                          <TableCell className="text-sm font-medium">{u.displayName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            {isAdminOrAbove && !isSuperAdmin ? (
                              <RoleBadge role={role} />
                            ) : isSuperAdminUser ? (
                              <RoleBadge role={role} />
                            ) : (
                              <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lecteur">Lecteur</SelectItem>
                                  <SelectItem value="redacteur">Rédacteur</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {u.config ? `${u.config.palier_1 ?? "—"} / ${u.config.palier_2 ?? "—"} / ${u.config.palier_3 ?? "—"}` : "—"}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums text-muted-foreground">
                            {u.config ? `${u.config.prime_audit_1}€ / ${u.config.prime_audit_2}€ / ${u.config.prime_audit_3_plus}€` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setViewUser(u)}
                                className="p-1.5 rounded-sm hover:bg-secondary transition-colors"
                                title="Voir"
                              >
                                <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => openEditDialog(u)}
                                className="p-1.5 rounded-sm hover:bg-secondary transition-colors"
                                title="Modifier"
                              >
                                <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              {u.id !== currentUser?.id && !(isSuperAdminUser && !isSuperAdmin) && (
                                <button
                                  onClick={() => handleDelete(u.id, u.email)}
                                  className="p-1.5 rounded-sm hover:bg-primary/10 transition-colors"
                                  title="Supprimer"
                                >
                                  <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5 text-primary" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>

              {expandedUser && (() => {
                const u = users.find((x) => x.id === expandedUser);
                if (!u) return null;
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

      {/* View user dialog */}
      <Dialog open={!!viewUser} onOpenChange={(o) => { if (!o) setViewUser(null); }}>
        <DialogContent className="sm:max-w-md pt-20 [&>button]:hidden" style={{ overflow: 'visible' }}>
          {viewUser && (
            <>
              <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <div className="relative">
                  {viewUser.avatarUrl ? (
                    <img src={viewUser.avatarUrl} alt={viewUser.displayName} className="w-32 h-32 rounded-full object-cover border-4 border-background" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center border-4 border-background">
                      {viewUser.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none">
                    <ArcText text={(viewUser.title || ROLE_LABELS[getUserRole(viewUser)] || getUserRole(viewUser)).toUpperCase()} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewUser(null)}
                className="absolute -right-3 -top-3 w-8 h-8 rounded-full flex items-center justify-center z-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#ee4540" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </>
          )}
          <DialogHeader className="text-center">
            <DialogTitle className="sr-only">Détails</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center w-full">Informations et configuration de {viewUser?.displayName}</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{viewUser.displayName}</p>
                <p className="text-xs text-muted-foreground">{viewUser.email}</p>
                <div className="mt-1"><RoleBadge role={getUserRole(viewUser)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Objectif</span>
                  <span className="font-medium text-foreground">{viewUser.config?.objectif ?? "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Créé le</span>
                  <span className="font-medium text-foreground">{new Date(viewUser.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Paliers</span>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="bg-secondary px-2 py-1 rounded text-foreground text-center">P1: {viewUser.config?.palier_1 ?? "—"}</span>
                  <span className="bg-secondary px-2 py-1 rounded text-foreground text-center">P2: {viewUser.config?.palier_2 ?? "—"}</span>
                  <span className="bg-secondary px-2 py-1 rounded text-foreground text-center">P3: {viewUser.config?.palier_3 ?? "—"}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Primes</span>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="bg-secondary px-2 py-1 rounded text-foreground text-center">{viewUser.config?.prime_audit_1 ?? 0}€</span>
                  <span className="bg-secondary px-2 py-1 rounded text-foreground text-center">{viewUser.config?.prime_audit_2 ?? 0}€</span>
                  <span className="bg-secondary px-2 py-1 rounded text-foreground text-center">{viewUser.config?.prime_audit_3_plus ?? 0}€</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] pt-20 [&>button]:hidden" style={{ overflow: 'visible' }}>
          {editUser && (
            <>
              <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('edit-avatar-input')?.click()}>
                  {editUser.avatarUrl ? (
                    <img src={editUser.avatarUrl} alt={editUser.displayName} className="w-32 h-32 rounded-full object-cover border-4 border-background" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-primary/10 text-primary font-bold text-3xl flex items-center justify-center border-4 border-background">
                      {editUser.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FontAwesomeIcon icon={faCamera} className="h-5 w-5 text-white" />
                  </div>
                  <input id="edit-avatar-input" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      await handleAvatarChange(editUser.id, e.target.files[0]);
                      loadUsers();
                    }
                  }} />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none">
                    <ArcText text={(editTitle || ROLE_LABELS[getUserRole(editUser)] || getUserRole(editUser)).toUpperCase()} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="absolute -right-3 -top-3 w-8 h-8 rounded-full flex items-center justify-center z-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#ee4540" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </>
          )}
          <DialogHeader className="text-center">
            <DialogTitle className="sr-only">Modifier</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center w-full">Informations et configuration de {editUser?.displayName}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Prénom</label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-9 text-sm" placeholder="Prénom" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nom</label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-9 text-sm" placeholder="NOM" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-9 text-sm" />
              </div>

              {/* Titre arc */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Titre (au-dessus de l'avatar)</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9 text-sm" placeholder={ROLE_LABELS[getUserRole(editUser)] ?? getUserRole(editUser)} />
              </div>

              {/* Rôle */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Rôle</label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecteur">Lecteur</SelectItem>
                    <SelectItem value="redacteur">Rédacteur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Objectifs paliers */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Objectifs par palier</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Palier 1</span>
                    <Input type="number" min={0} value={editPalier1} onChange={(e) => setEditPalier1(e.target.value)} className="h-9 text-sm" placeholder="—" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Palier 2</span>
                    <Input type="number" min={0} value={editPalier2} onChange={(e) => setEditPalier2(e.target.value)} className="h-9 text-sm" placeholder="—" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Palier 3</span>
                    <Input type="number" min={0} value={editPalier3} onChange={(e) => setEditPalier3(e.target.value)} className="h-9 text-sm" placeholder="—" />
                  </div>
                </div>
              </div>

              {/* Primes */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Primes par palier (€)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Prime P1</span>
                    <Input type="number" min={0} step={0.01} value={editPrime1} onChange={(e) => setEditPrime1(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Prime P2</span>
                    <Input type="number" min={0} step={0.01} value={editPrime2} onChange={(e) => setEditPrime2(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Prime P3</span>
                    <Input type="number" min={0} step={0.01} value={editPrime3} onChange={(e) => setEditPrime3(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditUser(null)} className="rounded-md">Annuler</Button>
                <Button size="sm" disabled={editSaving} onClick={handleEditSave} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md gap-1.5">
                  <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

/* ─── Avatar with upload on click ─── */

function AvatarWithUpload({ user, onUpload }: { user: ManagedUser; onUpload: (userId: string, file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
      <UserAvatar url={user.avatarUrl} name={user.displayName} />
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <FontAwesomeIcon icon={faCamera} className="h-3 w-3 text-white" />
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUpload(user.id, e.target.files[0]); }} />
    </div>
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
