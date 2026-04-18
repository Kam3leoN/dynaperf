import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { getDocNavNeighbors, RAIL_SECTIONS_ALL } from "@/config/appNavigation";
import { usePermissionGate } from "@/contexts/PermissionsContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";

const cardClass =
  "group flex h-full min-h-[5.5rem] flex-col justify-center gap-1 rounded-2xl border border-border/50 bg-muted/15 p-5 text-left transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2";

/**
 * Navigation « Précédent / À suivre » façon documentation Material (m3.material.io),
 * basée sur l’ordre des entrées du sous-menu de la section active.
 * Masqué sur l’accueil (`/`) et si aucun voisin n’est disponible.
 */
export function DocsPrevNextNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const { hasPermission, isModuleEnabled } = usePermissionGate();

  const neighbors = useMemo(
    () =>
      getDocNavNeighbors(pathname, RAIL_SECTIONS_ALL, {
        hasPermission,
        isModuleEnabled,
        isSuperAdmin,
      }),
    [pathname, hasPermission, isModuleEnabled, isSuperAdmin],
  );

  if (!neighbors) return null;
  const { prev, next } = neighbors;

  return (
    <nav
      aria-label="Navigation dans la section"
      className="mt-10 grid grid-cols-1 gap-3 border-t border-border/40 pt-8 sm:grid-cols-2 sm:gap-4"
    >
      <div className="min-w-0">
        {prev ? (
          <Link to={prev.to} className={cardClass}>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Précédent
            </span>
            <span className="text-lg font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
              {prev.label}
            </span>
          </Link>
        ) : (
          <div className="hidden sm:min-h-0 sm:block" aria-hidden />
        )}
      </div>

      <div className="min-w-0">
        {next ? (
          <Link to={next.to} className={cardClass}>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              À suivre
              <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 opacity-80" aria-hidden />
            </span>
            <span className="text-lg font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
              {next.label}
            </span>
          </Link>
        ) : (
          <div className="hidden sm:min-h-0 sm:block" aria-hidden />
        )}
      </div>
    </nav>
  );
}
