import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarPlus } from "@fortawesome/free-solid-svg-icons";

interface PlanActiviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const TYPES_ACTIVITE = ["Agence", "Club"];

export function PlanActiviteDialog({ open, onOpenChange, onCreated }: PlanActiviteDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [partenaire, setPartenaire] = useState("");
  const [referent, setReferent] = useState("");
  const [suiviPar, setSuiviPar] = useState("");
  const [typeActivite, setTypeActivite] = useState("Agence");
  const [saving, setSaving] = useState(false);

  const [partenaires, setPartenaires] = useState<{ prenom: string; nom: string }[]>([]);
  const [auditeurs, setAuditeurs] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("partenaires").select("prenom, nom").eq("statut", "actif"),
      supabase.from("profiles").select("display_name"),
    ]).then(([{ data: parts }, { data: profiles }]) => {
      setPartenaires((parts ?? []).map(p => ({ prenom: p.prenom, nom: p.nom })).sort((a, b) => a.nom.localeCompare(b.nom)));
      setAuditeurs((profiles ?? []).map(p => p.display_name).filter((n): n is string => !!n).sort());
    });
  }, [open]);

  const reset = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setPartenaire("");
    setReferent("");
    setSuiviPar("");
    setTypeActivite("Agence");
  };

  const handleSave = async () => {
    if (!partenaire.trim() || !suiviPar.trim() || !date) {
      toast.error("Le partenaire, suivi par et la date sont obligatoires");
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("suivi_activite").insert({
      date,
      agence: partenaire.trim(),
      agence_referente: referent.trim() || null,
      suivi_par: suiviPar.trim(),
      items: { _planifie: true, type: typeActivite },
      total_items: 0,
      total_items_valides: 0,
      observations: `Planifié — Type: ${typeActivite}`,
    });

    if (error) {
      toast.error("Erreur lors de la planification");
      console.error(error);
    } else {
      toast.success("Suivi d'activité planifié");
      reset();
      onOpenChange(false);
      onCreated();
    }
    setSaving(false);
  };

  const enterSavePlan = () => {
    void handleSave();
  };

  const partSuggestions = partenaires.map(p => `${p.prenom} ${p.nom.toUpperCase()}`);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4 text-amber-500" />
            Planifier un suivi d'activité
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div>
            <Label className="text-xs">Date prévue *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" onEnterSubmit={enterSavePlan} />
          </div>
          <div>
            <Label className="text-xs">Partenaire (Prénom NOM) *</Label>
            <AutocompleteInput value={partenaire} onChange={setPartenaire} suggestions={partSuggestions} placeholder="ex: Émilie BLAISE" onEnterSubmit={enterSavePlan} />
          </div>
          <div>
            <Label className="text-xs">Partenaire Référent (Prénom NOM)</Label>
            <AutocompleteInput value={referent} onChange={setReferent} suggestions={partSuggestions} placeholder="ex: Marie DUPONT" onEnterSubmit={enterSavePlan} />
          </div>
          <div>
            <Label className="text-xs">Suivi par *</Label>
            {auditeurs.length > 0 ? (
              <Select value={suiviPar} onValueChange={setSuiviPar}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {auditeurs.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={suiviPar} onChange={e => setSuiviPar(e.target.value)} className="h-9 text-sm" placeholder="Suivi par" onEnterSubmit={enterSavePlan} />
            )}
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={typeActivite} onValueChange={setTypeActivite}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES_ACTIVITE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Planification…" : "Planifier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
