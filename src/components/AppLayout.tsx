import { NavLink, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faClipboardList, faUserShield, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "./ThemeToggle";
import { ExcelExport } from "./ExcelExport";
import { FiltersBar } from "./FiltersBar";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import type { Filters } from "@/hooks/useAuditData";

interface AppLayoutProps {
  children: React.ReactNode;
  audits?: any[];
  filters?: Filters;
  setFilters?: (f: Filters) => void;
}

export function AppLayout({ children, audits, filters, setFilters }: AppLayoutProps) {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();

  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-primary text-primary-foreground"
        : "text-foreground/70 hover:text-foreground hover:bg-secondary"
    }`;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card shadow-soft border-b border-border px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="font-sora text-lg font-bold text-foreground tracking-tight">DynaPerf</h1>
            </div>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={() => linkClass("/")}>
                <FontAwesomeIcon icon={faChartLine} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </NavLink>
              <NavLink to="/registre" className={() => linkClass("/registre")}>
                <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Registre</span>
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={() => linkClass("/admin")}>
                  <FontAwesomeIcon icon={faUserShield} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {audits && <ExcelExport audits={audits} />}
            {filters && setFilters && <FiltersBar filters={filters} setFilters={setFilters} />}
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut} title="Déconnexion">
              <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
