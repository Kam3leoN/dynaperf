import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUDITEURS, TYPES_EVENEMENT, MOIS_ORDRE } from "@/data/audits";
import { Filters } from "@/hooks/useAuditData";
import { Filter } from "lucide-react";

interface FiltersBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
}

export function FiltersBar({ filters, setFilters }: FiltersBarProps) {
  const update = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="font-sora text-sm font-semibold tracking-tight">Filtres</span>
      </div>
      <Select value={filters.auditeur} onValueChange={(v) => update("auditeur", v)}>
        <SelectTrigger className="w-[160px] h-9 text-sm rounded-md shadow-soft border-border">
          <SelectValue placeholder="Auditeur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous les auditeurs</SelectItem>
          {AUDITEURS.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.typeEvenement} onValueChange={(v) => update("typeEvenement", v)}>
        <SelectTrigger className="w-[180px] h-9 text-sm rounded-md shadow-soft border-border">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous les types</SelectItem>
          {TYPES_EVENEMENT.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.moisVersement} onValueChange={(v) => update("moisVersement", v)}>
        <SelectTrigger className="w-[160px] h-9 text-sm rounded-md shadow-soft border-border">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous les mois</SelectItem>
          {MOIS_ORDRE.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.statut} onValueChange={(v) => update("statut", v)}>
        <SelectTrigger className="w-[140px] h-9 text-sm rounded-md shadow-soft border-border">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous statuts</SelectItem>
          <SelectItem value="OK">Noté</SelectItem>
          <SelectItem value="NON">En attente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
