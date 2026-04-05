import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEllipsisVertical,
  faKey,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faShieldHalved,
  faSpinner,
  faTrashCan,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useStaffRolesCatalog, type StaffRoleCatalogRow } from "@/hooks/useStaffRolesCatalog";
import { useAuth } from "@/hooks/useAuth";

function hueForRoleKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return 30 + (h % 300);
}

function defaultsMap(rows: { role: string; permission_key: string; allowed: boolean }[]): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const r of rows) {
    m.set(`${r.role}\0${r.permission_key}`, r.allowed);
  }
  return m;
}

export default function AdminRoles() {
  const { user } = useAuth();
  const { roles: catalogRoles, reload: reloadCatalog, loading: catalogLoading } = useStaffRolesCatalog(true);
  const [myStaffRoleKey, setMyStaffRoleKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<{ key: string; description: string }[]>([]);
  const [defMap, setDefMap] = useState<Map<string, boolean>>(new Map());
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleRank, setNewRoleRank] = useState("35");
  const [creatingRole, setCreatingRole] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteRoleKey, setDeleteRoleKey] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [editRole, setEditRole] = useState<string | null>(null);

  const labelByKey = useMemo(
    () => Object.fromEntries(catalogRoles.map((r) => [r.role_key, r.label])) as Record<string, string>,
    [catalogRoles],
  );

  const matrixRoleKeys = useMemo(
    () => [...catalogRoles].sort((a, b) => b.sort_rank - a.sort_rank).map((r) => r.role_key),
    [catalogRoles],
  );

  useEffect(() => {
    if (!user?.id) {
      setMyStaffRoleKey(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMyStaffRoleKey(null);
          return;
        }
        setMyStaffRoleKey(typeof data?.role === "string" ? data.role : null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const callerIsSuperAdmin = myStaffRoleKey === "super_admin";
  const callerSortRank = useMemo(
    () => catalogRoles.find((r) => r.role_key === myStaffRoleKey)?.sort_rank ?? null,
    [catalogRoles, myStaffRoleKey],
  );

  const canDeleteCatalogRoleRow = useCallback(
    (row: StaffRoleCatalogRow) => {
      if (catalogRoles.length <= 1) return false;
      if (callerIsSuperAdmin) return true;
      if (callerSortRank == null) return false;
      return row.sort_rank <= callerSortRank;
    },
    [callerIsSuperAdmin, callerSortRank, catalogRoles.length],
  );

  const load = useCallback(async () => {
    if (catalogRoles.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const keys = catalogRoles.map((r) => r.role_key);
    const [pRes, dRes] = await Promise.all([
      supabase.from("app_permissions").select("key, description").order("key"),
      supabase.from("role_permission_defaults").select("role, permission_key, allowed"),
    ]);
    if (pRes.error) {
      toast.error(pRes.error.message);
      setLoading(false);
      return;
    }
    if (dRes.error) {
      toast.error(dRes.error.message);
      setLoading(false);
      return;
    }

    const counts: Record<string, number> = {};
    await Promise.all(
      keys.map(async (role) => {
        const { count, error } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", role);
        counts[role] = error ? 0 : count ?? 0;
      }),
    );
    setRoleCounts(counts);

    setPermissions(pRes.data ?? []);
    setDefMap(defaultsMap(dRes.data ?? []));
    setLoading(false);
  }, [catalogRoles]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedCatalogRows = useMemo(() => {
    const base = [...catalogRoles].sort((a, b) => b.sort_rank - a.sort_rank);
    const q = roleSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.role_key.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q),
    );
  }, [catalogRoles, roleSearch]);

  /** Aligné sur la RPC `admin_delete_staff_role` (rang inférieur le plus proche, sinon rang minimal restant). */
  const deleteRoleReassignTarget = useMemo(() => {
    if (!deleteRoleKey || catalogRoles.length < 2) return null;
    const row = catalogRoles.find((r) => r.role_key === deleteRoleKey);
    if (!row) return null;
    const others = catalogRoles.filter((r) => r.role_key !== deleteRoleKey);
    const lower = others
      .filter((r) => r.sort_rank < row.sort_rank)
      .sort((a, b) => b.sort_rank - a.sort_rank)[0];
    return lower ?? [...others].sort((a, b) => a.sort_rank - b.sort_rank)[0] ?? null;
  }, [deleteRoleKey, catalogRoles]);

  const isAllowed = useCallback(
    (role: string, permKey: string) => defMap.get(`${role}\0${permKey}`) === true,
    [defMap],
  );

  const setCell = useCallback(async (role: string, permissionKey: string, allowed: boolean) => {
    const sid = `${role}\0${permissionKey}`;
    setSaving((s) => new Set(s).add(sid));
    let prevSnapshot: boolean | undefined;
    setDefMap((m) => {
      prevSnapshot = m.get(sid);
      const next = new Map(m);
      next.set(sid, allowed);
      return next;
    });
    const { error } = await supabase.rpc("admin_set_role_permission_default", {
      p_role: role,
      p_permission_key: permissionKey,
      p_allowed: allowed,
    });
    setSaving((s) => {
      const n = new Set(s);
      n.delete(sid);
      return n;
    });
    if (error) {
      setDefMap((m) => {
        const next = new Map(m);
        if (prevSnapshot === undefined) next.delete(sid);
        else next.set(sid, prevSnapshot);
        return next;
      });
      toast.error(error.message);
    }
  }, []);

  const handleCreatePermission = async () => {
    const key = newKey.trim().toLowerCase();
    if (!/^[a-z][a-z0-9._-]*$/.test(key)) {
      toast.error("Clé invalide : lettres minuscules, chiffres, points, tirets (ex. nav.magasin).");
      return;
    }
    setCreating(true);
    const { error: insErr } = await supabase.from("app_permissions").insert({
      key,
      description: newDesc.trim() || key,
    });
    if (insErr) {
      toast.error(insErr.message);
      setCreating(false);
      return;
    }
    const { error: defErr } = await supabase.rpc("admin_seed_role_permission_defaults_for_key", {
      p_permission_key: key,
    });
    setCreating(false);
    if (defErr) {
      toast.error(defErr.message);
      await load();
      return;
    }
    toast.success("Permission créée — activez-la par rôle.");
    setNewOpen(false);
    setNewKey("");
    setNewDesc("");
    await load();
  };

  const handleCreateStaffRole = async () => {
    const rk = newRoleKey.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(rk)) {
      toast.error("Clé : minuscules, chiffres et tirets bas uniquement (ex. formateur).");
      return;
    }
    const rank = Number.parseInt(newRoleRank, 10);
    if (!Number.isFinite(rank) || rank < 1 || rank > 9999) {
      toast.error("Rang entre 1 et 9999 (plus grand = plus haut dans la liste).");
      return;
    }
    setCreatingRole(true);
    const { error } = await supabase.rpc("admin_create_staff_role", {
      p_role_key: rk,
      p_label: newRoleLabel.trim() || rk,
      p_sort_rank: rank,
    });
    setCreatingRole(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rôle créé — ajustez les permissions.");
    setCreateRoleOpen(false);
    setNewRoleKey("");
    setNewRoleLabel("");
    setNewRoleRank("35");
    await reloadCatalog();
    await load();
  };

  const confirmDeleteRole = async () => {
    if (!deleteRoleKey) return;
    const fallbackLabel = deleteRoleReassignTarget?.label;
    setDeletingRole(true);
    const { error } = await supabase.rpc("admin_delete_staff_role", { p_role_key: deleteRoleKey });
    setDeletingRole(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      fallbackLabel
        ? `Rôle supprimé — comptes basculés vers « ${fallbackLabel} »`
        : "Rôle supprimé",
    );
    setDeleteRoleKey(null);
    await reloadCatalog();
    await load();
  };

  const saveDescription = async (key: string, description: string) => {
    const { error } = await supabase.from("app_permissions").update({ description }).eq("key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Description mise à jour");
    setEditKey(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteKey) return;
    setDeleting(true);
    const { error } = await supabase.from("app_permissions").delete().eq("key", deleteKey);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Permission supprimée");
    setDeleteKey(null);
    await load();
  };

  const copyRoleId = async (role: string) => {
    try {
      await navigator.clipboard.writeText(role);
      toast.success("Identifiant du rôle copié");
    } catch {
      toast.error("Impossible de copier dans le presse-papiers");
    }
  };

  const totalMembers = useMemo(
    () => matrixRoleKeys.reduce((acc, r) => acc + (roleCounts[r] ?? 0), 0),
    [matrixRoleKeys, roleCounts],
  );

  const showLoader = catalogLoading || loading;
  const editRow = editRole ? catalogRoles.find((r) => r.role_key === editRole) : undefined;

  return (
    <AppLayout>
      <div className="app-page-shell min-w-0 w-full max-w-full space-y-5 overflow-x-clip pb-8 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="outline" size="sm" className="rounded-md gap-2 min-h-11 sm:min-h-10 shrink-0" asChild>
              <Link to="/admin">
                <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                Administration
              </Link>
            </Button>
            <h1 className="text-xl font-semibold flex items-center gap-2 min-w-0 sm:text-lg">
              <FontAwesomeIcon icon={faKey} className="h-6 w-6 shrink-0 text-primary sm:h-5 sm:w-5" />
              <span className="truncate">Rôles serveur</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative flex-1 min-w-0 w-full">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none"
            />
            <Input
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              placeholder="Rechercher des rôles…"
              className="pl-11 h-12 rounded-xl bg-card border-border/60 sm:pl-9 sm:h-12"
              aria-label="Rechercher des rôles"
            />
          </div>
          <div className="flex flex-col gap-2 w-full min-[420px]:flex-row min-[420px]:flex-1 sm:w-auto sm:flex-initial sm:shrink-0">
            <Button
              type="button"
              className="rounded-xl gap-1.5 w-full min-h-11 sm:w-auto sm:min-h-12"
              onClick={() => setCreateRoleOpen(true)}
            >
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              Création de rôle
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-1.5 w-full min-h-11 sm:w-auto sm:min-h-12"
              onClick={() => setNewOpen(true)}
            >
              <FontAwesomeIcon icon={faKey} className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="sm:hidden">Nouvelle permission</span>
              <span className="hidden sm:inline">Permission</span>
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed sm:text-xs">
          Les rôles sont stockés dans le catalogue <span className="font-mono">app_roles_catalog</span> : vous pouvez
          en <strong>ajouter</strong> sans migration SQL. L’ordre d’affichage suit le champ{" "}
          <span className="font-mono">sort_rank</span> (plus la valeur est élevée, plus le rôle est « haut »). Les droits
          par défaut se règlent par case à cocher. La <strong>suppression</strong> d’un rôle réaffecte tous les comptes
          concernés au rôle de rang inférieur le plus proche (sécurité) ; le dernier rôle du catalogue ne peut pas être
          supprimé. Un administrateur ne peut pas supprimer un rôle dont le <span className="font-mono">sort_rank</span>{" "}
          est <strong>supérieur</strong> au sien (les super administrateurs n’ont pas cette limite).
        </p>

        <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3.5 border-b border-border/60 bg-muted/30 text-sm font-semibold uppercase tracking-wide text-muted-foreground sm:py-3 sm:text-xs">
            <span className="min-w-0 truncate">Rôles — {sortedCatalogRows.length}</span>
            <span className="pr-2 text-right tabular-nums sm:pr-10 md:pr-14">Membres</span>
          </div>
          {showLoader && catalogRoles.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-base sm:text-sm">Chargement…</div>
          ) : (
            <ul className="divide-y divide-border/50">
              {sortedCatalogRows.map((row) => {
                const hue = hueForRoleKey(row.role_key);
                const shieldColor = `hsl(${hue} 65% 42%)`;
                const n = roleCounts[row.role_key] ?? 0;
                return (
                  <li key={row.role_key}>
                    <div className="flex items-center gap-3 px-3 py-3.5 min-h-[3.25rem] hover:bg-muted/20 transition-colors sm:px-4 sm:py-3 sm:min-h-0">
                      <FontAwesomeIcon
                        icon={faShieldHalved}
                        className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
                        style={{ color: shieldColor }}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base text-foreground truncate sm:text-sm">{row.label}</p>
                        <p className="text-sm font-mono text-muted-foreground truncate sm:text-xs">{row.role_key}</p>
                        {row.is_system && (
                          <p className="text-xs text-muted-foreground mt-0.5 sm:text-[10px]">Rôle système</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-base text-muted-foreground tabular-nums shrink-0 sm:text-sm">
                        <span>{n}</span>
                        <FontAwesomeIcon icon={faUser} className="h-4 w-4 opacity-70 sm:h-3.5 sm:w-3.5" aria-hidden />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-11 w-11 rounded-xl sm:h-9 sm:w-9 sm:rounded-lg touch-target sm:min-h-0 sm:min-w-0"
                        onClick={() => setEditRole(row.role_key)}
                        aria-label={`Modifier les permissions de ${row.label}`}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-11 w-11 rounded-xl sm:h-9 sm:w-9 sm:rounded-lg touch-target sm:min-h-0 sm:min-w-0"
                            aria-label={`Autres actions pour ${row.role_key}`}
                          >
                            <FontAwesomeIcon icon={faEllipsisVertical} className="h-5 w-5 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[min(100vw-2rem,14rem)] text-base sm:w-56 sm:text-sm">
                          <DropdownMenuItem onClick={() => void copyRoleId(row.role_key)}>
                            Copier l’identifiant du rôle
                          </DropdownMenuItem>
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={!canDeleteCatalogRoleRow(row)}
                              title={
                                catalogRoles.length <= 1
                                  ? "Il doit rester au moins un rôle dans le catalogue"
                                  : !callerIsSuperAdmin &&
                                      callerSortRank != null &&
                                      row.sort_rank > callerSortRank
                                    ? "Vous ne pouvez pas supprimer un rôle supérieur au vôtre"
                                    : undefined
                              }
                              onClick={() => {
                                if (canDeleteCatalogRoleRow(row)) setDeleteRoleKey(row.role_key);
                              }}
                            >
                              Supprimer le rôle…
                            </DropdownMenuItem>
                          </>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {!showLoader && (
            <div className="px-4 py-2.5 text-xs text-muted-foreground border-t border-border/50 bg-muted/15 sm:text-[11px]">
              {totalMembers} compte(s) au total répartis sur ces rôles (tous profils confondus).
            </div>
          )}
        </div>

        <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
          <DialogContent className="gap-5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau rôle</DialogTitle>
              <DialogDescription>
                Clé technique stable (snake_case), libellé affiché et rang de hiérarchie. Un rang plus élevé place le
                rôle plus haut dans les listes (ex. 60 entre modérateur 55 et admin 90).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="nr-key">Clé technique</Label>
                <Input
                  id="nr-key"
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value)}
                  placeholder="ex. formateur"
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nr-label">Libellé</Label>
                <Input
                  id="nr-label"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                  placeholder="ex. Formateur"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nr-rank">Rang (sort_rank)</Label>
                <Input
                  id="nr-rank"
                  type="number"
                  min={1}
                  max={9999}
                  value={newRoleRank}
                  onChange={(e) => setNewRoleRank(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setCreateRoleOpen(false)}>
                Annuler
              </Button>
              <Button type="button" variant="outline" onClick={() => { setCreateRoleOpen(false); setNewOpen(true); }}>
                Nouvelle permission
              </Button>
              <Button type="button" onClick={() => void handleCreateStaffRole()} disabled={creatingRole}>
                {creatingRole ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                ) : (
                  "Créer le rôle"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent className="gap-5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle permission</DialogTitle>
              <DialogDescription>
                Clé technique unique (ex. <code className="text-xs">nav.magasin</code>). Une ligne sera créée pour
                chaque rôle du catalogue avec « non » par défaut.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="perm-key">Clé</Label>
                <Input
                  id="perm-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="ex. nav.magasin"
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="perm-desc">Description</Label>
                <Input
                  id="perm-desc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Libellé affiché côté admin"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={() => void handleCreatePermission()} disabled={creating}>
                {creating ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                ) : (
                  "Créer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={editRole !== null} onOpenChange={(o) => !o && setEditRole(null)}>
          <SheetContent className="w-full max-w-full sm:max-w-lg flex flex-col gap-0 p-0 pt-12 sm:pt-6">
            {editRole && (
              <>
                <SheetHeader className="p-5 pb-3 border-b border-border/60 sm:p-6 sm:pb-2">
                  <SheetTitle className="text-left text-lg sm:text-xl">
                    Permissions — {editRow?.label ?? labelByKey[editRole] ?? editRole}
                  </SheetTitle>
                  <SheetDescription className="text-left font-mono text-sm sm:text-xs">{editRole}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 min-h-0 px-5 py-4 sm:px-6">
                  <ul className="space-y-3.5 pr-1 sm:space-y-3 sm:pr-2">
                    {permissions.map((perm) => {
                      const sid = `${editRole}\0${perm.key}`;
                      const checked = isAllowed(editRole, perm.key);
                      const busy = saving.has(sid);
                      return (
                        <li
                          key={perm.key}
                          className="flex gap-3.5 items-start rounded-xl border border-border/50 p-4 bg-card/50 sm:gap-3 sm:rounded-lg sm:p-3"
                        >
                          <Checkbox
                            id={`sheet-${sid}`}
                            checked={checked}
                            disabled={busy}
                            className="mt-1 sm:mt-0.5"
                            onCheckedChange={(v) => void setCell(editRole, perm.key, v === true)}
                            aria-labelledby={`sheet-label-${perm.key}`}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              id={`sheet-label-${perm.key}`}
                              htmlFor={`sheet-${sid}`}
                              className="text-base font-medium cursor-pointer block sm:text-sm"
                            >
                              <code className="text-sm font-mono sm:text-xs">{perm.key}</code>
                            </label>
                            <p className="text-sm text-muted-foreground mt-1 sm:text-xs sm:mt-0.5">{perm.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </>
            )}
          </SheetContent>
        </Sheet>

        <details className="rounded-2xl border border-border/60 bg-card shadow-soft group">
          <summary className="cursor-pointer list-none px-4 py-4 min-h-[3rem] font-medium text-base flex items-center justify-between gap-2 hover:bg-muted/20 rounded-2xl [&::-webkit-details-marker]:hidden sm:py-3 sm:text-sm sm:min-h-0">
            <span className="min-w-0 pr-2">Vue matrice complète (avancée)</span>
            <span className="text-sm text-muted-foreground font-normal shrink-0 group-open:hidden sm:text-xs">
              Afficher
            </span>
            <span className="text-sm text-muted-foreground font-normal shrink-0 hidden group-open:inline sm:text-xs">
              Masquer
            </span>
          </summary>
          <div className="border-t border-border/60 overflow-hidden">
            <Card className="border-0 shadow-none rounded-none">
              <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-sm">Catalogue &amp; matrice</CardTitle>
                <CardDescription className="text-sm">
                  Éditez les descriptions, supprimez une clé ou modifiez plusieurs rôles en un coup d’œil. Sur mobile,
                  faites défiler horizontalement.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                {showLoader && matrixRoleKeys.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-base sm:text-sm">Chargement…</div>
                ) : (
                  <div className="overflow-x-auto overscroll-x-contain -mx-px px-1 pb-2 touch-pan-x sm:mx-0 sm:px-0 sm:pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="sticky left-0 z-20 min-w-[min(72vw,280px)] max-w-[min(85vw,320px)] bg-card border-r border-border/60 text-sm sm:min-w-[220px] sm:text-xs">
                            Permission
                          </TableHead>
                          {matrixRoleKeys.map((role) => (
                            <TableHead
                              key={role}
                              className="text-center min-w-[3.25rem] px-0.5 text-[0.7rem] font-medium leading-tight sm:min-w-[80px] sm:px-1 sm:text-xs"
                              title={labelByKey[role] ?? role}
                            >
                              <span className="line-clamp-2">{labelByKey[role] ?? role}</span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map((perm) => (
                          <TableRow key={perm.key}>
                            <TableCell className="sticky left-0 z-10 bg-card border-r border-border/60 align-top">
                              <div className="space-y-1 pr-2">
                                <code className="text-xs font-mono break-all">{perm.key}</code>
                                <p className="text-xs text-muted-foreground leading-snug">{perm.description}</p>
                                <div className="flex gap-1 pt-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                      setEditKey(perm.key);
                                      setEditDesc(perm.description);
                                    }}
                                  >
                                    Texte
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    onClick={() => setDeleteKey(perm.key)}
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3 mr-1" />
                                    Suppr.
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                            {matrixRoleKeys.map((role) => {
                              const sid = `${role}\0${perm.key}`;
                              const checked = isAllowed(role, perm.key);
                              const busy = saving.has(sid);
                              return (
                                <TableCell key={sid} className="text-center p-1 align-middle">
                                  <div className="flex justify-center py-1">
                                    <Checkbox
                                      id={`c-${sid}`}
                                      checked={checked}
                                      disabled={busy}
                                      onCheckedChange={(v) => void setCell(role, perm.key, v === true)}
                                      aria-label={`${labelByKey[role] ?? role} — ${perm.key}`}
                                    />
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </details>

        <Dialog open={editKey !== null} onOpenChange={(o) => !o && setEditKey(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Description</DialogTitle>
              <DialogDescription>
                <code className="text-xs">{editKey}</code>
              </DialogDescription>
            </DialogHeader>
            <Label htmlFor="edit-desc" className="sr-only">
              Description
            </Label>
            <Input id="edit-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditKey(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => editKey && void saveDescription(editKey, editDesc.trim() || editKey)}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteKey !== null} onOpenChange={(o) => !o && setDeleteKey(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette permission ?</AlertDialogTitle>
              <AlertDialogDescription>
                La clé <code className="text-xs">{deleteKey}</code> sera retirée du catalogue, des défauts par rôle et
                des surcharges utilisateur (cascade). Les routes qui l’utilisent cesseront de la vérifier.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteRoleKey !== null} onOpenChange={(o) => !o && setDeleteRoleKey(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce rôle ?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Le rôle <code className="text-xs text-foreground">{deleteRoleKey}</code> sera retiré du catalogue.
                    Les permissions par défaut associées seront supprimées (cascade).
                  </p>
                  {deleteRoleReassignTarget ? (
                    <p>
                      <strong className="text-foreground">
                        {roleCounts[deleteRoleKey ?? ""] ?? 0} compte(s)
                      </strong>{" "}
                      avec ce rôle passeront automatiquement sur{" "}
                      <strong className="text-foreground">
                        {deleteRoleReassignTarget.label}
                      </strong>{" "}
                      (<code className="text-xs">{deleteRoleReassignTarget.role_key}</code>) — rôle de rang inférieur le
                      plus proche, ou le rang le plus bas restant si ce rôle était déjà le plus bas (dans ce cas les
                      comptes peuvent hériter d’un rôle un peu plus « haut » — gardez un rôle de base si besoin).
                    </p>
                  ) : (
                    <p className="text-destructive">
                      Impossible de déterminer un rôle de substitution (catalogue vide ou un seul rôle).
                    </p>
                  )}
                  <p>
                    Les rôles marqués « système » peuvent aussi être supprimés ; vérifiez qu’il reste au moins un rôle
                    pour l’inscription des nouveaux comptes (rôle par défaut = plus bas <span className="font-mono">sort_rank</span>
                    ).
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingRole}>Annuler</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deletingRole || !deleteRoleReassignTarget}
                onClick={() => void confirmDeleteRole()}
              >
                {deletingRole ? "Suppression…" : "Supprimer"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
