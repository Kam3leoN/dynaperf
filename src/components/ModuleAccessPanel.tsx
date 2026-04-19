import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { fetchManagedUsersList, type ManagedUser } from "@/pages/admin/AdminUsers";
import { cn } from "@/lib/utils";
import { ORG_TITLE_LABELS } from "@/lib/memberDirectory";
import { ActionIconButton } from "@/components/ActionIconButton";

export interface ModuleAccessPanelModule {
  id: string;
  module_key: string;
  label: string;
  is_enabled: boolean;
}

interface OverrideRow {
  id: string;
  user_id: string;
  enabled: boolean;
  display_name: string | null;
}

interface ModuleAccessPanelProps {
  module: ModuleAccessPanelModule;
  /** Ne charge les surcharges que lorsque l’accordéon est ouvert */
  active: boolean;
  isSuperAdmin: boolean;
  onChanged?: () => void;
}

/**
 * Détail accès module : règle par défaut + surcharges `user_module_overrides`.
 */
export function ModuleAccessPanel({
  module,
  active,
  isSuperAdmin,
  onChanged,
}: ModuleAccessPanelProps) {
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pickUserId, setPickUserId] = useState<string>("");
  const [pickEnabled, setPickEnabled] = useState<"true" | "false">("true");
  const [searchPick, setSearchPick] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOverrides = useCallback(async () => {
    setLoading(true);
    try {
      const { data: ovs, error } = await (supabase as any)
        .from("user_module_overrides")
        .select("id, user_id, enabled")
        .eq("module_key", module.module_key);
      if (error) {
        toast.error(error.message);
        setRows([]);
        return;
      }
      const list = (ovs ?? []) as { id: string; user_id: string; enabled: boolean }[];
      const ids = list.map((o) => o.user_id);
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      const { data: profs, error: pErr } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      if (pErr) {
        toast.error(pErr.message);
        setRows([]);
        return;
      }
      const nameById = new Map<string, string | null>(
        (profs ?? []).map((p: { user_id: string; display_name: string | null }) => [
          p.user_id,
          p.display_name,
        ]),
      );
      setRows(
        list.map((o) => ({
          ...o,
          display_name: nameById.get(o.user_id) ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [module.module_key]);

  useEffect(() => {
    if (!active) return;
    void loadOverrides();
    setPickUserId("");
    setSearchPick("");
    setPickEnabled("true");
  }, [active, loadOverrides]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setUsersLoading(true);
    void fetchManagedUsersList()
      .then((list) => {
        if (!cancelled) setAllUsers(list);
      })
      .catch(() => {
        if (!cancelled) setAllUsers([]);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const existingUserIds = useMemo(() => new Set(rows.map((r) => r.user_id)), [rows]);

  const pickCandidates = useMemo(() => {
    const q = searchPick.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (existingUserIds.has(u.id)) return false;
      if (!q) return true;
      const name = (u.displayName ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allUsers, existingUserIds, searchPick]);

  const handleRemove = async (row: OverrideRow) => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("user_module_overrides")
      .delete()
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Surcharge retirée (héritage des règles par défaut)");
    await loadOverrides();
    onChanged?.();
  };

  const handleAdd = async () => {
    if (!pickUserId) {
      toast.error("Choisissez un utilisateur");
      return;
    }
    setSaving(true);
    const enabled = pickEnabled === "true";
    const { error } = await (supabase as any).from("user_module_overrides").upsert(
      {
        user_id: pickUserId,
        module_key: module.module_key,
        enabled,
      },
      { onConflict: "user_id,module_key" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(enabled ? "Accès forcé (autorisé)" : "Accès refusé explicitement");
    setPickUserId("");
    setSearchPick("");
    await loadOverrides();
    onChanged?.();
  };

  const moduleOffNote = !module.is_enabled;

  return (
    <div className="space-y-4 pl-1">
      <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-xs leading-relaxed text-foreground">
        <p className="font-medium text-foreground mb-1">Règle par défaut</p>
        <p className="text-muted-foreground">
          Sans surcharge, l’accès est <strong>refusé</strong> pour tous les comptes, sauf&nbsp;:
        </p>
        <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-muted-foreground">
          <li>
            rôle <span className="font-mono text-foreground">super_admin</span>
          </li>
          <li>
            titre organisationnel <span className="font-mono text-foreground">owner</span> (
            {ORG_TITLE_LABELS.owner}) sur le profil
          </li>
        </ul>
        <p className="mt-2 text-muted-foreground">
          Les lignes ci-dessous sont des <strong>exceptions</strong> (forcer autorisé ou refusé) par utilisateur.
        </p>
      </div>

      {moduleOffNote ? (
        <div
          className={cn(
            "rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground",
            !isSuperAdmin && "opacity-90",
          )}
          role="status"
        >
          {isSuperAdmin ? (
            <>
              Ce module est <strong>désactivé globalement</strong> : personne ne l’a dans l’application tant
              qu’il n’est pas réactivé. Les surcharges ci-dessous s’appliqueront à la réactivation.
            </>
          ) : (
            <>Ce module est désactivé globalement : les surcharges ne sont pas modifiables ici.</>
          )}
        </div>
      ) : null}

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Exceptions enregistrées</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune surcharge pour ce module.</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.display_name ?? "Sans nom"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{row.user_id}</p>
                  <p className="text-xs text-foreground mt-0.5">
                    {row.enabled ? (
                      <span className="text-primary font-medium">Autorisé</span>
                    ) : (
                      <span className="text-destructive font-medium">Refusé</span>
                    )}
                  </p>
                </div>
                <ActionIconButton
                  type="button"
                  label="Retirer la surcharge (revenir au défaut du rôle)"
                  variant="destructive"
                  className="shrink-0"
                  disabled={saving || (!module.is_enabled && !isSuperAdmin)}
                  onClick={() => void handleRemove(row)}
                >
                  <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                </ActionIconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {module.is_enabled || isSuperAdmin ? (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <p className="text-xs font-medium text-muted-foreground">Ajouter une exception</p>
          <div className="space-y-2">
            <Label htmlFor={`module-access-user-search-${module.module_key}`} className="text-xs">
              Rechercher un utilisateur
            </Label>
            <Input
              id={`module-access-user-search-${module.module_key}`}
              value={searchPick}
              onChange={(e) => setSearchPick(e.target.value)}
              placeholder="Nom ou e-mail…"
              disabled={usersLoading || saving}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Utilisateur</Label>
            <Select value={pickUserId} onValueChange={setPickUserId} disabled={usersLoading || saving}>
              <SelectTrigger>
                <SelectValue placeholder={usersLoading ? "Chargement…" : "Choisir…"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {pickCandidates.slice(0, 200).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="truncate">{u.displayName}</span>
                    <span className="text-muted-foreground text-xs ml-1">({u.email})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Surcharge</Label>
            <Select value={pickEnabled} onValueChange={(v) => setPickEnabled(v as "true" | "false")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Forcer autorisé</SelectItem>
                <SelectItem value="false">Forcer refusé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="w-full" disabled={saving || !pickUserId} onClick={() => void handleAdd()}>
            Enregistrer l’exception
          </Button>
        </div>
      ) : null}
    </div>
  );
}
