import { useState } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
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
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import type { Filters } from "@/hooks/useAuditData";

interface AppLayoutProps {
  children: React.ReactNode;
  filters?: Filters;
  setFilters?: (f: Filters) => void;
}

export function AppLayout({ children, filters, setFilters }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`;

  const isAuditSection = ["/dashboard", "/audits", "/audits/new", "/audits/new/form"].includes(location.pathname);
  const isActiviteSection = ["/activite", "/activite/new", "/activite/dashboard"].includes(location.pathname);

  const dropdownClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`;

  // Desktop nav with Audits dropdown
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

      <NavLink to="/business-plan" className={() => linkClass("/business-plan")}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Business Plan</span>
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={() => linkClass("/admin")}>
          <FontAwesomeIcon icon={faUserShield} className="h-3.5 w-3.5" />
          <span>Admin</span>
        </NavLink>
      )}
    </>
  );

  // Mobile nav (flat links)
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

      <NavLink to="/business-plan" className={() => linkClass("/business-plan")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Business Plan</span>
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={() => linkClass("/admin")} onClick={() => setMobileOpen(false)}>
          <FontAwesomeIcon icon={faUserShield} className="h-3.5 w-3.5" />
          <span>Admin</span>
        </NavLink>
      )}
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
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {desktopNav()}
            </nav>
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
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut} title="Déconnexion">
              <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            </Button>

            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
                  <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <span className="text-sm font-bold text-foreground">Menu</span>
                  </div>
                  <nav className="flex flex-col gap-1 p-4">
                    {mobileNav()}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Filters drawer */}
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
