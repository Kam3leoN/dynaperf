import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faEnvelope,
  faGear,
  faIcons,
  faKey,
  faPalette,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { BackupButton, SqlBackupButton } from "./AdminBackupButtons";

const NAV = [
  { to: "/admin/users", label: "Utilisateurs", icon: faUsers },
  { to: "/admin/application", label: "Application", icon: faGear },
  { to: "/admin/branding", label: "Identité", icon: faPalette },
  { to: "/admin/roles", label: "Rôles & droits", icon: faKey },
  { to: "/admin/expression", label: "Expression", icon: faIcons },
  { to: "/admin/invitations", label: "Invitations", icon: faEnvelope },
] as const;

function AdminNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Sections administration">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-11 sm:min-h-10",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )
          }
        >
          <FontAwesomeIcon icon={item.icon} className="h-4 w-4 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Layout administration : menu et sauvegardes dans un drawer à gauche ; le contenu principal occupe toute la largeur.
 */
export default function AdminShell() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppLayout>
      <div className="app-page-shell flex min-w-0 w-full max-w-full flex-col gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-md">
                <FontAwesomeIcon icon={faBars} className="h-4 w-4" aria-hidden />
                Menu administration
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[min(100%,320px)] flex-col gap-4 sm:max-w-md">
              <SheetHeader className="text-left">
                <SheetTitle>Administration</SheetTitle>
              </SheetHeader>
              <AdminNavLinks onNavigate={() => setDrawerOpen(false)} />
              {user && isSuperAdmin ? (
                <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sauvegardes</p>
                  <div className="flex flex-col gap-2">
                    <BackupButton />
                    <SqlBackupButton />
                  </div>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Utilisez le menu pour accéder aux sections et aux outils de sauvegarde (super admin).
          </p>
        </div>

        <main className="min-w-0 w-full flex-1 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </AppLayout>
  );
}
