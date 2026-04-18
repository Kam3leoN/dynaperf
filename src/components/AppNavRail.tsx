import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import {
  getActiveRailSection,
  getRailSections,
  getRailScrollSections,
  RAIL_PINNED_TOP_SECTION_ID,
  RAIL_SECTIONS_ALL,
  type RailSection,
} from "@/config/appNavigation";
import { SHELL_RAIL_COLLAPSED_PX, SHELL_RAIL_EXPANDED_PX } from "@/config/layoutBreakpoints";
import { publicAssetUrl } from "@/lib/basePath";
import { useNavigationShell } from "@/contexts/NavigationShellContext";
import { AppSecondaryNavPanel } from "@/components/AppSecondaryNav";
import { MwcIconButton } from "@/material/materialWebReact";

const RAIL_LOGO_SRC = publicAssetUrl("pwaDynaperf.svg");

/** Courbe d’accélération standard Material 3 (expressive). */
const M3_EASE: [number, number, number, number] = [0.2, 0, 0, 1];

interface AppNavRailProps {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (key: string) => boolean;
  isModuleEnabled: (key: string) => boolean;
}

interface RailItemProps {
  section: RailSection;
  isActive: boolean;
  /** true = zone fixe (hauteur alignée sur la bande logo colonne secondaire) */
  pinned?: boolean;
}

const RAIL_TOP_STRIP_H = "h-[4.25rem]";

const RAIL_INDICATOR_DIAMETER = "2rem";

function RailIconPill({
  isActive,
  children,
  className,
}: {
  isActive: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      className={cn(
        "relative flex h-8 min-w-[3.5rem] max-w-[5.5rem] shrink-0 items-center justify-center px-3.5",
        className,
      )}
    >
      {!isActive && (
        <span
          className="absolute inset-0 z-0 rounded-full bg-transparent transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-hover:bg-muted/65"
          aria-hidden
        />
      )}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 right-0 z-[1] mx-auto h-8 max-w-full rounded-full bg-primary/15"
        initial={false}
        animate={{
          width: isActive ? "100%" : RAIL_INDICATOR_DIAMETER,
          opacity: isActive ? 1 : 0,
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.4,
          ease: M3_EASE,
        }}
      />
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </span>
  );
}

function RailNavItem({ section, isActive, pinned }: RailItemProps) {
  return (
    <NavLink
      to={section.to}
      title={section.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex w-full max-w-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 outline-none transition-[transform,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:ring-2 focus-visible:ring-primary/40",
        pinned ? cn(RAIL_TOP_STRIP_H, "justify-center") : "min-h-[4.25rem] py-1.5",
      )}
    >
      <RailIconPill isActive={isActive}>
        <FontAwesomeIcon
          icon={section.icon}
          className={cn(
            "h-[1.25rem] w-[1.25rem] shrink-0 transition-[color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
            isActive ? "text-primary scale-100" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden
        />
      </RailIconPill>
      <span
        className={cn(
          "max-w-[5.25rem] truncate text-center text-[11px] leading-tight transition-[color,font-weight] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground",
        )}
      >
        {section.label}
      </span>
    </NavLink>
  );
}

/**
 * Rail M3 Expressive : replié = colonne primaire 96px seule ;
 * étendu = colonne primaire (96px) + volet sous-navigation à droite (scroll indépendant).
 */
export function AppNavRail({
  isAdmin,
  isSuperAdmin,
  hasPermission,
  isModuleEnabled,
}: AppNavRailProps) {
  const { pathname } = useLocation();
  const { railExpanded, toggleRailExpanded, railWidthPx } = useNavigationShell();
  const visibleSections = getRailSections(isAdmin, hasPermission, isModuleEnabled);
  const scrollSections = getRailScrollSections(isAdmin, hasPermission, isModuleEnabled);
  const active = getActiveRailSection(pathname, RAIL_SECTIONS_ALL);
  const pinnedSection =
    RAIL_PINNED_TOP_SECTION_ID &&
    visibleSections.find((s) => s.id === RAIL_PINNED_TOP_SECTION_ID && !s.hideFromRail);
  const logoIsHomeActive = active?.id === "home";

  const navWidth = railWidthPx > 0 ? railWidthPx : SHELL_RAIL_EXPANDED_PX;

  return (
    <nav
      style={{
        width: navWidth,
        transition: "width 280ms cubic-bezier(0.2, 0, 0, 1)",
      }}
      className="hidden shell:flex fixed left-0 top-0 bottom-0 z-[45] flex-col border-r border-border/40 bg-muted/20"
      aria-label="Navigation principale"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-row pt-[4.25rem]">
          <div
            style={{ width: SHELL_RAIL_COLLAPSED_PX }}
            className={cn(
              "flex shrink-0 flex-col overflow-y-auto overflow-x-hidden px-1 pb-2 [scrollbar-gutter:stable]",
              "bg-muted/20",
              railExpanded && "border-r border-border/40",
            )}
          >
            {scrollSections.map((s) => (
              <div key={s.id} className="flex justify-center">
                <RailNavItem section={s} isActive={active?.id === s.id} />
              </div>
            ))}
          </div>

          {railExpanded && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/10">
              <AppSecondaryNavPanel
                isSuperAdmin={isSuperAdmin}
                hasPermission={hasPermission}
                isModuleEnabled={isModuleEnabled}
                hideLogo
                className="min-h-0 flex-1 overflow-y-auto"
              />
            </div>
          )}
        </div>

        <div
          style={{ width: navWidth }}
          className={cn(
            "pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center border-b border-border/30 bg-muted/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-muted/80",
            RAIL_TOP_STRIP_H,
          )}
          role="presentation"
        >
          <div className="pointer-events-auto flex w-full max-w-full items-center justify-between gap-0.5 px-1">
            <MwcIconButton
              aria-label={railExpanded ? "Replier le menu latéral" : "Développer le menu latéral"}
              title={railExpanded ? "Replier" : "Développer"}
              className="shrink-0 touch-target"
              onClick={() => toggleRailExpanded()}
            >
              <FontAwesomeIcon
                icon={railExpanded ? faChevronLeft : faChevronRight}
                className="h-[1.15rem] w-[1.15rem] text-foreground/80"
              />
            </MwcIconButton>

            <div className="flex min-w-0 flex-1 justify-center px-0.5">
              {pinnedSection ? (
                <RailNavItem section={pinnedSection} isActive={active?.id === pinnedSection.id} pinned />
              ) : (
                <NavLink
                  to="/"
                  title="Accueil"
                  aria-label="DynaPerf — Accueil"
                  aria-current={logoIsHomeActive ? "page" : undefined}
                  className={cn(
                    "group relative flex max-w-full shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                    RAIL_TOP_STRIP_H,
                  )}
                >
                  <RailIconPill isActive={logoIsHomeActive} className="h-8 min-w-[3.25rem] max-w-[4.75rem] px-3">
                    <img
                      src={RAIL_LOGO_SRC}
                      alt=""
                      className={cn(
                        "h-8 w-auto max-w-[52px] object-contain transition-opacity duration-200",
                        logoIsHomeActive ? "opacity-100" : "opacity-95 group-hover:opacity-100",
                      )}
                      width={52}
                      height={36}
                      decoding="async"
                    />
                  </RailIconPill>
                  <span
                    className={cn(
                      "max-w-[5rem] truncate text-center text-[11px] leading-tight transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
                      logoIsHomeActive
                        ? "font-semibold text-primary"
                        : "font-medium text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    Accueil
                  </span>
                </NavLink>
              )}
            </div>

            <span className="inline-block w-10 shrink-0" aria-hidden />
          </div>
        </div>
      </div>
    </nav>
  );
}
