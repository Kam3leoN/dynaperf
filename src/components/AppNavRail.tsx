import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import {
  getActiveRailSection,
  getRailSections,
  getRailScrollSections,
  RAIL_PINNED_TOP_SECTION_ID,
  type RailSection,
} from "@/config/appNavigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppNavRailProps {
  isAdmin: boolean;
  unreadMessages: number;
}

interface RailItemProps {
  section: RailSection;
  isActive: boolean;
  unreadMessages: number;
  /** true = zone fixe messagerie (hauteur alignée sur la bande logo colonne secondaire) */
  pinned?: boolean;
}

/** Même hauteur que la bande logo `AppSecondaryNav` et le header `AppLayout` (lg). */
const RAIL_TOP_STRIP_H = "h-[4.25rem]";

function RailNavItem({ section, isActive, unreadMessages, pinned }: RailItemProps) {
  const showMsgBadge = section.id === "messages" && unreadMessages > 0;

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
            {showMsgBadge && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
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
 * Rail 80px : messagerie fixe (hauteur = bande logo) au-dessus ; le reste défile en dessous.
 */
export function AppNavRail({ isAdmin, unreadMessages }: AppNavRailProps) {
  const { pathname } = useLocation();
  const sections = getRailSections(isAdmin);
  const scrollSections = getRailScrollSections(isAdmin);
  const active = getActiveRailSection(pathname, sections);
  const pinnedSection = sections.find((s) => s.id === RAIL_PINNED_TOP_SECTION_ID);

  return (
    <nav
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-[45] w-[80px] flex-col border-r border-border/40 bg-muted/20"
      aria-label="Navigation principale"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Liste qui défile ; spacer = hauteur bande messagerie (alignée logo) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-1.5 pt-0 [scrollbar-gutter:stable]">
          <div className={cn(RAIL_TOP_STRIP_H, "w-full shrink-0")} aria-hidden />
          {scrollSections.map((s) => (
            <div key={s.id} className="flex justify-center">
              <RailNavItem
                section={s}
                isActive={active?.id === s.id}
                unreadMessages={unreadMessages}
              />
            </div>
          ))}
        </div>

        {/* Messagerie : fixe par-dessus le scroll, même hauteur que la bande logo à droite */}
        {pinnedSection && (
          <div
            className={cn(
              "pointer-events-none absolute left-0 right-0 top-0 z-10 flex w-[80px] items-center justify-center border-b border-border/30 bg-muted/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-muted/80",
              RAIL_TOP_STRIP_H,
            )}
            role="presentation"
          >
            <div className="pointer-events-auto flex justify-center">
              <RailNavItem
                section={pinnedSection}
                isActive={active?.id === pinnedSection.id}
                unreadMessages={unreadMessages}
                pinned
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
