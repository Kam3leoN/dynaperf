import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner, faBan } from "@fortawesome/free-solid-svg-icons";
import { useStaffRolesCatalog } from "@/hooks/useStaffRolesCatalog";
import type { Database } from "@/integrations/supabase/types";

type InviteRow = Database["public"]["Tables"]["app_invitations"]["Row"];

/**
 * Liens d’invitation : création (jeton affiché une fois), liste et suspension.
 */
export default function AdminInvitations() {
  const { roles, loading: rolesLoading } = useStaffRolesCatalog(true);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [roleKey, setRoleKey] = useState<string>("member");
  const [expires, setExpires] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [maxUses, setMaxUses] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_invitations")
      .select("id, label, role_key, expires_at, max_uses, uses_count, created_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as InviteRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createInvite = async () => {
    const mu = maxUses.trim() === "" ? null : Number.parseInt(maxUses, 10);
    if (mu !== null && (!Number.isFinite(mu) || mu < 1)) {
      toast.error("Nombre d’utilisations invalide (vide = illimité si supporté, sinon ≥ 1).");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc("admin_create_app_invitation", {
      p_label: label.trim() || null,
      p_role_key: roleKey || null,
      p_expires_at: new Date(expires).toISOString(),
      p_max_uses: mu,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const raw = row && typeof row === "object" && "raw_token" in row ? (row as { raw_token: string }).raw_token : undefined;
    if (raw) {
      const fullUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/auth?invite=${encodeURIComponent(raw)}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Lien copié dans le presse-papiers (jeton unique — conservez-le).");
      } catch {
        toast.success(`Jeton créé : ${raw}`);
      }
    } else {
      toast.success("Invitation créée");
    }
    setOpen(false);
    setLabel("");
    void load();
  };

  const revoke = async (id: string) => {
    if (!confirm("Suspendre cette invitation ?")) return;
    const { error } = await supabase.from("app_invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation suspendue");
      void load();
    }
  };

  const copyLink = async (tokenDemo: string) => {
    const fullUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/auth?invite=${encodeURIComponent(tokenDemo)}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Modèle de lien copié (le jeton réel a été affiché à la création uniquement).");
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invitations</h1>
          <p className="text-sm text-muted-foreground mt-1">Liens à usage limité, avec rôle attribuable à l’inscription.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="rounded-md gap-2 shrink-0">
              <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
              Nouvelle invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une invitation</DialogTitle>
              <DialogDescription>
                Le lien complet avec jeton sera copié automatiquement après création (affichage unique).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label htmlFor="inv-label">Libellé interne</Label>
                <Input id="inv-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Campagne recrutement Q2" />
              </div>
              <div className="grid gap-2">
                <Label>Rôle attribué</Label>
                <Select value={roleKey} onValueChange={setRoleKey} disabled={rolesLoading}>
                  <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.role_key} value={r.role_key}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-exp">Expiration</Label>
                <Input id="inv-exp" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-max">Utilisations max (vide = illimité)</Label>
                <Input id="inv-max" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="1" inputMode="numeric" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={() => void createInvite()} disabled={creating}>
                {creating ? <FontAwesomeIcon icon={faSpinner} className="animate-spin h-4 w-4" /> : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-x-auto">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Chargement…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">Libellé</TableHead>
                <TableHead className="text-xs uppercase">Rôle</TableHead>
                <TableHead className="text-xs uppercase">Expire</TableHead>
                <TableHead className="text-xs uppercase">Utilisations</TableHead>
                <TableHead className="text-xs uppercase">État</TableHead>
                <TableHead className="text-xs uppercase w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const expired = new Date(r.expires_at) < new Date();
                const revoked = !!r.revoked_at;
                const atLimit = r.max_uses != null && r.uses_count >= r.max_uses;
                const state = revoked ? "Suspendue" : expired ? "Expirée" : atLimit ? "Épuisée" : "Active";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.label ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{r.role_key ?? "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{new Date(r.expires_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {r.uses_count}
                      {r.max_uses != null ? ` / ${r.max_uses}` : " / ∞"}
                    </TableCell>
                    <TableCell className="text-sm">{state}</TableCell>
                    <TableCell>
                      {!revoked && !expired && !atLimit ? (
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" title="Suspendre" onClick={() => void revoke(r.id)}>
                          <FontAwesomeIcon icon={faBan} className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
