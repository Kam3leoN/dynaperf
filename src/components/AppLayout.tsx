import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faClipboardList, faRightFromBracket, faBars } from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "./ThemeToggle";
import { ExcelExport } from "./ExcelExport";
import { FiltersBar } from "./FiltersBar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
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
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`;

  const navLinks = (
    <>
      <NavLink to="/" end className={() => linkClass("/")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/registre" className={() => linkClass("/registre")} onClick={() => setMobileOpen(false)}>
        <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
        <span>Registre</span>
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card shadow-soft border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">DynaPerf</h1>
            </div>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {audits && <div className="hidden sm:block"><ExcelExport audits={audits} /></div>}
            {filters && setFilters && <div className="hidden lg:block"><FiltersBar filters={filters} setFilters={setFilters} /></div>}
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
                    {navLinks}
                  </nav>
                  <div className="p-4 space-y-3 border-t border-border">
                    {audits && <ExcelExport audits={audits} />}
                    {filters && setFilters && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtres</p>
                        <FiltersBar filters={filters} setFilters={setFilters} vertical />
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      {/* Mobile filters bar below header on lg-hidden screens */}
      {filters && setFilters && (
        <div className="lg:hidden bg-card border-b border-border px-4 py-2 overflow-x-auto">
          <FiltersBar filters={filters} setFilters={setFilters} />
        </div>
      )}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {children}
      </main>
    </div>
  );
}
