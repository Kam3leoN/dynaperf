import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AUDITEURS, TYPES_EVENEMENT, MOIS_ORDRE } from "@/data/audits";
import { Filters } from "@/hooks/useAuditData";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

interface FiltersBarProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  vertical?: boolean;
}

export function FiltersBar({ filters, setFilters, vertical }: FiltersBarProps) {
  const update = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const selectClass = vertical ? "w-full" : "w-[130px] sm:w-[160px]";

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${vertical ? "flex-col items-stretch" : "flex-nowrap"}`}>
      {!vertical && (
        <div className="flex items-center gap-2 text-muted-foreground shrink-0">
          <FontAwesomeIcon icon={faFilter} className="h-3.5 w-3.5" />
          <span className="font-sora text-xs sm:text-sm font-semibold tracking-tight hidden sm:inline">Filtres</span>
        </div>
      )}
      <Select value={filters.auditeur} onValueChange={(v) => update("auditeur", v)}>
        <SelectTrigger className={`${selectClass} h-8 sm:h-9 text-xs sm:text-sm rounded-md shadow-soft border-border`}>
          <SelectValue placeholder="Auditeur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous auditeurs</SelectItem>
          {AUDITEURS.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.typeEvenement} onValueChange={(v) => update("typeEvenement", v)}>
        <SelectTrigger className={`${selectClass} h-8 sm:h-9 text-xs sm:text-sm rounded-md shadow-soft border-border`}>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous types</SelectItem>
          {TYPES_EVENEMENT.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.moisVersement} onValueChange={(v) => update("moisVersement", v)}>
        <SelectTrigger className={`${selectClass} h-8 sm:h-9 text-xs sm:text-sm rounded-md shadow-soft border-border`}>
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Tous">Tous mois</SelectItem>
          {MOIS_ORDRE.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.statut} onValueChange={(v) => update("statut", v)}>
        <SelectTrigger className={`${selectClass} h-8 sm:h-9 text-xs sm:text-sm rounded-md shadow-soft border-border`}>
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
