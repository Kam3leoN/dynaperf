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
 * Layout administration : navigation latérale (drawer sur mobile) et zone de contenu (`Outlet`).
 */
export default function AdminShell() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppLayout>
      <div className="app-page-shell flex flex-col gap-4 min-w-0 md:flex-row md:gap-6 md:items-start">
        <div className="flex items-center justify-between gap-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-md">
                <FontAwesomeIcon icon={faBars} className="h-4 w-4" aria-hidden />
                Menu admin
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,280px)] flex flex-col gap-4">
              <SheetHeader className="text-left">
                <SheetTitle>Administration</SheetTitle>
              </SheetHeader>
              <AdminNavLinks onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          {user && isSuperAdmin ? (
            <div className="flex gap-1 shrink-0">
              <BackupButton />
              <SqlBackupButton />
            </div>
          ) : null}
        </div>

        <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-4 md:sticky md:top-4 md:self-start border-r border-border/60 pr-4 min-h-[200px]">
          <AdminNavLinks />
          {user && isSuperAdmin ? (
            <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sauvegardes</p>
              <div className="flex flex-col gap-2">
                <BackupButton />
                <SqlBackupButton />
              </div>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </AppLayout>
  );
}
