import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useShellNarrow } from "@/contexts/ResponsiveShellContext";
import { SHELL_RAIL_COLLAPSED_PX, SHELL_RAIL_EXPANDED_PX } from "@/config/layoutBreakpoints";

export interface NavigationShellContextValue {
  /** Rail étendu (icône + libellé, une colonne) — desktop shell uniquement. */
  railExpanded: boolean;
  setRailExpanded: (v: boolean) => void;
  toggleRailExpanded: () => void;
  /** 0 en vue étroite ; sinon largeur du rail (80 replié ou 256 étendu). */
  railWidthPx: number;
}

const NavigationShellContext = createContext<NavigationShellContextValue | undefined>(undefined);

/**
 * État du rail M3 Expressive « dynamique » (collapsed / expanded).
 * Doit être sous `ResponsiveShellProvider`.
 */
export function NavigationShellProvider({ children }: { children: ReactNode }) {
  const narrow = useShellNarrow();
  const [railExpanded, setRailExpanded] = useState(true);

  const toggleRailExpanded = useCallback(() => {
    setRailExpanded((e) => !e);
  }, []);

  const railWidthPx = useMemo(() => {
    if (narrow) return 0;
    return railExpanded ? SHELL_RAIL_EXPANDED_PX : SHELL_RAIL_COLLAPSED_PX;
  }, [narrow, railExpanded]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--shell-nav-rail-width", `${railWidthPx}px`);
  }, [railWidthPx]);

  const value = useMemo(
    () => ({
      railExpanded,
      setRailExpanded,
      toggleRailExpanded,
      railWidthPx,
    }),
    [railExpanded, toggleRailExpanded, railWidthPx],
  );

  return <NavigationShellContext.Provider value={value}>{children}</NavigationShellContext.Provider>;
}

export function useNavigationShell(): NavigationShellContextValue {
  const ctx = useContext(NavigationShellContext);
  if (!ctx) {
    throw new Error("useNavigationShell doit être utilisé sous NavigationShellProvider (voir App.tsx).");
  }
  return ctx;
}
