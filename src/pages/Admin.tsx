import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faChevronDown, faChevronUp, faCamera, faEye, faEyeSlash, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminSecteurs from "@/components/AdminSecteurs";
import AdminAuditGridInline from "@/components/AdminAuditGrid";

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
  prime_distanciel_1: number;
  prime_distanciel_2: number;
  prime_distanciel_3_plus: number;
  prime_club_1: number;
  prime_club_2: number;
  prime_club_3_plus: number;
  prime_rdv_1: number;
  prime_rdv_2: number;
  prime_rdv_3_plus: number;
  prime_suivi_1: number;
  prime_suivi_2: number;
  prime_suivi_3_plus: number;
  prime_mep_1: number;
  prime_mep_2: number;
  prime_mep_3_plus: number;
  prime_evenementiel_1: number;
  prime_evenementiel_2: number;
  prime_evenementiel_3_plus: number;
  semaines_indisponibles: number;
}

interface CustomPrime {
  id: string;
  user_id: string;
  label: string;
  prime_1: number;
  prime_2: number;
  prime_3_plus: number;
}

interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  roles: string[];
  config: UserConfig | null;
  customPrimes: CustomPrime[];
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
function matchesSearch(user: ManagedUser, search: string) {
  const term = search.toLowerCase().trim();
  if (!term) return true;
  const haystack = `${user.displayName} ${user.email} ${ROLE_LABELS[getUserRole(user)] || ""} ${user.title || ""}`.toLowerCase();
  return term.split(/\s+/).every(word => haystack.includes(word));
}

function normUid(s: string) {
  return s.trim().toLowerCase();
}

/**
 * Repli si la Edge Function `create-user` renvoie une liste vide (ex. listUsers sans pagination en prod)
 * alors que les lignes profiles / user_roles existent déjà.
 */
async function fetchManagedUsersViaRpc(): Promise<ManagedUser[] | null> {
  const { data: authRows, error: rpcErr } = await supabase.rpc("admin_auth_users_preview");
  if (rpcErr || !authRows?.length) return null;

  const [rolesRes, profilesRes, configsRes, primesRes] = await Promise.all([
    supabase.from("user_roles").select("*"),
    supabase.from("profiles").select("*"),
    supabase.from("collaborateur_config").select("*"),
    supabase.from("user_custom_primes").select("*").order("created_at"),
  ]);

  const allRoles = rolesRes.data;
  const allProfiles = profilesRes.data;
  const allConfigs = configsRes.data;
  const allCustomPrimes = primesRes.data;

  return authRows.map((u) => {
    const uid = normUid(u.id);
    const profile = allProfiles?.find((p) => normUid(p.user_id) === uid);
    return {
      id: u.id,
      email: u.email ?? "",
      displayName: profile?.display_name || u.email || "",
      avatarUrl: profile?.avatar_url ?? null,
      title: profile?.title ?? null,
      roles: allRoles?.filter((r) => normUid(r.user_id) === uid).map((r) => r.role) ?? [],
      config: allConfigs?.find((c) => normUid(c.user_id) === uid) ?? null,
      customPrimes: allCustomPrimes?.filter((cp) => normUid(cp.user_id) === uid) ?? [],
      createdAt: u.created_at,
    };
  });
}

function BackupButton() {
  const [loading, setLoading] = useState(false);
  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("backup-all");
      if (res.data?.success) {
        toast.success(`Sauvegarde réussie : ${res.data.file}`);
      } else {
        toast.error(res.data?.error || "Erreur de sauvegarde");
      }
    } catch {
      toast.error("Erreur de sauvegarde");
    }
    setLoading(false);
  };
  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleBackup} disabled={loading}>
      <FontAwesomeIcon icon={loading ? faSpinner : faDownload} className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Sauvegarder</span>
    </Button>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showPrimes, setShowPrimes] = useState(false);
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("lecteur");
  const [editPalier1, setEditPalier1] = useState("");
  const [editPalier2, setEditPalier2] = useState("");
  const [editPalier3, setEditPalier3] = useState("");
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "list" },
    });

    const edgeUsers = !res.error && !res.data?.error && Array.isArray(res.data?.users) ? res.data.users : null;
    let next: ManagedUser[] = [];

    if (edgeUsers && edgeUsers.length > 0) {
      next = edgeUsers;
    } else {
      const viaRpc = await fetchManagedUsersViaRpc();
      if (viaRpc?.length) {
        next = viaRpc;
      } else if (res.error) {
        toast.error(res.error.message || "Erreur chargement utilisateurs");
      } else if (res.data?.error) {
        toast.error(typeof res.data.error === "string" ? res.data.error : "Erreur chargement utilisateurs");
      }
    }

    setUsers(next);
    setUsersLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const resetCreateForm = () => {
    setEmail(""); setPassword(""); setNewFirstName(""); setNewLastName("");
    setNewRole("lecteur");
    setNewPalier1(""); setNewPalier2(""); setNewPalier3("");
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
      prime_audit_1: 75, prime_audit_2: 10, prime_audit_3_plus: 5,
      prime_distanciel_1: 10, prime_distanciel_2: 5, prime_distanciel_3_plus: 0,
      prime_club_1: 75, prime_club_2: 10, prime_club_3_plus: 5,
      prime_rdv_1: 75, prime_rdv_2: 10, prime_rdv_3_plus: 5,
      prime_suivi_1: 75, prime_suivi_2: 10, prime_suivi_3_plus: 5,
      prime_mep_1: 75, prime_mep_2: 10, prime_mep_3_plus: 5,
      prime_evenementiel_1: 75, prime_evenementiel_2: 10, prime_evenementiel_3_plus: 5,
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
        prime_audit_1: editUser.config?.prime_audit_1 ?? 75,
        prime_audit_2: editUser.config?.prime_audit_2 ?? 10,
        prime_audit_3_plus: editUser.config?.prime_audit_3_plus ?? 5,
        prime_distanciel_1: editUser.config?.prime_distanciel_1 ?? 10,
        prime_distanciel_2: editUser.config?.prime_distanciel_2 ?? 5,
        prime_distanciel_3_plus: editUser.config?.prime_distanciel_3_plus ?? 0,
        prime_club_1: editUser.config?.prime_club_1 ?? 75,
        prime_club_2: editUser.config?.prime_club_2 ?? 10,
        prime_club_3_plus: editUser.config?.prime_club_3_plus ?? 5,
        prime_rdv_1: editUser.config?.prime_rdv_1 ?? 75,
        prime_rdv_2: editUser.config?.prime_rdv_2 ?? 10,
        prime_rdv_3_plus: editUser.config?.prime_rdv_3_plus ?? 5,
        prime_suivi_1: editUser.config?.prime_suivi_1 ?? 75,
        prime_suivi_2: editUser.config?.prime_suivi_2 ?? 10,
        prime_suivi_3_plus: editUser.config?.prime_suivi_3_plus ?? 5,
        prime_mep_1: editUser.config?.prime_mep_1 ?? 75,
        prime_mep_2: editUser.config?.prime_mep_2 ?? 10,
        prime_mep_3_plus: editUser.config?.prime_mep_3_plus ?? 5,
        prime_evenementiel_1: editUser.config?.prime_evenementiel_1 ?? 75,
        prime_evenementiel_2: editUser.config?.prime_evenementiel_2 ?? 10,
        prime_evenementiel_3_plus: editUser.config?.prime_evenementiel_3_plus ?? 5,
        semaines_indisponibles: editUser.config?.semaines_indisponibles ?? 10,
      },
    });

    toast.success("Utilisateur mis à jour");
    setEditUser(null);
    loadUsers();
    setEditSaving(false);
  };

  const currentUserRole = users.find(u => u.id === currentUser?.id);
  const isSuperAdmin = currentUserRole ? getUserRole(currentUserRole) === "super_admin" : false;
  const filtered = users.filter((u) => matchesSearch(u, searchQuery));

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
        className="bg-card border border-border/60 rounded-2xl p-3 shadow-soft space-y-2"
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
            <button onClick={() => setExpandedUser(isExpanded ? null : u.id)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title={isExpanded ? "Masquer la configuration" : "Configurer les primes"}>
              <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
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
          <UserConfigPanel userId={u.id} config={u.config} customPrimes={u.customPrimes ?? []} onSaved={loadUsers} />
        )}
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <Tabs defaultValue="collaborateurs" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="collaborateurs">Utilisateurs</TabsTrigger>
            <TabsTrigger value="audits">Audits</TabsTrigger>
            <TabsTrigger value="secteurs">Secteurs</TabsTrigger>
          </TabsList>
          {currentUser && users.find(u => u.id === currentUser.id)?.roles.includes("super_admin") && (
            <BackupButton />
          )}
        </div>
        <TabsContent value="collaborateurs">
      <div className="space-y-4">
      <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-foreground">Gestion des utilisateurs</h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
            <div className="flex gap-1.5">
              <Input
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-[260px] h-9 text-sm rounded-md"
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
                    Créez un utilisateur puis attribuez-lui son rôle, ses objectifs et ses primes.
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

                  {/* Primes are set with default values on creation */}

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

        <p className="text-xs text-muted-foreground mb-3">
          Utilise la flèche dans <span className="font-medium text-foreground">Actions</span> pour ouvrir la configuration détaillée des primes.
        </p>

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
                    <TableHead className="text-xs uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        Primes (1/2/3)
                        <button onClick={() => setShowPrimes(v => !v)} className="p-0.5 rounded hover:bg-secondary transition-colors" title={showPrimes ? "Masquer les primes" : "Afficher les primes"}>
                          <FontAwesomeIcon icon={showPrimes ? faEye : faEyeSlash} className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </span>
                    </TableHead>
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
                            {showPrimes
                              ? (u.config ? `RD:${u.config.prime_audit_1}€ Dist:${u.config.prime_distanciel_1}€` : "—")
                              : "••• / •••"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                className="p-1.5 rounded-sm hover:bg-secondary transition-colors"
                                title={isExpanded ? "Masquer la configuration" : "Configurer les primes"}
                              >
                                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
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
                    <UserConfigPanel userId={u.id} config={u.config} customPrimes={u.customPrimes ?? []} onSaved={loadUsers} />
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
              {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
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
                <span className="text-xs text-muted-foreground block mb-1">Primes (1er / 2e / 3e+)</span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">RD Présentiel</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_audit_1 ?? 0}€ / {viewUser.config?.prime_audit_2 ?? 0}€ / {viewUser.config?.prime_audit_3_plus ?? 0}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">RD Distanciel</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_distanciel_1 ?? 0}€ / {viewUser.config?.prime_distanciel_2 ?? 0}€ / {viewUser.config?.prime_distanciel_3_plus ?? 0}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Club Affaires</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_club_1 ?? 0}€ / {viewUser.config?.prime_club_2 ?? 0}€ / {viewUser.config?.prime_club_3_plus ?? 0}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">RDV Commercial</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_rdv_1 ?? 0}€ / {viewUser.config?.prime_rdv_2 ?? 0}€ / {viewUser.config?.prime_rdv_3_plus ?? 0}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Suivi Activité</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_suivi_1 ?? 0}€ / {viewUser.config?.prime_suivi_2 ?? 0}€ / {viewUser.config?.prime_suivi_3_plus ?? 0}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Mise en place</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_mep_1 ?? 0}€ / {viewUser.config?.prime_mep_2 ?? 0}€ / {viewUser.config?.prime_mep_3_plus ?? 0}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">RD Événementielle</span><span className="text-foreground tabular-nums">{viewUser.config?.prime_evenementiel_1 ?? 0}€ / {viewUser.config?.prime_evenementiel_2 ?? 0}€ / {viewUser.config?.prime_evenementiel_3_plus ?? 0}€</span></div>
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

              {/* Primes are managed via the expandable config panel */}
              <p className="text-xs text-muted-foreground italic">Les primes par format sont gérées via le panneau de configuration détaillé.</p>

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
      </div>
        </TabsContent>
        <TabsContent value="audits">
          <AdminAuditGridInline />
        </TabsContent>
        <TabsContent value="secteurs">
          <AdminSecteurs />
        </TabsContent>
      </Tabs>
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
  customPrimes: initialCustomPrimes,
  onSaved,
}: {
  userId: string;
  config: UserConfig | null;
  customPrimes: CustomPrime[];
  onSaved: () => void;
}) {
  const [objectif, setObjectif] = useState(config?.objectif ?? 0);
  const [palier1, setPalier1] = useState<string>(config?.palier_1?.toString() ?? "");
  const [palier2, setPalier2] = useState<string>(config?.palier_2?.toString() ?? "");
  const [palier3, setPalier3] = useState<string>(config?.palier_3?.toString() ?? "");
  const [semainesIndispo, setSemainesIndispo] = useState(config?.semaines_indisponibles ?? 10);
  const [saving, setSaving] = useState(false);
  const [customPrimes, setCustomPrimes] = useState<CustomPrime[]>(initialCustomPrimes);
  const [addingCustom, setAddingCustom] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newP1, setNewP1] = useState(75);
  const [newP2, setNewP2] = useState(10);
  const [newP3, setNewP3] = useState(5);

  // Per-format primes state
  const [primes, setPrimes] = useState({
    prime_audit_1: config?.prime_audit_1 ?? 75, prime_audit_2: config?.prime_audit_2 ?? 10, prime_audit_3_plus: config?.prime_audit_3_plus ?? 5,
    prime_distanciel_1: config?.prime_distanciel_1 ?? 10, prime_distanciel_2: config?.prime_distanciel_2 ?? 5, prime_distanciel_3_plus: config?.prime_distanciel_3_plus ?? 0,
    prime_club_1: config?.prime_club_1 ?? 75, prime_club_2: config?.prime_club_2 ?? 10, prime_club_3_plus: config?.prime_club_3_plus ?? 5,
    prime_rdv_1: config?.prime_rdv_1 ?? 75, prime_rdv_2: config?.prime_rdv_2 ?? 10, prime_rdv_3_plus: config?.prime_rdv_3_plus ?? 5,
    prime_suivi_1: config?.prime_suivi_1 ?? 75, prime_suivi_2: config?.prime_suivi_2 ?? 10, prime_suivi_3_plus: config?.prime_suivi_3_plus ?? 5,
    prime_mep_1: config?.prime_mep_1 ?? 75, prime_mep_2: config?.prime_mep_2 ?? 10, prime_mep_3_plus: config?.prime_mep_3_plus ?? 5,
    prime_evenementiel_1: config?.prime_evenementiel_1 ?? 75, prime_evenementiel_2: config?.prime_evenementiel_2 ?? 10, prime_evenementiel_3_plus: config?.prime_evenementiel_3_plus ?? 5,
  });

  const updatePrime = (key: string, val: number) => setPrimes(p => ({ ...p, [key]: val }));

  const FORMATS = [
    { label: "RD Présentiel", k1: "prime_audit_1", k2: "prime_audit_2", k3: "prime_audit_3_plus" },
    { label: "RD Distanciel", k1: "prime_distanciel_1", k2: "prime_distanciel_2", k3: "prime_distanciel_3_plus" },
    { label: "Club Affaires", k1: "prime_club_1", k2: "prime_club_2", k3: "prime_club_3_plus" },
    { label: "RDV Commercial", k1: "prime_rdv_1", k2: "prime_rdv_2", k3: "prime_rdv_3_plus" },
    { label: "Suivi Activité", k1: "prime_suivi_1", k2: "prime_suivi_2", k3: "prime_suivi_3_plus" },
    { label: "Mise en place", k1: "prime_mep_1", k2: "prime_mep_2", k3: "prime_mep_3_plus" },
    { label: "RD Événementielle", k1: "prime_evenementiel_1", k2: "prime_evenementiel_2", k3: "prime_evenementiel_3_plus" },
  ] as const;

  const handleDeleteFormat = async (k1: string, k2: string, k3: string) => {
    const zeroed = { ...primes, [k1]: 0, [k2]: 0, [k3]: 0 };
    setPrimes(zeroed);
    // Save immediately so deletion persists
    const res = await supabase.functions.invoke("create-user", {
      body: {
        action: "save-config",
        userId,
        objectif,
        palier_1: palier1 ? parseInt(palier1) : null,
        palier_2: palier2 ? parseInt(palier2) : null,
        palier_3: palier3 ? parseInt(palier3) : null,
        ...zeroed,
        semaines_indisponibles: semainesIndispo,
      },
    });
    if (res.data?.error) toast.error(res.data.error);
    else { toast.success("Prime supprimée"); onSaved(); }
  };

  const handleDeleteCustomPrime = async (primeId: string) => {
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "delete-custom-prime", primeId },
    });
    if (res.data?.error) toast.error(res.data.error);
    else {
      setCustomPrimes(prev => prev.filter(cp => cp.id !== primeId));
      toast.success("Prime supprimée");
      onSaved();
    }
  };

  const handleAddCustomPrime = async () => {
    if (!newLabel.trim()) return;
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "add-custom-prime", userId, label: newLabel.trim(), prime_1: newP1, prime_2: newP2, prime_3_plus: newP3 },
    });
    if (res.data?.error) toast.error(res.data.error);
    else {
      toast.success("Prime ajoutée");
      setNewLabel(""); setNewP1(75); setNewP2(10); setNewP3(5); setAddingCustom(false);
      onSaved();
      if (res.data?.customPrime) setCustomPrimes(prev => [...prev, res.data.customPrime]);
    }
  };

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
        ...primes,
        semaines_indisponibles: semainesIndispo,
      },
    });
    if (res.data?.error) toast.error(res.data.error);
    else { toast.success("Configuration enregistrée"); onSaved(); }
    setSaving(false);
  };

  const visibleFormats = FORMATS.filter(f => {
    const v1 = (primes as any)[f.k1];
    const v2 = (primes as any)[f.k2];
    const v3 = (primes as any)[f.k3];
    return !(v1 === 0 && v2 === 0 && v3 === 0);
  });

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
        <label className="text-xs font-semibold text-foreground block mb-2">Primes par format (€) — 1er / 2e / 3e+</label>
        <div className="space-y-2">
          {visibleFormats.map(({ label, k1, k2, k3 }) => (
            <div key={k1} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
              <Input type="number" min={0} step={1} value={(primes as any)[k1]} onChange={(e) => updatePrime(k1, parseFloat(e.target.value) || 0)} className="h-8 text-sm w-16" />
              <Input type="number" min={0} step={1} value={(primes as any)[k2]} onChange={(e) => updatePrime(k2, parseFloat(e.target.value) || 0)} className="h-8 text-sm w-16" />
              <Input type="number" min={0} step={1} value={(primes as any)[k3]} onChange={(e) => updatePrime(k3, parseFloat(e.target.value) || 0)} className="h-8 text-sm w-16" />
              <button
                type="button"
                onClick={() => handleDeleteFormat(k1, k2, k3)}
                className="text-destructive/60 hover:text-destructive transition-colors p-1"
                title="Supprimer cette prime"
              >
                <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {/* Custom primes */}
          {customPrimes.map((cp) => (
            <div key={cp.id} className="flex items-center gap-2">
              <span className="text-xs text-primary font-medium w-28 shrink-0 truncate" title={cp.label}>{cp.label}</span>
              <Input type="number" min={0} step={1} value={cp.prime_1}
                onChange={(e) => setCustomPrimes(prev => prev.map(p => p.id === cp.id ? { ...p, prime_1: parseFloat(e.target.value) || 0 } : p))}
                className="h-8 text-sm w-16" />
              <Input type="number" min={0} step={1} value={cp.prime_2}
                onChange={(e) => setCustomPrimes(prev => prev.map(p => p.id === cp.id ? { ...p, prime_2: parseFloat(e.target.value) || 0 } : p))}
                className="h-8 text-sm w-16" />
              <Input type="number" min={0} step={1} value={cp.prime_3_plus}
                onChange={(e) => setCustomPrimes(prev => prev.map(p => p.id === cp.id ? { ...p, prime_3_plus: parseFloat(e.target.value) || 0 } : p))}
                className="h-8 text-sm w-16" />
              <button
                type="button"
                onClick={() => handleDeleteCustomPrime(cp.id)}
                className="text-destructive/60 hover:text-destructive transition-colors p-1"
                title="Supprimer cette prime"
              >
                <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add custom prime */}
        {addingCustom ? (
          <div className="mt-3 p-3 border border-dashed border-border rounded-lg space-y-2">
            <Input
              placeholder="Nom de la prime"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-28 shrink-0">Montants</span>
              <Input type="number" min={0} value={newP1} onChange={(e) => setNewP1(parseFloat(e.target.value) || 0)} className="h-8 text-sm w-16" placeholder="1er" />
              <Input type="number" min={0} value={newP2} onChange={(e) => setNewP2(parseFloat(e.target.value) || 0)} className="h-8 text-sm w-16" placeholder="2e" />
              <Input type="number" min={0} value={newP3} onChange={(e) => setNewP3(parseFloat(e.target.value) || 0)} className="h-8 text-sm w-16" placeholder="3e+" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAddCustomPrime}>
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Ajouter
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingCustom(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8 text-xs gap-1.5 border-dashed"
            onClick={() => setAddingCustom(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            Ajouter une prime
          </Button>
        )}
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground block mb-2">Temps réaliste (semaines indisponibles)</label>
        <div className="flex items-center gap-2">
          <Input
            type="number" min={0} max={52} value={semainesIndispo}
            onChange={(e) => setSemainesIndispo(parseInt(e.target.value) || 0)}
            className="h-9 text-sm w-20"
          />
          <span className="text-xs text-muted-foreground">semaines (CP, séminaire, frein commercial)</span>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gap-2 h-9 text-sm">
        <FontAwesomeIcon icon={faFloppyDisk} className="h-3.5 w-3.5" />
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}