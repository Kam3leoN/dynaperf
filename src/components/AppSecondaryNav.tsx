import { Link, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { LayoutGroup, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import {
  filterSecondaryNavItems,
  getActiveRailSection,
  RAIL_SECTIONS_ALL,
} from "@/config/appNavigation";
import { SHELL_RAIL_WIDTH_PX, SHELL_SECONDARY_NAV_WIDTH_PX } from "@/config/layoutBreakpoints";
import { MessagingSecondaryNav } from "@/components/messaging/MessagingSecondaryNav";
import { publicAssetUrl } from "@/lib/basePath";
const SECONDARY_LOGO_LIGHT = publicAssetUrl("DynaPerf_light_simple.svg");
const SECONDARY_LOGO_DARK = publicAssetUrl("DynaPerf_dark_simple.svg");

/** Courbe d’accélération Material 3 (cohérente avec le rail). */
const M3_EASE: [number, number, number, number] = [0.2, 0, 0, 1];

const SECONDARY_ACTIVE_LAYOUT_ID = "shell-secondary-nav-active-pill";

interface AppSecondaryNavPanelProps {
  hasPermission: (key: string) => boolean;
  isModuleEnabled?: (key: string) => boolean;
  isSuperAdmin?: boolean;
  className?: string;
}

/**
 * Contenu de la colonne secondaire ~280px type Discord (réutilisable dans le sheet mobile).
 */
export function AppSecondaryNavPanel({
  hasPermission,
  isModuleEnabled,
  isSuperAdmin = false,
  className,
}: AppSecondaryNavPanelProps) {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const active = getActiveRailSection(pathname, RAIL_SECTIONS_ALL);
  const isWelcomeRoute = pathname === "/";
  const secondaryLogoSrc =
    resolvedTheme === "dark" ? SECONDARY_LOGO_DARK : SECONDARY_LOGO_LIGHT;

  if (!active) {
    return (
      <div className={cn("flex flex-col bg-muted/10 min-h-0", className)} aria-label="Sous-navigation" />
    );
  }

  return (
    <div
      className={cn("flex flex-col bg-muted/10 min-h-0 h-full", className)}
      aria-label={`Sous-navigation ${active.label}`}
    >
      <div className="flex h-[4.25rem] shrink-0 items-center justify-start px-4">
        <Link to="/" aria-label="DynaPerf — Accueil" className="inline-flex items-center">
          <img
            src={secondaryLogoSrc}
            alt="DynaPerf"
            className="h-10 w-auto max-w-[min(100%,220px)] object-contain object-left"
            width={220}
            height={42}
            decoding="async"
          />
        </Link>
      </div>

      {isWelcomeRoute ? (
        <div className="flex-1 min-h-0" />
      ) : active.id === "messages" ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <MessagingSecondaryNav />
        </div>
      ) : (
        <LayoutGroup id="app-secondary-nav">
          <nav className="flex flex-col flex-1 min-h-0 p-2">
            <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
              {filterSecondaryNavItems(active.children, hasPermission, isModuleEnabled, { isSuperAdmin }).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-full px-3 py-2.5 text-sm outline-none transition-[color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:ring-2 focus-visible:ring-primary/35"
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <motion.span
                          layoutId={SECONDARY_ACTIVE_LAYOUT_ID}
                          className="absolute inset-0 z-0 rounded-full bg-primary/12 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]"
                          transition={{ duration: 0.36, ease: M3_EASE }}
                        />
                      ) : (
                        <span
                          className="absolute inset-0 z-0 rounded-full bg-transparent transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover:bg-muted/55"
                          aria-hidden
                        />
                      )}
                      <span className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
                        <FontAwesomeIcon
                          icon={item.icon}
                          className={cn(
                            "h-[1.25rem] w-[1.25rem] shrink-0 transition-colors duration-200",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "truncate transition-[font-weight,color] duration-200",
                            isActive ? "font-semibold text-primary" : "font-medium text-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </LayoutGroup>
      )}
    </div>
  );
}

interface AppSecondaryNavProps {
  isSuperAdmin?: boolean;
  hasPermission: (key: string) => boolean;
  isModuleEnabled?: (key: string) => boolean;
}

/**
 * Colonne secondaire desktop (~280px) : sous-menus de la section active.
 */
export function AppSecondaryNav({ isSuperAdmin, hasPermission, isModuleEnabled }: AppSecondaryNavProps) {
  return (
    <aside
      style={{ left: SHELL_RAIL_WIDTH_PX, width: SHELL_SECONDARY_NAV_WIDTH_PX }}
      className="hidden shell:flex fixed top-0 bottom-0 z-[45] flex-col border-r border-border/40 bg-muted/10 min-h-0 transition-[background-color] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
    >
      <AppSecondaryNavPanel
        isSuperAdmin={isSuperAdmin}
        hasPermission={hasPermission}
        isModuleEnabled={isModuleEnabled}
        className="flex-1 min-h-0"
      />
    </aside>
  );
}
