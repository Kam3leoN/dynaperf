import { useState, useEffect } from "react";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faRightFromBracket,
  faBars,
  faSliders,
  faUserShield,
  faChartLine,
  faPlus,
  faChevronDown,
  faListCheck,
  faEye,
  faUser,
  faKey,
  faEnvelope,
  faHandshake,
  faBell,
  faUsers,
  faBriefcase,
  faMapLocationDot,
  faComments,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "@/hooks/useAdmin";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "next-themes";
import logoDark from "@/assets/DynaPerf_dark.svg";
import logoLight from "@/assets/DynaPerf_light.svg";
import { FiltersBar } from "./FiltersBar";
import { OnlineAvatars } from "./OnlineAvatars";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import type { Filters } from "@/hooks/useAuditData";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppLayoutProps {
  children: React.ReactNode;
  filters?: Filters;
  setFilters?: (f: Filters) => void;
}

export function AppLayout({ children, filters, setFilters }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? null);
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [user]);

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`;

  const isAuditSection = ["/dashboard", "/audits", "/audits/new", "/audits/new/form"].includes(location.pathname);
  const isActiviteSection = ["/activite", "/activite/new", "/activite/dashboard"].includes(location.pathname);
  const isReseauSection = ["/reseau", "/reseau/partenaires", "/reseau/clubs", "/reseau/secteurs"].includes(location.pathname);

  const dropdownClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`;

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de réinitialisation envoyé à " + user.email);
  };

  const initials = (displayName || user?.email?.split("@")[0] || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profileButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-full overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all flex items-center justify-center shrink-0" title="Profil">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-primary">{initials}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-medium text-foreground truncate">{displayName || "Utilisateur"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
            <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5" />
            Modifier mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/change-password" className="flex items-center gap-2 cursor-pointer">
            <FontAwesomeIcon icon={faKey} className="h-3.5 w-3.5" />
            Modifier mon mot de passe
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleForgotPassword} className="flex items-center gap-2 cursor-pointer">
          <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5" />
          Mot de passe oublié
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="flex items-center gap-2 cursor-pointer">
            <FontAwesomeIcon icon={faBell} className="h-3.5 w-3.5" />
            Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
          <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const desktopNav = () => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={dropdownClass(isAuditSection)}>
            <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
            <span>Audits</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 ml-0.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
              Tableau de bord audits
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/audits" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
              Voir tous les audits
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/audits/new" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
              Créer un nouvel audit
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={dropdownClass(isActiviteSection)}>
            <FontAwesomeIcon icon={faListCheck} className="h-3.5 w-3.5" />
            <span>Activité</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 ml-0.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem asChild>
            <Link to="/activite/dashboard" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
              Tableau de bord suivis
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/activite" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
              Voir tous les suivis
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/activite/new" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
              Créer un suivi d'activité
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={dropdownClass(isReseauSection)}>
            <FontAwesomeIcon icon={faHandshake} className="h-3.5 w-3.5" />
            <span>Réseau</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 ml-0.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem asChild>
            <Link to="/reseau/partenaires" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
              Partenaires
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/reseau/clubs" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faBriefcase} className="h-3.5 w-3.5" />
              Clubs d'affaires
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/reseau/secteurs" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon icon={faMapLocationDot} className="h-3.5 w-3.5" />
              Secteurs / Zones
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NavLink to="/business-plan" className={() => linkClass("/business-plan")}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Business Plan</span>
      </NavLink>

      <NavLink to="/messages" className={() => linkClass("/messages")}>
        <FontAwesomeIcon icon={faComments} className="h-3.5 w-3.5" />
        <span>Messages</span>
      </NavLink>

      <NavLink to="/historique" className={() => linkClass("/historique")}>
        <FontAwesomeIcon icon={faClockRotateLeft} className="h-3.5 w-3.5" />
        <span>Historique</span>
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={() => linkClass("/admin")}>
          <FontAwesomeIcon icon={faUserShield} className="h-3.5 w-3.5" />
          <span>Admin</span>
        </NavLink>
      )}
    </>
  );

  const mobileNav = () => (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Audits</p>
      <NavLink to="/dashboard" end className={() => linkClass("/dashboard")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Tableau de bord audits</span>
      </NavLink>
      <NavLink to="/audits" className={() => linkClass("/audits")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
        <span>Voir tous les audits</span>
      </NavLink>
      <NavLink to="/audits/new" className={() => linkClass("/audits/new")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
        <span>Créer un nouvel audit</span>
      </NavLink>

      <div className="border-t border-border my-2" />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Activité</p>
      <NavLink to="/activite/dashboard" className={() => linkClass("/activite/dashboard")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Tableau de bord suivis</span>
      </NavLink>
      <NavLink to="/activite" className={() => linkClass("/activite")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />
        <span>Voir tous les suivis</span>
      </NavLink>
      <NavLink to="/activite/new" className={() => linkClass("/activite/new")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
        <span>Créer un suivi</span>
      </NavLink>

      <div className="border-t border-border my-2" />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Réseau</p>
      <NavLink to="/reseau/partenaires" className={() => linkClass("/reseau/partenaires")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
        <span>Partenaires</span>
      </NavLink>
      <NavLink to="/reseau/clubs" className={() => linkClass("/reseau/clubs")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faBriefcase} className="h-3.5 w-3.5" />
        <span>Clubs d'affaires</span>
      </NavLink>
      <NavLink to="/reseau/secteurs" className={() => linkClass("/reseau/secteurs")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faMapLocationDot} className="h-3.5 w-3.5" />
        <span>Secteurs / Zones</span>
      </NavLink>

      <div className="border-t border-border my-2" />

      <NavLink to="/business-plan" className={() => linkClass("/business-plan")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Business Plan</span>
      </NavLink>
      <NavLink to="/messages" className={() => linkClass("/messages")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faComments} className="h-3.5 w-3.5" />
        <span>Messages</span>
      </NavLink>
      <NavLink to="/historique" className={() => linkClass("/historique")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faClockRotateLeft} className="h-3.5 w-3.5" />
        <span>Historique</span>
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={() => linkClass("/admin")} onClick={() => setMobileOpen(false)}>
          <FontAwesomeIcon icon={faUserShield} className="h-3.5 w-3.5" />
          <span>Admin</span>
        </NavLink>
      )}

      <div className="border-t border-border my-2" />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">Profil</p>
      <NavLink to="/profile" className={() => linkClass("/profile")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5" />
        <span>Modifier mon profil</span>
      </NavLink>
      <NavLink to="/change-password" className={() => linkClass("/change-password")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faKey} className="h-3.5 w-3.5" />
        <span>Modifier mon mot de passe</span>
      </NavLink>
      <NavLink to="/notifications" className={() => linkClass("/notifications")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faBell} className="h-3.5 w-3.5" />
        <span>Notifications</span>
      </NavLink>
      <button onClick={() => { setMobileOpen(false); handleForgotPassword(); }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors text-left">
        <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5" />
        <span>Mot de passe oublié</span>
      </button>
      <button onClick={() => { setMobileOpen(false); signOut(); }} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left">
        <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
        <span>Déconnexion</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card shadow-soft border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="shrink-0">
              <img
                src={resolvedTheme === "dark" ? logoDark : logoLight}
                alt="DynaPerf"
                className="h-7 sm:h-8"
              />
            </Link>
            {!isMobile && (
              <nav className="flex items-center gap-1">
                {desktopNav()}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="max-w-[120px] sm:max-w-none overflow-hidden">
              <OnlineAvatars />
            </div>

            {filters && setFilters && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setFiltersOpen(true)} title="Filtres">
                <FontAwesomeIcon icon={faSliders} className="h-4 w-4" />
              </Button>
            )}

            <ThemeToggle />

            {!isMobile && profileButton()}

            {isMobile && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 p-4 border-b border-border">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs border border-border">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{displayName || "Menu"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1">
                      {mobileNav()}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      {filters && setFilters && (
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent side="right" className="w-80 sm:w-96">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-base">
                <FontAwesomeIcon icon={faSliders} className="h-4 w-4 text-primary" />
                Filtres
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersBar filters={filters} setFilters={setFilters} vertical />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {children}
      </main>
    </div>
  );
}
