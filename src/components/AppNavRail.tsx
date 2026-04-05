import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import {
  getActiveRailSection,
  getRailSections,
  getRailScrollSections,
  RAIL_PINNED_TOP_SECTION_ID,
  RAIL_SECTIONS_ALL,
  type RailSection,
} from "@/config/appNavigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { publicAssetUrl } from "@/lib/basePath";

const RAIL_LOGO_SRC = publicAssetUrl("pwaDynaperf.svg");

interface AppNavRailProps {
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
}

interface RailItemProps {
  section: RailSection;
  isActive: boolean;
  /** true = zone fixe (hauteur alignée sur la bande logo colonne secondaire) */
  pinned?: boolean;
}

/** Même hauteur que la bande logo `AppSecondaryNav` et le header `AppLayout` (lg). */
const RAIL_TOP_STRIP_H = "h-[4.25rem]";

function RailNavItem({ section, isActive, pinned }: RailItemProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <NavLink
          to={section.to}
          aria-label={section.label}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "group relative flex shrink-0 items-center justify-center rounded-[28%] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
            pinned
              ? cn(RAIL_TOP_STRIP_H, "w-20")
              : "h-[56px] w-full max-w-[72px]",
          )}
        >
          {isActive && (
            <span
              className="absolute -left-1 top-1/2 h-8 w-[4px] -translate-y-1/2 rounded-r-full bg-primary"
              aria-hidden
            />
          )}
          <span
            className={cn(
              "relative flex size-12 items-center justify-center rounded-[28%] transition-colors",
              isActive
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground group-hover:bg-secondary/80 group-hover:text-foreground",
            )}
          >
            <FontAwesomeIcon icon={section.icon} className="size-6 shrink-0" />
          </span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={10}>
        {section.label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Rail 80px : logo marque fixe (hauteur = bande logo colonne secondaire) ; le reste défile en dessous.
 */
export function AppNavRail({ isAdmin, hasPermission }: AppNavRailProps) {
  const { pathname } = useLocation();
  const visibleSections = getRailSections(isAdmin, hasPermission);
  const scrollSections = getRailScrollSections(isAdmin, hasPermission);
  const active = getActiveRailSection(pathname, RAIL_SECTIONS_ALL);
  const pinnedSection =
    RAIL_PINNED_TOP_SECTION_ID &&
    visibleSections.find((s) => s.id === RAIL_PINNED_TOP_SECTION_ID && !s.hideFromRail);
  const logoIsHomeActive = active?.id === "home";

  return (
    <nav
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-[45] w-[80px] flex-col border-r border-border/40 bg-muted/20"
      aria-label="Navigation principale"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Liste qui défile ; spacer = hauteur bande logo (alignée AppSecondaryNav) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-1.5 pt-0 [scrollbar-gutter:stable]">
          <div className={cn(RAIL_TOP_STRIP_H, "w-full shrink-0")} aria-hidden />
          {scrollSections.map((s) => (
            <div key={s.id} className="flex justify-center">
              <RailNavItem section={s} isActive={active?.id === s.id} />
            </div>
          ))}
        </div>

        {/* Bande logo (remplace l’ancienne entrée messagerie épinglée) ou section épinglée si configurée */}
        <div
          className={cn(
            "pointer-events-none absolute left-0 right-0 top-0 z-10 flex w-[80px] items-center justify-center border-b border-border/30 bg-muted/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-muted/80",
            RAIL_TOP_STRIP_H,
          )}
          role="presentation"
        >
          <div className="pointer-events-auto flex justify-center">
            {pinnedSection ? (
              <RailNavItem
                section={pinnedSection}
                isActive={active?.id === pinnedSection.id}
                pinned
              />
            ) : (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/"
                    aria-label="DynaPerf — Accueil"
                    aria-current={logoIsHomeActive ? "page" : undefined}
                    className={cn(
                      "group relative flex shrink-0 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                      RAIL_TOP_STRIP_H,
                      "w-20",
                    )}
                  >
                    {logoIsHomeActive && (
                      <span
                        className="absolute -left-1 top-1/2 h-8 w-[4px] -translate-y-1/2 rounded-r-full bg-primary"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "relative flex size-12 items-center justify-center rounded-[28%] transition-colors",
                        logoIsHomeActive
                          ? "bg-primary/20 ring-1 ring-primary/25"
                          : "group-hover:bg-secondary/60",
                      )}
                    >
                      <img
                        src={RAIL_LOGO_SRC}
                        alt=""
                        className={cn(
                          "h-9 w-auto max-w-[52px] object-contain",
                          logoIsHomeActive ? "opacity-100" : "opacity-95 group-hover:opacity-100",
                        )}
                        width={52}
                        height={36}
                        decoding="async"
                      />
                    </span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={10}>
                  Accueil
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
