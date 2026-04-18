import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faCommentDots, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { getRailScrollSections } from "@/config/appNavigation";
import { cn } from "@/lib/utils";

interface MobilePrimaryNavSheetProps {
  onNavigate: () => void;
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
  isModuleEnabled: (key: string) => boolean;
}

const linkClass =
  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/[0.08] active:bg-primary/[0.12]";

/**
 * Menu latéral mobile : mêmes destinations que le rail (hubs), sans ancienne colonne secondaire.
 */
export function MobilePrimaryNavSheet({
  onNavigate,
  isAdmin,
  hasPermission,
  isModuleEnabled,
}: MobilePrimaryNavSheetProps) {
  const sections = getRailScrollSections(isAdmin, hasPermission, isModuleEnabled);

  return (
    <nav className="flex flex-col gap-1 p-3 pb-8" aria-label="Navigation principale">
      <Link to="/" onClick={onNavigate} className={cn(linkClass, "mb-1 border-b border-border/40 pb-3")}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
        </span>
        <span>Accueil</span>
      </Link>

      {sections.map((section) =>
        section.id === "messages" ? (
          <div key="messages" className="flex flex-col gap-0.5 py-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Messages</p>
            <Link to="/messages?section=discussion" onClick={onNavigate} className={linkClass}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80">
                <FontAwesomeIcon icon={faCommentDots} className="h-5 w-5" />
              </span>
              Discussions
            </Link>
            <Link to="/messages?section=messagerie" onClick={onNavigate} className={linkClass}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80">
                <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
              </span>
              Messages privés
            </Link>
          </div>
        ) : (
          <Link key={section.id} to={section.to} onClick={onNavigate} className={linkClass}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FontAwesomeIcon icon={section.icon} className="h-5 w-5" />
            </span>
            {section.label}
          </Link>
        ),
      )}
    </nav>
  );
}
