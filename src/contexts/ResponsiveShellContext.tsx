import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { SHELL_MAX_WIDTH_MEDIA_QUERY } from "@/config/layoutBreakpoints";

const ResponsiveShellContext = createContext<boolean | undefined>(undefined);

function subscribeShellNarrow(callback: () => void) {
  const mq = window.matchMedia(SHELL_MAX_WIDTH_MEDIA_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getShellNarrowSnapshot() {
  return window.matchMedia(SHELL_MAX_WIDTH_MEDIA_QUERY).matches;
}

function getServerShellNarrowSnapshot() {
  return true;
}

/**
 * Fournit l’état « viewport étroit » aligné sur le shell (≤1023.98px), identique aux classes `shell:` / bottom nav.
 */
export function ResponsiveShellProvider({ children }: { children: ReactNode }) {
  const isNarrow = useSyncExternalStore(subscribeShellNarrow, getShellNarrowSnapshot, getServerShellNarrowSnapshot);
  return <ResponsiveShellContext.Provider value={isNarrow}>{children}</ResponsiveShellContext.Provider>;
}

/**
 * `true` lorsque la largeur correspond au shell mobile (barre du bas, pas de rail fixe).
 * À utiliser pour les branches React qui doivent suivre le même seuil que le CSS du shell.
 */
export function useShellNarrow(): boolean {
  const ctx = useContext(ResponsiveShellContext);
  if (ctx !== undefined) return ctx;
  throw new Error("useShellNarrow doit être utilisé sous ResponsiveShellProvider (voir App.tsx).");
}
