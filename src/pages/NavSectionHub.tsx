import { Link, Navigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type RailSection,
  RAIL_SECTIONS_ALL,
  filterSecondaryNavItems,
  navHubPath,
} from "@/config/appNavigation";
import { usePermissionGate } from "@/contexts/PermissionsContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";

function canAccessSection(
  section: RailSection,
  isAdmin: boolean,
  hasPermission: (key: string) => boolean,
  isModuleEnabled: (key: string) => boolean,
): boolean {
  if (section.requireAdmin && !isAdmin) return false;
  if (section.requiredPermission && !hasPermission(section.requiredPermission)) return false;
  if (section.requiredModule && !isModuleEnabled(section.requiredModule)) return false;
  return true;
}

/**
 * Page « vue d’ensemble » Material 3 : cartes vers chaque destination du menu (pas seulement le 1er lien).
 */
export default function NavSectionHub() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin(user);
  const { hasPermission, isModuleEnabled, loading: permLoading } = usePermissionGate();

  const section = sectionId ? RAIL_SECTIONS_ALL.find((s) => s.id === sectionId) : undefined;

  if (!sectionId || !section) {
    return <Navigate to="/" replace />;
  }

  /**
   * Important : `useAdmin` est instancié par ce composant — au 1er rendu `isAdmin` est encore false
   * jusqu’à la fin du fetch `user_roles`. Sans attendre `adminLoading` / `permLoading`, on redirige
   * à tort vers `/` (ex. clic rail Admin depuis `/admin/badges` → hub `/nav/admin`).
   */
  if (adminLoading || permLoading) {
    return (
      <div
        className="min-h-[50vh] bg-background flex items-center justify-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </div>
    );
  }

  if (!canAccessSection(section, isAdmin, hasPermission, isModuleEnabled)) {
    return <Navigate to="/" replace />;
  }

  const hubPath = navHubPath(section.id);
  const items = filterSecondaryNavItems(section.children, hasPermission, isModuleEnabled, {
    isSuperAdmin,
  }).filter((item) => item.to !== hubPath);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-8">
        <header>
          <h1 className="text-6xl font-bold tracking-tight text-foreground sm:text-7xl">{section.label}</h1>
        </header>

        <div
          className={cn(
            "grid gap-3 sm:gap-4",
            items.length <= 2 ? "sm:grid-cols-1" : "sm:grid-cols-2",
          )}
        >
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="group block min-w-0">
              <Card
                className={cn(
                  "h-full border-border/60 bg-card shadow-soft transition-all duration-200",
                  "hover:border-primary/35 hover:shadow-hover hover:-translate-y-0.5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                )}
              >
                <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      "bg-primary/10 text-primary",
                      "transition-colors group-hover:bg-primary/15",
                    )}
                  >
                    <FontAwesomeIcon icon={item.icon} className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </p>
                  </div>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune destination disponible avec vos droits actuels.</p>
        )}
      </div>
    </AppLayout>
  );
}
