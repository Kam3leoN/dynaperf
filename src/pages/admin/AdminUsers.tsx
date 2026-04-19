import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faPenToSquare, faFloppyDisk, faCamera, faEye, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { readEdgeFunctionErrorMessage } from "@/lib/readEdgeFunctionError";
import { cn } from "@/lib/utils";
import { ActionIconButton } from "@/components/ActionIconButton";
import { uploadUserAvatarToBucket, withAvatarCacheBust } from "@/lib/avatarStorage";
import { ORG_TITLE_LABELS } from "@/lib/memberDirectory";
import { useStaffRolesCatalog } from "@/hooks/useStaffRolesCatalog";

/** Toast le détail JSON `{ error }` si la Edge Function répond en non-2xx. */
async function toastEdgeInvokeFailure(
  res: { data: unknown; error: unknown; response?: Response },
  fallback: string,
): Promise<boolean> {
  const dataErr =
    res.data && typeof res.data === "object" && res.data !== null && typeof (res.data as { error?: unknown }).error === "string"
      ? (res.data as { error: string }).error
      : null;
  if (!res.error && !dataErr) return false;
  const detail = (await readEdgeFunctionErrorMessage(res)) ?? dataErr;
  toast.error(detail?.trim() ? detail : fallback);
  return true;
}

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

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  orgTitles: string[];
  roles: string[];
  /** Ligne `collaborateur_config` si présente (non éditée depuis cet écran). */
  config: Record<string, unknown> | null;
  createdAt: string;
}

const STAFF_ROLE_PRIORITY = [
  "super_admin",
  "admin",
  "super_moderator",
  "moderator",
  "bot",
  "member",
] as const;

const LEGACY_ROLE_TO_MEMBER = new Set(["lecteur", "user", "redacteur"]);

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  super_moderator: "Super modérateur",
  moderator: "Modérateur",
  bot: "Bot",
  member: "Utilisateur",
};

function getUserRole(u: ManagedUser) {
  if (u.roles.some((r) => LEGACY_ROLE_TO_MEMBER.has(r))) return "member";
  for (const r of STAFF_ROLE_PRIORITY) {
    if (u.roles.includes(r)) return r;
  }
  return "member";
}

function StaffRoleSelectItems({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { roles, loading } = useStaffRolesCatalog(true);
  if (loading) {
    return (
      <SelectItem value="member" disabled>
        Chargement des rôles…
      </SelectItem>
    );
  }
  return (
    <>
      {roles
        .filter((r) => r.role_key !== "super_admin" || isSuperAdmin)
        .map((r) => (
          <SelectItem key={r.role_key} value={r.role_key}>
            {r.label}
          </SelectItem>
        ))}
    </>
  );
}

function RoleBadge({ role }: { role: string }) {
  const { roles: catalog } = useStaffRolesCatalog(true);
  const row = catalog.find((r) => r.role_key === role);
  const styles: Record<string, string> = {
    super_admin: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    admin: "bg-primary/10 text-primary",
    super_moderator: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    moderator: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
    bot: "bg-muted text-muted-foreground",
    member: "bg-secondary text-muted-foreground",
  };
  const fallback = styles.member;
  const hex = row?.color_hex?.trim();
  const validHex = hex && /^#[0-9A-Fa-f]{6}$/.test(hex);
  const label = row?.label ?? ROLE_LABELS[role] ?? role;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border border-transparent max-w-full ${!validHex ? styles[role] || fallback : ""}`}
      style={
        validHex
          ? {
              backgroundColor: `${hex}22`,
              color: hex,
              borderColor: `${hex}44`,
            }
          : undefined
      }
    >
      {row?.icon_url ? (
        <img src={row.icon_url} alt="" className="h-3.5 w-3.5 rounded-sm object-cover shrink-0" width={14} height={14} />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function UserAvatar({ url, name, size = "sm" }: { url: string | null; name: string; size?: "sm" | "md" }) {
  const px = size === "md" ? 48 : 32;
  const textCls = size === "md" ? "text-lg" : "text-xs";
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [url]);
  if (url && !imgFailed) {
    return (
      <img
        src={url}
        alt={name}
        width={px}
        height={px}
        style={{ width: px, height: px, minWidth: px, minHeight: px }}
        className={`rounded-full object-cover border border-border shrink-0 ${textCls}`}
        onError={() => setImgFailed(true)}
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
  const { data: authRows, error: rpcErr } = await (supabase.rpc as any)("admin_auth_users_preview");
  if (rpcErr || !authRows?.length) return null;

  const [rolesRes, profilesRes, configsRes] = await Promise.all([
    supabase.from("user_roles").select("*"),
    supabase.from("profiles").select("user_id, display_name, avatar_url, title") as any,
    supabase.from("collaborateur_config").select("*"),
  ]);

  const allRoles = rolesRes.data;
  const allProfiles = profilesRes.data;
  const allConfigs = configsRes.data;

  return (authRows as any[]).map((u: any) => {
    const uid = normUid(u.id);
    const profile = (allProfiles as any[])?.find((p: any) => normUid(p.user_id) === uid);
    return {
      id: u.id,
      email: u.email ?? "",
      displayName: profile?.display_name || u.email || "",
      avatarUrl: profile?.avatar_url ?? null,
      title: profile?.title ?? null,
      orgTitles: Array.isArray(profile?.org_titles) ? profile.org_titles : [],
      roles: allRoles?.filter((r) => normUid(r.user_id) === uid).map((r) => r.role) ?? [],
      config: allConfigs?.find((c) => normUid(c.user_id) === uid) ?? null,
      createdAt: u.created_at,
    };
  });
}

/** Liste des utilisateurs gérables (Edge Function `list`, sinon repli RPC). */
export async function fetchManagedUsersList(): Promise<ManagedUser[]> {
  const res = await supabase.functions.invoke("create-user", {
    body: { action: "list" },
  });
  const edgeUsers = !res.error && !res.data?.error && Array.isArray(res.data?.users) ? res.data.users : null;
  if (edgeUsers && edgeUsers.length > 0) {
    return edgeUsers as ManagedUser[];
  }
  const viaRpc = await fetchManagedUsersViaRpc();
  return viaRpc ?? [];
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { isSuperAdmin, loading: adminRolesLoading } = useAdmin(currentUser);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("member");
  const [editTitle, setEditTitle] = useState("");
  const [editOrgTitles, setEditOrgTitles] = useState<string[]>([]);
  const [editPermOverride, setEditPermOverride] = useState<Record<string, "inherit" | "allow" | "deny">>({});
  const [appPermissionCatalog, setAppPermissionCatalog] = useState<{ key: string; description: string }[]>([]);
  const [editModuleOverrides, setEditModuleOverrides] = useState<Record<string, boolean | null>>({});
  const [appModulesCatalog, setAppModulesCatalog] = useState<{ module_key: string; label: string }[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("member");
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
      } else if (await toastEdgeInvokeFailure(res, "Erreur chargement utilisateurs")) {
        /* message affiché */
      }
    }

    setUsers(next);
    setUsersLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    void (supabase as any)
      .from("app_permissions")
      .select("key, description")
      .order("key")
      .then(({ data }: any) => {
        if (data?.length) setAppPermissionCatalog(data);
      });
  }, []);

  /** Rôle via PostgREST (RLS admin) ; repli Edge si refus / erreur (ex. déploiement Pages). */
  const applySetUserRole = useCallback(
    async (userId: string, role: string): Promise<boolean> => {
      if (adminRolesLoading) {
        toast.error("Veuillez patienter, vérification des droits…");
        return false;
      }
      const viewerIsSuperAdmin = isSuperAdmin;
      const target = users.find((u) => u.id === userId);
      const targetTopRole = target ? getUserRole(target) : "";
      if (targetTopRole === "super_admin" && !viewerIsSuperAdmin) {
        toast.error("Seul un super admin peut modifier le rôle d'un super admin.");
        return false;
      }
      if (role === "super_admin" && !viewerIsSuperAdmin) {
        toast.error("Seul un super admin peut attribuer ce rôle.");
        return false;
      }

      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) {
        const res = await supabase.functions.invoke("create-user", {
          body: { action: "set-role", userId, role },
        });
        return !(await toastEdgeInvokeFailure(res, "Erreur lors du changement de rôle"));
      }

      if (role !== "none") {
        const { error: insErr } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: role as any,
        });
        if (insErr) {
          const res = await supabase.functions.invoke("create-user", {
            body: { action: "set-role", userId, role },
          });
          return !(await toastEdgeInvokeFailure(res, "Erreur lors du changement de rôle"));
        }
      }
      return true;
    },
    [users, isSuperAdmin, adminRolesLoading],
  );

  const resetCreateForm = () => {
    setEmail(""); setPassword(""); setNewFirstName(""); setNewLastName("");
    setNewRole("member");
    setAvatarFile(null); setAvatarPreview(null);
  };

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setCreating(true);

    const displayName = `${newFirstName.trim()} ${newLastName.trim().toUpperCase()}`.trim();
    const res = await supabase.functions.invoke("create-user", {
      body: { email, password, displayName, role: newRole },
    });

    if (await toastEdgeInvokeFailure(res, "Erreur lors de la création")) {
      /* */
    } else {
      // Upload avatar if provided
      if (avatarFile && res.data?.user?.id) {
        const newId = res.data.user.id;
        const up = await uploadUserAvatarToBucket(newId, avatarFile);
        if (up.ok) {
          const url = withAvatarCacheBust(up.publicUrl);
          const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", newId);
          if (dbErr) {
            const sav = await supabase.functions.invoke("create-user", {
              body: { action: "save-avatar", userId: newId, avatar_url: url },
            });
            await toastEdgeInvokeFailure(sav, "Impossible d'enregistrer l'URL de l'avatar");
          }
        } else {
          toast.error((up as any).message);
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
    if (await toastEdgeInvokeFailure(res, "Erreur lors de la suppression")) {
      /* */
    } else {
      toast.success("Utilisateur supprimé");
      loadUsers();
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    const ok = await applySetUserRole(userId, role);
    if (ok) {
      toast.success("Rôle mis à jour");
      loadUsers();
    }
  };

  const handleAvatarChange = async (userId: string, file: File) => {
    const up = await uploadUserAvatarToBucket(userId, file);
    if (!up.ok) {
      toast.error((up as any).message);
      return;
    }
    const url = withAvatarCacheBust(up.publicUrl);
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    if (!dbErr) {
      toast.success("Avatar mis à jour");
      loadUsers();
      return;
    }
    const sav = await supabase.functions.invoke("create-user", {
      body: { action: "save-avatar", userId, avatar_url: url },
    });
    if (await toastEdgeInvokeFailure(sav, "Impossible d'enregistrer l'avatar")) return;
    toast.success("Avatar mis à jour");
    loadUsers();
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
    setEditTitle(u.title || "");
    setEditOrgTitles(Array.isArray(u.orgTitles) ? [...u.orgTitles] : []);

    const loadOverrides = async () => {
      let cat = appPermissionCatalog;
      if (!cat.length) {
        const { data: fresh } = await (supabase as any).from("app_permissions").select("key, description").order("key");
        cat = fresh ?? [];
        if (cat.length) setAppPermissionCatalog(cat as any);
      }
      const { data: ovs } = await (supabase as any)
        .from("user_permission_overrides")
        .select("permission_key, allowed")
        .eq("user_id", u.id);
      const next: Record<string, "inherit" | "allow" | "deny"> = {};
      for (const row of cat as any[]) next[row.key] = "inherit";
      for (const o of (ovs ?? []) as any[]) {
        if (next[o.permission_key] !== undefined) {
          next[o.permission_key] = o.allowed ? "allow" : "deny";
        }
      }
      setEditPermOverride(next);
    };
    void loadOverrides();

    // Load module overrides
    const loadModuleOverrides = async () => {
      let mods = appModulesCatalog;
      if (!mods.length) {
        const { data: fresh } = await (supabase as any).from("app_modules").select("module_key, label").order("sort_order");
        mods = fresh ?? [];
        if (mods.length) setAppModulesCatalog(mods as any);
      }
      const { data: ovs } = await (supabase as any)
        .from("user_module_overrides")
        .select("module_key, enabled")
        .eq("user_id", u.id);
      const next: Record<string, boolean | null> = {};
      for (const m of mods as any[]) next[m.module_key] = null; // null = inherit (global)
      for (const o of (ovs ?? []) as any[]) {
        if (o.module_key in next) next[o.module_key] = o.enabled;
      }
      setEditModuleOverrides(next);
    };
    void loadModuleOverrides();
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const role = getUserRole(editUser);

    // Update name & email
    const res = await supabase.functions.invoke("create-user", {
      body: { action: "update-user", userId: editUser.id, email: editEmail.trim(), displayName: `${editFirstName.trim()} ${editLastName.trim().toUpperCase()}`.trim(), title: editTitle.trim() },
    });
    if (await toastEdgeInvokeFailure(res, "Erreur lors de la mise à jour du profil")) {
      setEditSaving(false);
      return;
    }

    // Update role if changed and not admin
    if (editRole !== role) {
      const roleOk = await applySetUserRole(editUser.id, editRole);
      if (!roleOk) {
        setEditSaving(false);
        return;
      }
    }

    const { error: orgTitlesErr } = await (supabase as any)
      .from("profiles")
      .update({ org_titles: editOrgTitles })
      .eq("user_id", editUser.id);
    if (orgTitlesErr) {
      toast.error(orgTitlesErr.message);
      setEditSaving(false);
      return;
    }

    for (const row of appPermissionCatalog) {
      const mode = editPermOverride[row.key] ?? "inherit";
      if (mode === "inherit") {
        await (supabase as any)
          .from("user_permission_overrides")
          .delete()
          .eq("user_id", editUser.id)
          .eq("permission_key", row.key);
      } else {
        const { error: upErr } = await (supabase as any).from("user_permission_overrides").upsert(
          {
            user_id: editUser.id,
            permission_key: row.key,
            allowed: mode === "allow",
          },
          { onConflict: "user_id,permission_key" },
        );
        if (upErr) {
          toast.error(upErr.message);
          setEditSaving(false);
          return;
        }
      }
    }

    // Save module overrides
    for (const [moduleKey, val] of Object.entries(editModuleOverrides)) {
      if (val === null) {
        // Remove override (inherit global)
        await (supabase as any)
          .from("user_module_overrides")
          .delete()
          .eq("user_id", editUser.id)
          .eq("module_key", moduleKey);
      } else {
        const { error: moErr } = await (supabase as any).from("user_module_overrides").upsert(
          { user_id: editUser.id, module_key: moduleKey, enabled: val },
          { onConflict: "user_id,module_key" },
        );
        if (moErr) {
          toast.error(moErr.message);
          setEditSaving(false);
          return;
        }
      }
    }

    toast.success("Utilisateur mis à jour");
    setEditUser(null);
    loadUsers();
    setEditSaving(false);
  };

  /** Liste / mobile : un admin classique ne modifie pas les rôles admin/super ; un super admin peut tout changer. */
  const canChangeUserRoleFromList = (u: ManagedUser) => {
    const r = getUserRole(u);
    return !((r === "admin" || r === "super_admin") && !isSuperAdmin);
  };
  const filtered = users.filter((u) => matchesSearch(u, searchQuery));

  const MobileCard = ({ u }: { u: ManagedUser }) => {
    const role = getUserRole(u);
    const isSuperAdminUser = role === "super_admin";
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
              <p className="text-[10px] text-muted-foreground tabular-nums">
                Membre depuis {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <ActionIconButton label="Voir le profil utilisateur" variant="view" onClick={() => setViewUser(u)}>
              <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
            </ActionIconButton>
            <ActionIconButton label="Modifier l'utilisateur" variant="edit" onClick={() => openEditDialog(u)}>
              <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
            </ActionIconButton>
            {u.id !== currentUser?.id && !(isSuperAdminUser && !isSuperAdmin) && (
              <ActionIconButton label="Supprimer l'utilisateur" variant="destructive" onClick={() => handleDelete(u.id, u.email)}>
                <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
              </ActionIconButton>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canChangeUserRoleFromList(u) ? (
            <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
              <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <StaffRoleSelectItems isSuperAdmin={isSuperAdmin} />
              </SelectContent>
            </Select>
          ) : (
            <RoleBadge role={role} />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-4 pb-8 sm:space-y-6">
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
                    Créez un utilisateur puis attribuez-lui son rôle.
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
                      <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarSelect(e.target.files[0])} />
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
                        <StaffRoleSelectItems isSuperAdmin={isSuperAdmin} />
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="rounded-md">Annuler</Button>
                    <Button type="submit" size="sm" disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                      {creating ? "Création…" : "Créer"}
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-muted-foreground">
                  L&apos;utilisateur pourra se connecter immédiatement. Rôle par défaut : Utilisateur.
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
                    <TableHead className="text-xs uppercase tracking-wider whitespace-nowrap">Membre depuis</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Rôle</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((u) => {
                      const role = getUserRole(u);
                      const isSuperAdminUser = role === "super_admin";
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
                          <TableCell className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR") : "—"}
                          </TableCell>
                          <TableCell>
                            {canChangeUserRoleFromList(u) ? (
                              <Select value={role} onValueChange={(v) => handleSetRole(u.id, v)}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <StaffRoleSelectItems isSuperAdmin={isSuperAdmin} />
                                </SelectContent>
                              </Select>
                            ) : (
                              <RoleBadge role={role} />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <ActionIconButton label="Voir le profil utilisateur" variant="view" onClick={() => setViewUser(u)}>
                                <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
                              </ActionIconButton>
                              <ActionIconButton label="Modifier l'utilisateur" variant="edit" onClick={() => openEditDialog(u)}>
                                <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
                              </ActionIconButton>
                              {u.id !== currentUser?.id && !(isSuperAdminUser && !isSuperAdmin) && (
                                <ActionIconButton label="Supprimer l'utilisateur" variant="destructive" onClick={() => handleDelete(u.id, u.email)}>
                                  <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                                </ActionIconButton>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
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
            <DialogDescription className="text-sm text-muted-foreground text-center w-full">Profil de {viewUser?.displayName}</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{viewUser.displayName}</p>
                <p className="text-xs text-muted-foreground">{viewUser.email}</p>
                <div className="mt-1"><RoleBadge role={getUserRole(viewUser)} /></div>
                {viewUser.orgTitles?.length ? (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {viewUser.orgTitles.map((t) => ORG_TITLE_LABELS[t] ?? t).join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="text-sm">
                <span className="text-xs text-muted-foreground block">Membre depuis</span>
                <span className="font-medium text-foreground">{new Date(viewUser.createdAt).toLocaleDateString("fr-FR")}</span>
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
                  <input id="edit-avatar-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={async (e) => {
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
            <DialogDescription className="text-sm text-muted-foreground text-center w-full">Modifier {editUser?.displayName}</DialogDescription>
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
                    <StaffRoleSelectItems isSuperAdmin={isSuperAdmin} />
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Titres organisationnels</label>
                <p className="text-[10px] text-muted-foreground mb-2">Réservés aux rôles staff ; badges d&apos;annuaire.</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(ORG_TITLE_LABELS) as (keyof typeof ORG_TITLE_LABELS)[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setEditOrgTitles((prev) =>
                          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                        )
                      }
                      className={cn(
                        "text-xs px-2 py-1 rounded-full border transition-colors",
                        editOrgTitles.includes(key)
                          ? "bg-primary/15 border-primary text-foreground"
                          : "border-border text-muted-foreground hover:bg-secondary/80",
                      )}
                    >
                      {ORG_TITLE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Surcharges de droits</label>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Défaut = matrice par rôle staff ; Forcer oui / non remplace pour cet utilisateur.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border border-border/60 p-2">
                  {appPermissionCatalog.map((row) => (
                    <div key={row.key} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <span className="text-xs font-mono text-foreground shrink-0">{row.key}</span>
                      <Select
                        value={editPermOverride[row.key] ?? "inherit"}
                        onValueChange={(v) =>
                          setEditPermOverride((prev) => ({
                            ...prev,
                            [row.key]: v as "inherit" | "allow" | "deny",
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inherit">Défaut</SelectItem>
                          <SelectItem value="allow">Forcer oui</SelectItem>
                          <SelectItem value="deny">Forcer non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modules visibles pour cet utilisateur */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modules visibles</label>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Défaut = état global du module ; basculer pour forcer l'accès de cet utilisateur.
                </p>
                <div className="space-y-2 rounded-md border border-border/60 p-2">
                  {appModulesCatalog.map((mod) => {
                    const val = editModuleOverrides[mod.module_key];
                    const isInherit = val === null || val === undefined;
                    return (
                      <div key={mod.module_key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground">{mod.label}</span>
                        <div className="flex items-center gap-2">
                          {!isInherit && (
                            <button
                              type="button"
                              className="text-[10px] text-muted-foreground hover:text-foreground underline"
                              onClick={() =>
                                setEditModuleOverrides((prev) => ({ ...prev, [mod.module_key]: null }))
                              }
                            >
                              Réinitialiser
                            </button>
                          )}
                          <Switch
                            checked={isInherit ? true : val}
                            onCheckedChange={(checked) =>
                              setEditModuleOverrides((prev) => ({ ...prev, [mod.module_key]: checked }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
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
      </div>
    </div>
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
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onUpload(user.id, e.target.files[0]); }} />
    </div>
  );
}