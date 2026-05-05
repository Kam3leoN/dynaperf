import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  BONUS_AUDIT_LAYOUT,
  BONUS_TYPE_LABELS,
  TARIFF_VERSION,
  emptyTariffDefaults,
  parseBonusTariffJson,
  serializeBonusTariff,
  type BonusAuditTypeKey,
  type BonusTariffDataV2,
} from "@/lib/bonusTariff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faPenToSquare, faPlus, faSpinner, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

type TariffRow = {
  id: string;
  year: number;
  tariff_data: Json;
  notes: string | null;
  updated_at: string;
};

const TYPE_ROWS = BONUS_AUDIT_LAYOUT.filter(
  (x): x is { kind: "row"; key: BonusAuditTypeKey; label: string } => x.kind === "row",
);

function parseMoneyInput(s: string): number {
  const n = Number.parseFloat(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatEuro(value: number): string {
  return `${value.toFixed(0)} €`;
}

function TariffSummaryTable({ tariff }: { tariff: BonusTariffDataV2 }) {
  return (
    <div className="space-y-4">
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 pl-2">Type</TableHead>
            <TableHead className="h-10 w-[320px] text-right">1er / 2e / 3e+ (€)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TYPE_ROWS.map((def) => {
            const r = tariff.presentiel_by_type[def.key];
            return (
              <TableRow key={def.key} className="hover:bg-muted/30">
                <TableCell className="py-2 pr-2 pl-2">{def.label}</TableCell>
                <TableCell className="py-2 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Badge variant="outline" className="h-7 px-2 font-mono tabular-nums">
                      {formatEuro(r.first)}
                    </Badge>
                    <Badge variant="outline" className="h-7 px-2 font-mono tabular-nums">
                      {formatEuro(r.second)}
                    </Badge>
                    <Badge variant="outline" className="h-7 px-2 font-mono tabular-nums">
                      {formatEuro(r.third_plus)}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/15 p-3">
          <p className="mb-2 text-sm font-semibold text-foreground">Prime volume</p>
          <ul className="space-y-1 text-xs text-muted-foreground sm:text-sm">
            {tariff.volume_tiers.map((v, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>{v.condition.trim() ? v.condition : `Palier ${i + 1} (non renseigné)`}</span>
                <Badge variant="outline" className="h-7 shrink-0 px-2 font-mono tabular-nums">
                  {formatEuro(v.amount)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-muted/15 p-3">
          <p className="mb-2 text-sm font-semibold text-foreground">Prime CA offres entreprises</p>
          <ul className="space-y-1 text-xs text-muted-foreground sm:text-sm">
            {tariff.ca_tiers.map((v, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>{v.condition.trim() ? v.condition : `Palier CA ${i + 1} (non renseigné)`}</span>
                <Badge variant="outline" className="h-7 shrink-0 px-2 font-mono tabular-nums">
                  {formatEuro(v.amount)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TariffEditForm({
  tariff,
  onChange,
}: {
  tariff: BonusTariffDataV2;
  onChange: (next: BonusTariffDataV2) => void;
}) {
  const setTier = (key: BonusAuditTypeKey, field: "first" | "second" | "third_plus", value: string) => {
    onChange({
      ...tariff,
      presentiel_by_type: {
        ...tariff.presentiel_by_type,
        [key]: {
          ...tariff.presentiel_by_type[key],
          [field]: parseMoneyInput(value),
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-2">Type</TableHead>
            <TableHead className="w-[120px]">1er (€)</TableHead>
            <TableHead className="w-[120px]">2e (€)</TableHead>
            <TableHead className="w-[120px]">3e+ (€)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TYPE_ROWS.map((row) => {
            const r = tariff.presentiel_by_type[row.key];
            return (
              <TableRow key={row.key} className="hover:bg-muted/30">
                <TableCell className="py-2 pl-2">{row.label}</TableCell>
                <TableCell className="py-2">
                  <Input value={String(r.first)} onChange={(e) => setTier(row.key, "first", e.target.value)} inputMode="decimal" className="h-8" />
                </TableCell>
                <TableCell className="py-2">
                  <Input value={String(r.second)} onChange={(e) => setTier(row.key, "second", e.target.value)} inputMode="decimal" className="h-8" />
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    value={String(r.third_plus)}
                    onChange={(e) => setTier(row.key, "third_plus", e.target.value)}
                    inputMode="decimal"
                    className="h-8"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Prime volume</p>
          {tariff.volume_tiers.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px] gap-2">
              <Input
                value={row.condition}
                onChange={(e) => {
                  const volume_tiers = tariff.volume_tiers.map((x, idx) => (idx === i ? { ...x, condition: e.target.value } : x));
                  onChange({ ...tariff, volume_tiers });
                }}
                placeholder={`Palier ${i + 1}`}
                className="h-8"
              />
              <Input
                value={String(row.amount)}
                onChange={(e) => {
                  const volume_tiers = tariff.volume_tiers.map((x, idx) =>
                    idx === i ? { ...x, amount: parseMoneyInput(e.target.value) } : x,
                  );
                  onChange({ ...tariff, volume_tiers });
                }}
                inputMode="decimal"
                className="h-8"
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Prime CA offres entreprises</p>
          {tariff.ca_tiers.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px] gap-2">
              <Input
                value={row.condition}
                onChange={(e) => {
                  const ca_tiers = tariff.ca_tiers.map((x, idx) => (idx === i ? { ...x, condition: e.target.value } : x));
                  onChange({ ...tariff, ca_tiers });
                }}
                placeholder={`Palier CA ${i + 1}`}
                className="h-8"
              />
              <Input
                value={String(row.amount)}
                onChange={(e) => {
                  const ca_tiers = tariff.ca_tiers.map((x, idx) =>
                    idx === i ? { ...x, amount: parseMoneyInput(e.target.value) } : x,
                  );
                  onChange({ ...tariff, ca_tiers });
                }}
                inputMode="decimal"
                className="h-8"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Vue consolidée des barèmes primes par année (lecture seule).
 */
export default function AdminPrimeTariffsOverview() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [rows, setRows] = useState<TariffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTariff, setEditingTariff] = useState<BonusTariffDataV2 | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createYear, setCreateYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    if (!user || !isSuperAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bonus_prime_tariffs")
        .select("id,year,tariff_data,notes,updated_at")
        .order("year", { ascending: false });

      if (error) {
        toast.error(error.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as TariffRow[]);
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => current + 1 - i);
  }, []);

  const startEdit = (row: TariffRow) => {
    setEditingId(row.id);
    setEditingTariff(parseBonusTariffJson(row.tariff_data));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTariff(null);
  };

  const saveEdit = async (row: TariffRow) => {
    if (!editingTariff) return;
    setSavingId(row.id);
    const payload = {
      tariff_data: serializeBonusTariff({ ...editingTariff, version: TARIFF_VERSION }),
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("bonus_prime_tariffs").update(payload).eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Barème ${row.year} mis à jour.`);
    cancelEdit();
    void load();
  };

  const deleteYear = async (row: TariffRow) => {
    if (!window.confirm(`Supprimer le barème ${row.year} ?`)) return;
    const { error } = await supabase.from("bonus_prime_tariffs").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Barème ${row.year} supprimé.`);
    if (editingId === row.id) cancelEdit();
    void load();
  };

  const createYearTariff = async () => {
    setCreating(true);
    const payload = {
      year: createYear,
      tariff_data: serializeBonusTariff(emptyTariffDefaults()),
      notes: null,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("bonus_prime_tariffs").upsert(payload, { onConflict: "year" });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Exercice ${createYear} prêt à éditer.`);
    void load();
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight">Barèmes primes</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé au super administrateur.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <FontAwesomeIcon icon={faBook} className="text-primary" aria-hidden />
            Barèmes annuels — primes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestion CRUD des barèmes enregistrés ({BONUS_TYPE_LABELS.rdp} … {BONUS_TYPE_LABELS.mep}, primes volume et CA) avec
            tableau unique pour tous les formats.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/primes/suivi">Suivi primes</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Créer / initialiser un exercice</CardTitle>
          <CardDescription>Ajoute une année avec les valeurs par défaut, puis édite-la directement ici.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="prime-overview-year">Année</Label>
            <Input
              id="prime-overview-year"
              type="number"
              value={String(createYear)}
              onChange={(e) => setCreateYear(Number.parseInt(e.target.value || "0", 10) || new Date().getFullYear())}
              className="h-9 w-[140px]"
            />
          </div>
          <Button type="button" size="sm" className="gap-2" onClick={() => void createYearTariff()} disabled={creating}>
            <FontAwesomeIcon icon={creating ? faSpinner : faPlus} className={creating ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            Créer / Réinitialiser
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun barème en base pour le moment.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const tariff = parseBonusTariffJson(row.tariff_data);
            const isEditing = editingId === row.id;
            const canSave = isEditing && editingTariff;
            return (
              <Card key={row.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">Exercice {row.year}</CardTitle>
                    <CardDescription>
                      Dernière mise à jour :{" "}
                      {new Date(row.updated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => startEdit(row)}>
                        <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" aria-hidden />
                        Éditer
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-2"
                          onClick={() => void saveEdit(row)}
                          disabled={!canSave || savingId === row.id}
                        >
                          <FontAwesomeIcon icon={savingId === row.id ? faSpinner : faPenToSquare} className={savingId === row.id ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                          Enregistrer
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                          Annuler
                        </Button>
                      </>
                    )}
                    <Button type="button" variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => void deleteYear(row)}>
                      <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" aria-hidden />
                      Supprimer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing && editingTariff ? <TariffEditForm tariff={editingTariff} onChange={setEditingTariff} /> : <TariffSummaryTable tariff={tariff} />}
                  {row.notes?.trim() ? (
                    <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Notes : </span>
                      {row.notes}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
