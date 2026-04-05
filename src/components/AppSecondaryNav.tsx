import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import logoDark from "@/assets/DynaPerf_dark.svg";
import logoLight from "@/assets/DynaPerf_light.svg";
import { cn } from "@/lib/utils";
import { getActiveRailSection, getRailSections } from "@/config/appNavigation";
import { MessagingSecondaryNav } from "@/components/messaging/MessagingSecondaryNav";

interface AppSecondaryNavPanelProps {
  isAdmin: boolean;
  className?: string;
}

/**
 * Contenu de la colonne secondaire ~280px type Discord (réutilisable dans le sheet mobile).
 */
export function AppSecondaryNavPanel({ isAdmin, className }: AppSecondaryNavPanelProps) {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();
  const sections = getRailSections(isAdmin);
  const active = getActiveRailSection(pathname, sections);

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
      <div className="flex h-[4.25rem] shrink-0 items-center justify-center px-3">
        <img
          src={resolvedTheme === "dark" ? logoDark : logoLight}
          alt="DynaPerf"
          className="h-14 w-auto max-w-full object-contain"
        />
      </div>

      {active.id === "messages" ? (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <MessagingSecondaryNav />
        </div>
      ) : (
        <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1 min-h-0">
          {active.children.map((item) => (
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
}

/**
 * Colonne secondaire desktop (~280px) : sous-menus de la section active.
 */
export function AppSecondaryNav({ isAdmin }: AppSecondaryNavProps) {
  return (
    <aside className="hidden lg:flex fixed left-[80px] top-0 bottom-0 z-[45] w-[280px] flex-col border-r border-border/40 bg-muted/10 min-h-0">
      <AppSecondaryNavPanel isAdmin={isAdmin} className="flex-1 min-h-0" />
    </aside>
  );
}
