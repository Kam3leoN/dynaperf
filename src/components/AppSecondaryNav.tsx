import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import {
  filterSecondaryNavItems,
  getActiveRailSection,
  RAIL_SECTIONS_ALL,
} from "@/config/appNavigation";
import { MessagingSecondaryNav } from "@/components/messaging/MessagingSecondaryNav";
import { publicAssetUrl } from "@/lib/basePath";

const SECONDARY_LOGO_LIGHT = publicAssetUrl("DynaPerf_light_simple.svg");
const SECONDARY_LOGO_DARK = publicAssetUrl("DynaPerf_dark_simple.svg");

interface AppSecondaryNavPanelProps {
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
  className?: string;
}

/**
 * Contenu de la colonne secondaire ~280px type Discord (réutilisable dans le sheet mobile).
 */
export function AppSecondaryNavPanel({ isAdmin, hasPermission, className }: AppSecondaryNavPanelProps) {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const active = getActiveRailSection(pathname, RAIL_SECTIONS_ALL);
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
        <img
          src={secondaryLogoSrc}
          alt="DynaPerf"
          className="h-10 w-auto max-w-[min(100%,220px)] object-contain object-left"
          width={220}
          height={42}
          decoding="async"
        />
      </div>

      {active.id === "messages" ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <MessagingSecondaryNav />
        </div>
      ) : (
        <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1 min-h-0">
          {filterSecondaryNavItems(active.children, hasPermission).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive ? "bg-primary/12 text-primary font-medium" : "text-foreground hover:bg-secondary/70",
                )
              }
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4 text-muted-foreground w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

interface AppSecondaryNavProps {
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
}

/**
 * Colonne secondaire desktop (~280px) : sous-menus de la section active.
 */
export function AppSecondaryNav({ isAdmin, hasPermission }: AppSecondaryNavProps) {
  return (
    <aside className="hidden shell:flex fixed left-[80px] top-0 bottom-0 z-[45] w-[280px] flex-col border-r border-border/40 bg-muted/10 min-h-0">
      <AppSecondaryNavPanel isAdmin={isAdmin} hasPermission={hasPermission} className="flex-1 min-h-0" />
    </aside>
  );
}
