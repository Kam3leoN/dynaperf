import { useState, useEffect, useCallback, useMemo } from "react";
import { SignaturePad } from "@/components/ui/signature-pad";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { fetchSuiviItemsConfig, SuiviItemConfig } from "@/data/suiviActiviteItems";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { M3Field } from "@/components/ui/m3-field";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faCheck,
  faXmark,
  faMinus,
  faCircleInfo,
  faSave,
} from "@fortawesome/free-solid-svg-icons";

type ItemStatus = "fait" | "pas_fait" | "nc" | null;

interface ItemAnswer {
  status: ItemStatus;
  observation?: string;
}

export default function SuiviActiviteForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionParam = searchParams.get("version");
  const [items, setItems] = useState<SuiviItemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Header fields
  const [partenaire, setPartenaire] = useState("");
  const [accompagnePar, setAccompagnePar] = useState("");
  const [suiviPar, setSuiviPar] = useState("");
  const [dateEntretien, setDateEntretien] = useState<Date | undefined>();
  const [nbContratsTotal, setNbContratsTotal] = useState("");
  const [nbContratsDernier, setNbContratsDernier] = useState("");
  const [signatureAuditeur, setSignatureAuditeur] = useState<string | null>(null);
  const [signatureAudite, setSignatureAudite] = useState<string | null>(null);

  // Answers per item
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});

  const [partenaires, setPartenaires] = useState<{prenom: string; nom: string}[]>([]);
  const [auditeurs, setAuditeurs] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetchSuiviItemsConfig(versionParam ? parseInt(versionParam) : undefined),
      supabase.from("profiles").select("display_name"),
      supabase.from("partenaires").select("prenom, nom").eq("statut", "actif"),
    ]).then(([configItems, { data: profiles }, { data: parts }]) => {
      setItems(configItems);
      setAuditeurs(
        (profiles ?? [])
          .map((p) => p.display_name)
          .filter((n): n is string => !!n)
          .sort()
      );
      setPartenaires(
        (parts ?? []).map((p) => ({ prenom: p.prenom, nom: p.nom })).sort((a, b) => a.nom.localeCompare(b.nom))
      );
      setLoading(false);
    });
  }, []);

  const setAnswer = useCallback((itemId: string, update: Partial<ItemAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...update } as ItemAnswer,
    }));
  }, []);

  // Progress
  const totalItems = items.length;
  const answeredCount = Object.values(answers).filter((a) => a.status !== null && a.status !== undefined).length;
  const headerFields = [partenaire, suiviPar, dateEntretien].filter(Boolean).length;
  const totalExpected = 3 + totalItems;
  const totalFilled = headerFields + answeredCount;
  const progress = totalExpected > 0 ? (totalFilled / totalExpected) * 100 : 0;

  // Group items by category
  const categories = useMemo(() => {
    const cats: { name: string; items: SuiviItemConfig[] }[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (!seen.has(item.categorie)) {
        seen.add(item.categorie);
        cats.push({ name: item.categorie, items: [] });
      }
      cats.find((c) => c.name === item.categorie)!.items.push(item);
    }
    return cats;
  }, [items]);

  const handleSave = async () => {
    if (!partenaire.trim() || !suiviPar.trim() || !dateEntretien) {
      toast.error("Remplis les champs obligatoires (Partenaire, Accompagné par, Date)");
      return;
    }

    setSaving(true);

    const itemsJson: Record<string, any> = {};
    Object.entries(answers).forEach(([id, ans]) => {
      itemsJson[id] = {
        status: ans.status,
        ...(ans.observation && { observation: ans.observation }),
      };
    });

    const valides = Object.values(answers).filter((a) => a.status === "fait").length;

    const { error } = await supabase.from("suivi_activite").insert({
      date: format(dateEntretien, "yyyy-MM-dd"),
      agence: partenaire.trim(),
      agence_referente: accompagnePar.trim() || null,
      suivi_par: suiviPar.trim(),
      nb_contrats_total: parseInt(nbContratsTotal) || 0,
      nb_contrats_depuis_dernier: parseInt(nbContratsDernier) || 0,
      items: itemsJson,
      total_items_valides: valides,
      total_items: totalItems,
      signature_auditeur: signatureAuditeur,
      signature_audite: signatureAudite,
    } as any);

    if (error) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
      setSaving(false);
      return;
    }

    toast.success(`Suivi enregistré — ${valides}/${totalItems} items validés`);
    navigate("/activite");
  };

  const enterSaveSuivi = () => {
    void handleSave();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Chargement de la grille…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5 -mx-4 mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <Badge variant="outline" className="text-xs">Suivi d'activité</Badge>
          <span className="text-xs text-muted-foreground">
            {totalFilled} / {totalExpected} champs renseignés
          </span>
          <span className="ml-auto text-xs font-semibold text-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      <div className="px-0">
        <h1 className="text-xl font-semibold text-foreground mb-6">Nouveau suivi d'activité</h1>

        <div className="space-y-8">
          {/* Informations générales */}
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-4">
              Informations générales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <M3Field label="Partenaire accompagné (Prénom NOM)" required filled={!!partenaire}>
                <AutocompleteInput
                  value={partenaire}
                  onChange={setPartenaire}
                  suggestions={partenaires.map((p) => `${p.prenom} ${p.nom.toUpperCase()}`)}
                  placeholder="ex: Émilie BLAISE"
                  onEnterSubmit={enterSaveSuivi}
                />
              </M3Field>
              <M3Field label="Partenaire référent (Prénom NOM)" filled={!!accompagnePar}>
                <AutocompleteInput
                  value={accompagnePar}
                  onChange={setAccompagnePar}
                  suggestions={partenaires.map((p) => `${p.prenom} ${p.nom.toUpperCase()}`)}
                  placeholder="ex: Marie DUPONT"
                  onEnterSubmit={enterSaveSuivi}
                />
              </M3Field>
              <M3Field label="Suivi réalisé par" required filled={!!suiviPar}>
                {auditeurs.length > 0 ? (
                  <Select value={suiviPar} onValueChange={setSuiviPar}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {auditeurs.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={suiviPar} onChange={(e) => setSuiviPar(e.target.value)} placeholder="ex: Cédric MALZAT" onEnterSubmit={enterSaveSuivi} />
                )}
              </M3Field>
              <M3Field label="Date de l'entretien" required filled={!!dateEntretien}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className={cn("w-full justify-start text-left font-normal h-auto p-0", !dateEntretien && "text-muted-foreground")}>
                      <FontAwesomeIcon icon={faCalendar} className="mr-2 h-3.5 w-3.5" />
                      {dateEntretien ? format(dateEntretien, "dd MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateEntretien} onSelect={setDateEntretien} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </M3Field>
              <M3Field label="Nb contrats total depuis début d'année" filled={!!nbContratsTotal}>
                <Input type="number" min={0} value={nbContratsTotal} onChange={(e) => setNbContratsTotal(e.target.value)} onEnterSubmit={enterSaveSuivi} />
              </M3Field>
              <M3Field label="Nb contrats depuis dernier entretien" filled={!!nbContratsDernier}>
                <Input type="number" min={0} value={nbContratsDernier} onChange={(e) => setNbContratsDernier(e.target.value)} onEnterSubmit={enterSaveSuivi} />
              </M3Field>
            </div>
          </div>

          {/* Items par catégorie */}
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
                {cat.name}
              </h2>
              {cat.items.map((item) => {
                const ans = answers[item.id] ?? { status: null };
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "transition-all border-l-4",
                      ans.status === "fait"
                        ? "border-l-emerald-500"
                        : ans.status === "pas_fait"
                        ? "border-l-destructive"
                        : ans.status === "nc"
                        ? "border-l-muted-foreground"
                        : "border-l-border"
                    )}
                  >
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      {/* Title row */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground font-mono mt-0.5">{item.numero}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="secondary" className="text-[10px]">{item.categorie}</Badge>
                            <Badge
                              className={cn(
                                "text-[10px]",
                                ans.status === "fait" ? "bg-emerald-600 text-white"
                                  : ans.status === "pas_fait" ? "bg-destructive text-destructive-foreground"
                                  : ans.status === "nc" ? "bg-muted text-muted-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {ans.status === "fait" ? "Fait" : ans.status === "pas_fait" ? "Pas fait" : ans.status === "nc" ? "Non applicable" : "—"}
                            </Badge>
                          </div>
                          <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.titre}</h3>
                        </div>
                      </div>

                      {/* Description */}
                      {(item.conditions || item.interets) && (
                        <div className="rounded-md border border-border bg-muted/30 p-2.5 sm:p-3 space-y-1.5">
                          {item.conditions && (
                            <div className="flex items-start gap-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                              <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{item.conditions}</span>
                            </div>
                          )}
                          {item.interets && (
                            <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">{item.interets}</p>
                          )}
                        </div>
                      )}

                      {/* Status buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAnswer(item.id, { status: "fait" })}
                          className={cn(
                            "h-10 text-xs sm:text-sm transition-colors",
                            ans.status === "fait" && "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                          )}
                        >
                          <FontAwesomeIcon icon={faCheck} className="mr-1.5 h-3 w-3" /> Fait
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAnswer(item.id, { status: "pas_fait" })}
                          className={cn(
                            "h-10 text-xs sm:text-sm transition-colors",
                            ans.status === "pas_fait" && "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
                          )}
                        >
                          <FontAwesomeIcon icon={faXmark} className="mr-1.5 h-3 w-3" /> Pas fait
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setAnswer(item.id, { status: "nc" })}
                          className={cn(
                            "h-10 text-xs sm:text-sm transition-colors",
                            ans.status === "nc" && "bg-muted-foreground text-white border-muted-foreground"
                          )}
                        >
                          <FontAwesomeIcon icon={faMinus} className="mr-1.5 h-3 w-3" /> Non applicable
                        </Button>
                      </div>

                      {/* Observation */}
                      <div className="space-y-1.5">
                        <Label className="text-[11px] sm:text-xs text-muted-foreground">Observation de l'agence (optionnel)</Label>
                        <RichTextEditor
                          value={ans.observation ?? ""}
                          onChange={(val) => setAnswer(item.id, { observation: val })}
                          placeholder="Ajouter une observation..."
                          rows={2}
                          minimal
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}

          {/* ── Signatures ── */}
          <div className="space-y-2 pt-4 border-t border-border">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
              Signatures
            </h2>
            <p className="text-sm text-muted-foreground">
              Signatures numériques de l'accompagnateur et du partenaire.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <SignaturePad
                label="Signature de l'accompagnateur"
                signerName={suiviPar}
                value={signatureAuditeur}
                onChange={setSignatureAuditeur}
              />
              <SignaturePad
                label="Signature du partenaire"
                signerName={partenaire}
                value={signatureAudite}
                onChange={setSignatureAudite}
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving || !partenaire.trim() || !suiviPar.trim() || !dateEntretien}
              className="w-full gap-2"
            >
              <FontAwesomeIcon icon={faSave} className="h-3.5 w-3.5" />
              {saving ? "Enregistrement…" : "Enregistrer le suivi"}
            </Button>
            {(!partenaire.trim() || !suiviPar.trim() || !dateEntretien) && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Remplis les champs obligatoires (*) pour enregistrer
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
