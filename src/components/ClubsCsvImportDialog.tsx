import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileImport } from "@fortawesome/free-solid-svg-icons";
import {
  decodeCsvTextFromArrayBuffer,
  diffClub,
  normalizeClubKey,
  parseClubsCsvText,
  type ParsedClubRow,
  type FieldChange,
} from "@/lib/clubsCsvParse";
interface ClubRow {
  id: string;
  nom: string;
  format: string;
  president_nom: string;
  agence_rattachement: string | null;
  agence_mere: string | null;
  telephone_president: string | null;
  email_president: string | null;
  adresse: string | null;
  departement: string | null;
  statut: string;
  nb_membres_actifs: number;
  nb_leads_transformes: number;
  montant_ca: number;
  date_creation: string | null;
  date_desactivation: string | null;
}

type PlanKind = "new" | "modified" | "unchanged";

interface PlanItem {
  key: string;
  kind: PlanKind;
  csv: ParsedClubRow;
  clubId?: string;
  changes: FieldChange[];
}

function csvToDbInsert(row: ParsedClubRow) {
  return {
    nom: row.nom,
    format: row.format,
    president_nom: row.president_nom,
    vice_president_nom: null as string | null,
    agence_rattachement: row.agence_rattachement,
    agence_mere: row.agence_mere,
    telephone_president: row.telephone_president,
    telephone_vice_president: null as string | null,
    email_president: row.email_president,
    adresse: row.adresse,
    departement: row.departement,
    statut: row.statut,
    nb_membres_actifs: row.nb_membres_actifs,
    nb_leads_transformes: row.nb_leads_transformes,
    montant_ca: row.montant_ca,
    date_creation: row.date_creation,
    date_desactivation: row.date_desactivation,
  };
}

function csvToDbUpdate(row: ParsedClubRow) {
  return {
    format: row.format,
    president_nom: row.president_nom,
    agence_rattachement: row.agence_rattachement,
    agence_mere: row.agence_mere,
    telephone_president: row.telephone_president,
    email_president: row.email_president,
    adresse: row.adresse,
    departement: row.departement,
    statut: row.statut,
    nb_membres_actifs: row.nb_membres_actifs,
    nb_leads_transformes: row.nb_leads_transformes,
    montant_ca: row.montant_ca,
    date_creation: row.date_creation,
    date_desactivation: row.date_desactivation,
  };
}

function buildPlan(clubs: ClubRow[], csvRows: ParsedClubRow[]): PlanItem[] {
  const byNorm = new Map<string, ClubRow>();
  for (const c of clubs) {
    const k = normalizeClubKey(c.nom);
    if (!byNorm.has(k)) byNorm.set(k, c);
  }

  const items: PlanItem[] = [];
  for (const csv of csvRows) {
    const k = normalizeClubKey(csv.nom);
    const existing = byNorm.get(k);
    if (!existing) {
      items.push({ key: `new-${k}`, kind: "new", csv, changes: [] });
      continue;
    }
    const changes = diffClub(csv, existing);
    if (changes.length === 0) {
      items.push({ key: `ok-${k}`, kind: "unchanged", csv, clubId: existing.id, changes: [] });
    } else {
      items.push({ key: `mod-${k}`, kind: "modified", csv, clubId: existing.id, changes });
    }
  }

  items.sort((a, b) => a.csv.nom.localeCompare(b.csv.nom, "fr"));
  return items;
}

export interface ClubsCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubs: ClubRow[];
  onApplied: () => void;
}

export function ClubsCsvImportDialog({ open, onOpenChange, clubs, onApplied }: ClubsCsvImportDialogProps) {
  const [busy, setBusy] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ duplicateNomInCsv: number; linesSkipped: number } | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const resetState = useCallback(() => {
    setFileLabel(null);
    setParseError(null);
    setMeta(null);
    setPlan([]);
    setSelected({});
  }, []);

  const handleClose = (v: boolean) => {
    if (!v && !busy) resetState();
    onOpenChange(v);
  };

  const applyFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setFileLabel(file.name);
      setBusy(true);
      try {
        const buf = await file.arrayBuffer();
        const text = decodeCsvTextFromArrayBuffer(buf);
        const parsed = parseClubsCsvText(text);
        if (!parsed.ok) {
          setParseError(parsed.error);
          setPlan([]);
          setMeta(null);
          return;
        }
        if (parsed.rows.length === 0) {
          setParseError("Aucune ligne valide trouvée.");
          setPlan([]);
          setMeta(null);
          return;
        }
        const p = buildPlan(clubs, parsed.rows);
        setPlan(p);
        setMeta({ duplicateNomInCsv: parsed.duplicateNomInCsv, linesSkipped: parsed.linesSkipped });
        const sel: Record<string, boolean> = {};
        for (const it of p) {
          sel[it.key] = it.kind === "new" || it.kind === "modified";
        }
        setSelected(sel);
      } catch {
        setParseError("Lecture du fichier impossible.");
        setPlan([]);
        setMeta(null);
      } finally {
        setBusy(false);
      }
    },
    [clubs],
  );

  const counts = useMemo(() => {
    let n = 0,
      m = 0,
      u = 0;
    for (const it of plan) {
      if (it.kind === "new") n++;
      else if (it.kind === "modified") m++;
      else u++;
    }
    return { n, m, u };
  }, [plan]);

  const selectedCount = useMemo(() => plan.filter((it) => selected[it.key]).length, [plan, selected]);

  const runApply = async () => {
    const toInsert: ParsedClubRow[] = [];
    const toUpdate: { id: string; row: ParsedClubRow }[] = [];
    for (const it of plan) {
      if (!selected[it.key]) continue;
      if (it.kind === "new") toInsert.push(it.csv);
      else if (it.kind === "modified" && it.clubId) toUpdate.push({ id: it.clubId, row: it.csv });
    }
    if (toInsert.length === 0 && toUpdate.length === 0) {
      toast.message("Rien à appliquer (cochez des lignes ou vérifiez le fichier).");
      return;
    }

    setBusy(true);
    let insertOk = 0;
    let insertFailed = false;

    const chunk = 40;
    for (let i = 0; i < toInsert.length; i += chunk) {
      const batch = toInsert.slice(i, i + chunk).map(csvToDbInsert);
      const { error } = await supabase.from("clubs").insert(batch);
      if (error) {
        insertFailed = true;
        toast.error(`Insertion : ${error.message}`);
        break;
      }
      insertOk += batch.length;
    }

    let updateOk = 0;
    for (const { id, row } of toUpdate) {
      const { error } = await supabase.from("clubs").update(csvToDbUpdate(row)).eq("id", id);
      if (error) toast.error(`Mise à jour ${row.nom} : ${error.message}`);
      else updateOk++;
    }

    setBusy(false);

    if (insertOk === 0 && updateOk === 0) {
      toast.error("Aucune modification n’a pu être enregistrée.");
      return;
    }

    if (!insertFailed && updateOk === toUpdate.length && insertOk === toInsert.length) {
      toast.success(`Import terminé : ${insertOk} création(s), ${updateOk} mise(s) à jour.`);
    } else {
      toast.message(
        `Import partiel : ${insertOk}/${toInsert.length} création(s), ${updateOk}/${toUpdate.length} mise(s) à jour.`,
      );
    }
    onApplied();
    handleClose(false);
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFileImport} className="h-4 w-4 text-primary" />
            Importer un CSV clubs
          </DialogTitle>
          <DialogDescription>
            Format attendu : séparateur <code className="text-xs">;</code>, encodage UTF-8 (BOM) ou Windows-1252, comme
            l’export source. Colonnes : nom, format, président, agences, téléphone, e-mail, adresse, département, statut,
            membres, leads, CA, dates (JJ/MM/AAAA).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 min-h-0 flex-1 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void applyFile(f);
                  }}
                />
                Choisir un fichier…
              </label>
            </Button>
            {fileLabel ? <span className="text-xs text-muted-foreground truncate max-w-[240px]">{fileLabel}</span> : null}
          </div>

          {parseError ? (
            <p className="text-sm text-destructive">{parseError}</p>
          ) : null}

          {meta && plan.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {meta.duplicateNomInCsv > 0 ? (
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-800 dark:text-amber-300">
                  {meta.duplicateNomInCsv} doublon(s) de nom dans le CSV — dernière ligne conservée
                </span>
              ) : null}
              {meta.linesSkipped > 0 ? (
                <span>
                  {meta.linesSkipped} ligne(s) ignorée(s) (colonnes insuffisantes)
                </span>
              ) : null}
            </div>
          ) : null}

          {plan.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{counts.n}</strong> nouveaux
                </span>
                <span>
                  <strong className="text-amber-600 dark:text-amber-400">{counts.m}</strong> modifiés
                </span>
                <span>
                  <strong className="text-muted-foreground">{counts.u}</strong> identiques
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pb-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    for (const it of plan) next[it.key] = it.kind === "new" || it.kind === "modified";
                    setSelected(next);
                  }}
                >
                  Tout sélectionner (nouv. + modif.)
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected({})}>
                  Tout désélectionner
                </Button>
              </div>

              <ScrollArea className="h-[min(420px,50vh)] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>État</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Détails</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.map((it) => (
                      <TableRow key={it.key}>
                        <TableCell>
                          <Checkbox
                            checked={selected[it.key] ?? false}
                            onCheckedChange={(c) => setSelected((s) => ({ ...s, [it.key]: Boolean(c) }))}
                            disabled={it.kind === "unchanged"}
                            aria-label={`Inclure ${it.csv.nom}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {it.kind === "new" ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">Nouveau</span>
                          ) : it.kind === "modified" ? (
                            <span className="font-medium text-amber-600 dark:text-amber-400">Modifié</span>
                          ) : (
                            <span className="text-muted-foreground">Identique</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[200px] truncate" title={it.csv.nom}>
                          {it.csv.nom}
                        </TableCell>
                        <TableCell className="text-xs">
                          {it.kind === "modified" && it.changes.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-0.5 max-w-xl">
                              {it.changes.map((ch) => (
                                <li key={ch.key}>
                                  <span className="font-medium text-foreground">{ch.label}</span>
                                  {" : "}
                                  <span className="text-muted-foreground line-through">{ch.before}</span>
                                  {" → "}
                                  <span className="text-foreground">{ch.after}</span>
                                </li>
                              ))}
                            </ul>
                          ) : it.kind === "unchanged" ? (
                            <span className="text-muted-foreground">Aucune différence avec la base</span>
                          ) : (
                            <span className="text-muted-foreground">Sera créé</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <p className="text-xs text-muted-foreground">
                {selectedCount} ligne(s) cochée(s) pour application. Les logos et champs non présents dans le CSV ne sont
                pas modifiés.
              </p>
            </>
          ) : (
            !parseError && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sélectionnez un export CSV pour afficher la comparaison avec les clubs déjà en base (rapprochement par
                nom).
              </p>
            )
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={() => void runApply()}
            disabled={busy || plan.length === 0 || selectedCount === 0}
            className="bg-primary text-primary-foreground"
          >
            {busy ? "Traitement…" : `Appliquer (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
