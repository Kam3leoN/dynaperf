import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutGroup } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faHouse } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import {
  getActiveRailSection,
  getRailSections,
  getRailScrollSections,
  RAIL_PINNED_TOP_SECTION_ID,
  RAIL_SECTIONS_ALL,
  ADMIN_RAIL_NAV_DESTINATION,
  type RailSection,
} from "@/config/appNavigation";
import { SHELL_RAIL_EXPANDED_PX } from "@/config/layoutBreakpoints";
import { useNavigationShell } from "@/contexts/NavigationShellContext";
import { MwcFab, MwcIconButton } from "@/material/materialWebReact";

/** Durée / courbe M3 Expressive — pattern « top level » (navigation shell). */
const RAIL_TEXT_TRANSITION =
  "duration-m3-standard ease-m3-standard motion-reduce:duration-[1ms] transition-[font-size,line-height,color,font-weight]";

interface AppNavRailProps {
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
  isModuleEnabled: (key: string) => boolean;
}

interface RailItemProps {
  section: RailSection;
  isActive: boolean;
  expanded: boolean;
  pinned?: boolean;
}

/** Rangée compacte : pilule 56×32 — `inset-0` dans ce cadre (alignée au libellé avec gap-1 = 4px). */
const RAIL_COMPACT_ICON_ROW = "relative mx-auto flex h-8 w-14 shrink-0 items-center justify-center";

/**
 * Compact : pilule 56×32 derrière l’icône, libellé en dessous (hover = même taille que actif).
 * Étendu : fond pleine ligne, même `inset` pour hover et actif.
 */
function RailNavItem({ section, isActive, expanded, pinned }: RailItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const railTo = section.id === "admin" ? ADMIN_RAIL_NAV_DESTINATION : section.to;
  const hubPathname = railTo.split("?")[0] ?? railTo;

  const handleRailClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // Admin : toujours `/nav/admin` (hub), y compris depuis `/admin/...`.
    if (section.id === "admin") {
      e.preventDefault();
      navigate(ADMIN_RAIL_NAV_DESTINATION);
      return;
    }
    const pathOnly = location.pathname;
    const inSection = section.pathPrefixes.some((p) => {
      if (p === "/") return false;
      return pathOnly === p || pathOnly.startsWith(`${p}/`);
    });
    if (inSection && pathOnly !== hubPathname) {
      e.preventDefault();
      navigate(railTo);
    }
  };

  return (
    <Link
      to={railTo}
      onClick={handleRailClick}
      title={section.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        expanded
          ? "mx-1 w-[calc(100%-0.5rem)] max-w-full min-w-0"
          : "mx-auto w-full max-w-[6rem] justify-center",
        pinned && "w-full",
      )}
    >
      <div
        className={cn(
          "relative flex w-full overflow-visible rounded-full",
          expanded
            ? "min-h-[3.25rem] flex-row items-center gap-2.5 px-2.5 py-2"
            : "flex-col items-center gap-1",
        )}
      >
        {expanded && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-1 z-0 rounded-full transition-colors duration-m3-standard ease-m3-standard",
              isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-muted/55",
            )}
          />
        )}

        {!expanded ? (
          <div className={RAIL_COMPACT_ICON_ROW}>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 z-0 rounded-full transition-colors duration-m3-standard ease-m3-standard",
                isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-muted/65",
              )}
            />
            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <FontAwesomeIcon
                icon={section.icon}
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors duration-m3-standard ease-m3-standard",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
                aria-hidden
              />
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
            <FontAwesomeIcon
              icon={section.icon}
              className={cn(
                "h-5 w-5 shrink-0 transition-colors duration-m3-standard ease-m3-standard",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
              aria-hidden
            />
          </div>
        )}

        <span
          className={cn(
            "relative z-10 leading-tight",
            RAIL_TEXT_TRANSITION,
            expanded
              ? "min-w-0 flex-1 truncate text-left text-sm"
              : "max-w-[5.25rem] truncate text-center text-[11px]",
            isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-foreground",
          )}
        >
          {section.label}
        </span>
      </div>
    </Link>
  );
}

/**
 * M3 : Extended FAB (`md-fab` avec `label`) — action principale « Accueil », sans logo.
 * Rail replié : FAB non étendu (pas de libellé), taille medium (56dp).
 * @see https://m3.material.io/components/floating-action-button/overview
 */
function RailHomeFab({ expanded, isHomeActive }: { expanded: boolean; isHomeActive: boolean }) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex w-full justify-center overflow-visible bg-transparent outline-none",
        expanded ? "min-w-0 px-0.5" : "mx-auto max-w-[6rem]",
      )}
    >
      <MwcFab
        variant="primary"
        label={expanded ? "Accueil" : ""}
        size="medium"
        lowered={false}
        title="Accueil"
        aria-label="Accueil"
        aria-current={isHomeActive ? "page" : undefined}
        className={cn("rail-home-fab max-w-full min-w-0", expanded && "w-full")}
        onClick={() => navigate("/")}
      >
        <FontAwesomeIcon slot="icon" icon={faHouse} className="h-6 w-6" aria-hidden />
      </MwcFab>
    </div>
  );
}

export function AppNavRail({ isAdmin, hasPermission, isModuleEnabled }: AppNavRailProps) {
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
      className="hidden shell:flex fixed left-0 top-0 bottom-0 z-[45] flex-col bg-muted/20"
      aria-label="Navigation principale"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Déclencheur seul sur la 1ʳᵉ ligne ; FAB / item épinglé sur la 2ᵉ — tout reste dans la largeur du rail */}
        <div className="z-10 shrink-0" style={{ width: "100%" }}>
          <div className="flex items-center px-1 pt-2 pb-0">
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
          </div>
          <div className={cn("px-1.5 pb-8 pt-5", !railExpanded && "flex justify-center")}>
            {pinnedSection ? (
              <RailNavItem
                section={pinnedSection}
                isActive={active?.id === pinnedSection.id}
                expanded={railExpanded}
                pinned
              />
            ) : (
              <RailHomeFab expanded={railExpanded} isHomeActive={logoIsHomeActive} />
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            !railExpanded && "items-center",
          )}
        >
          <LayoutGroup id="rail-destinations">
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-1 pb-2 [scrollbar-gutter:stable]",
                railExpanded ? "px-1.5" : "w-full items-center gap-3 px-0.5",
              )}
              style={{ width: "100%" }}
            >
              {scrollSections.map((s) => (
                <div key={s.id} className={cn("flex w-full", !railExpanded && "justify-center")}>
                  <RailNavItem section={s} isActive={active?.id === s.id} expanded={railExpanded} />
                </div>
              ))}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </nav>
  );
}
