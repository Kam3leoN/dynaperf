import * as React from "react";

const MOBILE_BREAKPOINT = 1024;

const mqString = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function readIsMobile(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(mqString).matches;
}

/**
 * Aligné sur le breakpoint `lg` (1024px) du shell (rail, colonnes, bottom nav).
 * État initial synchronisé : évite un premier rendu « faux desktop » sur téléphone
 * (ancien bug : `useState(undefined)` → `!!undefined === false`).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(readIsMobile);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(mqString);

    const updateIsMobile = (event?: MediaQueryListEvent) => {
      setIsMobile(event?.matches ?? mediaQuery.matches);
    };

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  return isMobile;
}
