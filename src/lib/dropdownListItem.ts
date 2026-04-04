import { cn } from "@/lib/utils";

/**
 * Style unifié pour les lignes des listes déroulantes (Select Radix, autocomplete, ville).
 * Survol et option surlignée au clavier : même fond accent (jaune M3) et texte lisible.
 */
export function cnDropdownListRow(isHighlighted: boolean, extra?: string) {
  return cn(
    "rounded-md text-sm text-foreground outline-none transition-colors",
    isHighlighted
      ? "bg-accent text-accent-foreground"
      : "bg-transparent hover:bg-accent hover:text-accent-foreground",
    extra
  );
}
