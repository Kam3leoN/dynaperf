import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarPlus } from "@fortawesome/free-solid-svg-icons";

interface PlanAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const TYPES_AUDIT = ["Club Affaires", "RD Présentiel", "RD Distanciel", "RDV Commercial"];

export function PlanAuditDialog({ open, onOpenChange, onCreated }: PlanAuditDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [partenaire, setPartenaire] = useState("");
  const [referent, setReferent] = useState("");
  const [lieu, setLieu] = useState("");
  const [auditeur, setAuditeur] = useState("");
  const [typeEvenement, setTypeEvenement] = useState("Club Affaires");
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
    setLieu("");
    setAuditeur("");
    setTypeEvenement("Club Affaires");
  };

  const handleSave = async () => {
    if (!partenaire.trim() || !date) {
      toast.error("Le partenaire et la date sont obligatoires");
      return;
    }
    setSaving(true);

    const mois = new Date(date).toLocaleString("fr-FR", { month: "long" });
    const moisCap = mois.charAt(0).toUpperCase() + mois.slice(1);

    const { error } = await supabase.from("audits").insert({
      date,
      partenaire: partenaire.trim(),
      lieu: lieu.trim(),
      auditeur: auditeur.trim() || "Cédric",
      type_evenement: typeEvenement,
      note: null,
      mois_versement: moisCap,
      statut: "NON",
    });

    if (error) {
      toast.error("Erreur lors de la planification");
      console.error(error);
    } else {
      toast.success("Audit planifié avec succès");
      reset();
      onOpenChange(false);
      onCreated();
    }
    setSaving(false);
  };

  const partSuggestions = partenaires.map(p => `${p.prenom} ${p.nom.toUpperCase()}`);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4 text-amber-500" />
            Planifier un audit
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div>
            <Label className="text-xs">Date prévue *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Partenaire (Prénom NOM) *</Label>
            <AutocompleteInput value={partenaire} onChange={setPartenaire} suggestions={partSuggestions} placeholder="ex: Émilie BLAISE" />
          </div>
          <div>
            <Label className="text-xs">Partenaire Référent (Prénom NOM)</Label>
            <AutocompleteInput value={referent} onChange={setReferent} suggestions={partSuggestions} placeholder="ex: Marie DUPONT" />
          </div>
          <div>
            <Label className="text-xs">Ville (Lieu)</Label>
            <CityAutocomplete value={lieu} onChange={setLieu} />
          </div>
          <div>
            <Label className="text-xs">Auditeur</Label>
            {auditeurs.length > 0 ? (
              <Select value={auditeur} onValueChange={setAuditeur}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {auditeurs.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={auditeur} onChange={e => setAuditeur(e.target.value)} className="h-9 text-sm" placeholder="Auditeur" />
            )}
          </div>
          <div>
            <Label className="text-xs">Type d'événement</Label>
            <Select value={typeEvenement} onValueChange={setTypeEvenement}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES_AUDIT.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
