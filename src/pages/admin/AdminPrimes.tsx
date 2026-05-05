import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  BONUS_AUDIT_LAYOUT,
  parseBonusTariffJson,
  serializeBonusTariff,
  emptyTariffDefaults,
  TARIFF_VERSION,
  DEFAULT_RD_PRESENTIEL,
  DEFAULT_RD_DISTANCIEL,
  type BonusAuditTypeKey,
  type TierRates,
  type VolumeTierRow,
  type CaTierRow,
  type BonusTariffDataV2,
} from "@/lib/bonusTariff";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faCalculator, faChartLine, faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function parseMoneyInput(s: string): number {
  const n = Number.parseFloat(String(s).replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Super-admin : barème primes bonus par année (`bonus_prime_tariffs.tariff_data` JSON version 2).
 */
export default function AdminPrimes() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [searchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const yearFromUrl = searchParams.get("year");
  const parsedUrlYear = yearFromUrl ? Number.parseInt(yearFromUrl, 10) : NaN;

  const yearOptions = useMemo(() => {
    const ys: number[] = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) ys.push(y);
    return ys;
  }, [currentYear]);

  const [year, setYear] = useState(() => (!Number.isNaN(parsedUrlYear) ? parsedUrlYear : currentYear));
  const [tariff, setTariff] = useState<BonusTariffDataV2>(() => emptyTariffDefaults());
  const [notes, setNotes] = useState("");
  const [rowId, setRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const y = searchParams.get("year");
    const n = y ? Number.parseInt(y, 10) : NaN;
    if (!Number.isNaN(n)) setYear(n);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!user || !isSuperAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bonus_prime_tariffs")
        .select("id,year,tariff_data,notes")
        .eq("year", year)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        setRowId(null);
        setTariff(emptyTariffDefaults());
        setNotes("");
        return;
      }

      if (!data) {
        setRowId(null);
        setTariff(emptyTariffDefaults());
        setNotes("");
        return;
      }

      setRowId(data.id);
      setTariff(parseBonusTariffJson(data.tariff_data));
      setNotes(data.notes ?? "");
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const defaultForKey = (key: BonusAuditTypeKey): TierRates =>
    key === "rdd" ? DEFAULT_RD_DISTANCIEL : DEFAULT_RD_PRESENTIEL;

  const setTier = (key: BonusAuditTypeKey, field: keyof TierRates, value: string) => {
    setTariff((prev) => ({
      ...prev,
      presentiel_by_type: {
        ...prev.presentiel_by_type,
        [key]: {
          ...(prev.presentiel_by_type[key] ?? defaultForKey(key)),
          [field]: parseMoneyInput(value),
        },
      },
    }));
  };

  const setVolumeRow = (index: number, patch: Partial<VolumeTierRow>) => {
    setTariff((prev) => {
      const volume_tiers = prev.volume_tiers.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, volume_tiers };
    });
  };

  const setCaRow = (index: number, patch: Partial<CaTierRow>) => {
    setTariff((prev) => {
      const ca_tiers = prev.ca_tiers.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, ca_tiers };
    });
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const tariff_data = serializeBonusTariff({
        ...tariff,
        version: TARIFF_VERSION,
      });
      const payload = {
        year,
        tariff_data,
        notes: notes.trim() || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (rowId) {
        const { error } = await supabase.from("bonus_prime_tariffs").update(payload).eq("id", rowId);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Barème mis à jour.");
      } else {
        const { data, error } = await supabase.from("bonus_prime_tariffs").insert(payload).select("id").single();
        if (error) {
          toast.error(error.message);
          return;
        }
        setRowId(data.id);
        toast.success("Barème créé pour cette année.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight">Primes bonus</h1>
        <p className="mt-2 text-sm text-muted-foreground">Réservé au super administrateur.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <FontAwesomeIcon icon={faCalculator} className="text-primary" aria-hidden />
            Configuration — primes bonus
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Barème stocké dans <code className="text-xs">bonus_prime_tariffs.tariff_data</code> (JSON v{TARIFF_VERSION}, super_admin
            uniquement).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/primes/overview">
              <FontAwesomeIcon icon={faBook} className="mr-2 h-3 w-3" aria-hidden />
              Barèmes annuels
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/primes/suivi">
              <FontAwesomeIcon icon={faChartLine} className="mr-2 h-3 w-3" aria-hidden />
              Suivi
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">150, 155–174, 175+ : qu’est-ce que c’est ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Le <strong className="text-foreground">150</strong> dans les objectifs service (KPI « audits terrain ») est une{" "}
            <strong className="text-foreground">cible annuelle</strong> d’activité — ce n’est pas, par défaut, un seuil de prime
            dans l’app.
          </p>
          <p>
            Les paliers du type <strong className="text-foreground">155–174</strong> et{" "}
            <strong className="text-foreground">175 audits et +</strong> viennent en général du{" "}
            <strong className="text-foreground">document d’objectifs individuels / variable</strong> (prime volume sur le nombre
            d’audits réalisés). Tu les saisis librement dans la section « Prime volume » ci-dessous (condition en texte + montant).
          </p>
          <p>
            Les montants par passage (ex. 75 € / 10 € / 0 € en présentiel) sont dans le tableau ; le{" "}
            <strong className="text-foreground">distanciel (RDD)</strong> reprend la logique « visio » pour les rencontres
            dirigeants.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exercice</CardTitle>
          <CardDescription>Sélectionne l’année puis enregistre.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="prime-year">Année</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number.parseInt(v, 10))}>
              <SelectTrigger id="prime-year" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" className="gap-2" onClick={() => void onSave()} disabled={saving || loading}>
            <FontAwesomeIcon icon={saving ? faSpinner : faFloppyDisk} className={saving ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Montants par format et type</CardTitle>
              <CardDescription>
                Pour chaque ligne : <strong>1er</strong>, <strong>2e</strong> et <strong>3e audit et suivants</strong> dans
                l’année (passage unique partenaire + lieu + club : moteur de calcul).{" "}
                <strong>RDD</strong> = rencontre dirigeants en <strong>distanciel</strong> (équivalent « visio » pour les RD).
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">1er audit (€)</th>
                    <th className="py-2 pr-3 font-medium">2e audit (€)</th>
                    <th className="py-2 font-medium">3e+ (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {BONUS_AUDIT_LAYOUT.map((def) => {
                    if (def.kind === "group") {
                      return (
                        <tr key={`grp-${def.groupKey}`}>
                          <td
                            colSpan={4}
                            className="border-b border-border/80 bg-muted/40 px-3 py-2.5 font-semibold text-foreground"
                          >
                            {def.label}
                          </td>
                        </tr>
                      );
                    }
                    const p = tariff.presentiel_by_type[def.key] ?? defaultForKey(def.key);
                    return (
                      <tr key={def.key} className="border-b border-border/60">
                        <td
                          className={cn(
                            "py-2 pr-3 align-middle text-foreground",
                            def.indent && "border-l-2 border-primary/30 bg-muted/10 pl-8",
                          )}
                        >
                          {def.label}
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            inputMode="decimal"
                            className="h-9 w-[88px]"
                            value={String(p.first)}
                            onChange={(e) => setTier(def.key, "first", e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            inputMode="decimal"
                            className="h-9 w-[88px]"
                            value={String(p.second)}
                            onChange={(e) => setTier(def.key, "second", e.target.value)}
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            inputMode="decimal"
                            className="h-9 w-[88px]"
                            value={String(p.third_plus)}
                            onChange={(e) => setTier(def.key, "third_plus", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prime volume (conditions + montants)</CardTitle>
              <CardDescription>
                Trois lignes libres : décris la condition (plage d’audits, règle métier…) et le montant de prime associé.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tariff.volume_tiers.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`vol-cond-${index}`}>Palier {index + 1} — condition</Label>
                    <Textarea
                      id={`vol-cond-${index}`}
                      rows={2}
                      value={row.condition}
                      onChange={(e) => setVolumeRow(index, { condition: e.target.value })}
                      placeholder={
                        index === 0
                          ? "Ex. 155 à 174 audits individuels dans l’année"
                          : index === 1
                            ? "Ex. 175 audits ou plus"
                            : "Ex. palier supplémentaire ou laisser vide"
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:w-[120px]">
                    <Label htmlFor={`vol-amt-${index}`}>Montant (€)</Label>
                    <Input
                      id={`vol-amt-${index}`}
                      inputMode="decimal"
                      className="h-9"
                      value={String(row.amount)}
                      onChange={(e) => setVolumeRow(index, { amount: parseMoneyInput(e.target.value) })}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prime CA offres entreprises</CardTitle>
              <CardDescription>
                Prime annuelle selon l’évolution du chiffre d’affaires. Tu peux ajuster les paliers et montants selon la
                convention en vigueur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tariff.ca_tiers.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <div className="space-y-2">
                    <Label htmlFor={`ca-cond-${index}`}>Palier CA {index + 1} — évolution</Label>
                    <Input
                      id={`ca-cond-${index}`}
                      value={row.condition}
                      onChange={(e) => setCaRow(index, { condition: e.target.value })}
                      placeholder={
                        index === 0
                          ? "Ex. 0% à 4,99%"
                          : index === 1
                            ? "Ex. 5% à 9,99%"
                            : index === 2
                              ? "Ex. 10% à 19,99%"
                              : "Ex. 20% et +"
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:w-[120px]">
                    <Label htmlFor={`ca-amt-${index}`}>Montant (€)</Label>
                    <Input
                      id={`ca-amt-${index}`}
                      inputMode="decimal"
                      className="h-9"
                      value={String(row.amount)}
                      onChange={(e) => setCaRow(index, { amount: parseMoneyInput(e.target.value) })}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes internes</CardTitle>
              <CardDescription>Rappels hors JSON (paiement mensuel, pièces obligatoires, etc.).</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conditions de versement, PJ, présence animateur…"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
