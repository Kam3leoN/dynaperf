import { useState } from "react";
import { NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faRightFromBracket, faBars, faSliders, faUserShield, faPlus, faList } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "@/hooks/useAdmin";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "next-themes";
import logoDark from "@/assets/DynaPerf_dark.svg";
import logoLight from "@/assets/DynaPerf_light.svg";
import { ExcelExport } from "./ExcelExport";
import { FiltersBar } from "./FiltersBar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "./ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import type { Filters } from "@/hooks/useAuditData";

interface AppLayoutProps {
  children: React.ReactNode;
  audits?: any[];
  filters?: Filters;
  setFilters?: (f: Filters) => void;
}

export function AppLayout({ children, audits, filters, setFilters }: AppLayoutProps) {
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

  const navigate = useNavigate();
  const isAuditsActive = location.pathname === "/audits" || location.pathname === "/audits/new";

  const auditsDropdown = (onItemClick?: () => void) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isAuditsActive
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70 hover:text-foreground hover:bg-secondary"
          }`}
        >
          <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
          <span>Audits</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5 opacity-60"><path d="m6 9 6 6 6-6"/></svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={() => { navigate("/audits"); onItemClick?.(); }} className="gap-2 cursor-pointer">
          <FontAwesomeIcon icon={faList} className="h-3.5 w-3.5 text-muted-foreground" />
          Vue d'ensemble
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigate("/audits/new"); onItemClick?.(); }} className="gap-2 cursor-pointer">
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5 text-muted-foreground" />
          Ajouter un nouvel audit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const navLinks = (closeMobile?: boolean) => (
    <>
      {auditsDropdown(closeMobile ? () => setMobileOpen(false) : undefined)}
      {isAdmin && (
        <NavLink to="/admin" className={() => linkClass("/admin")} onClick={() => closeMobile && setMobileOpen(false)}>
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
              {navLinks()}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {audits && <div className="hidden sm:block"><ExcelExport audits={audits} /></div>}

            {/* Filters drawer trigger */}
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
                    {navLinks(true)}
                  </nav>
                  <div className="p-4 space-y-3 border-t border-border">
                    {audits && <ExcelExport audits={audits} />}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Filters drawer from right */}
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
