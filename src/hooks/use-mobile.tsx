import { useShellNarrow } from "@/contexts/ResponsiveShellContext";

/**
 * Alias de `useShellNarrow` pour le code existant (sidebar shadcn, formulaires, etc.).
 * Préférer `useShellNarrow` dans le nouveau code pour expliciter le lien avec le shell app.
 */
export function useIsMobile() {
  return useShellNarrow();
}
