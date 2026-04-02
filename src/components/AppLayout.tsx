import { useState, useEffect, lazy, Suspense } from "react";
import { AiAssistant } from "@/components/AiAssistant";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faRightFromBracket,
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
  faClockRotateLeft,
  faGear,
  faCalendarPlus,
  faMoneyBill,
  faFolder,
  faUpload,
  faComments,
  faSquarePollVertical,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import logoDark from "@/assets/DynaPerf_dark.svg";
import logoLight from "@/assets/DynaPerf_light.svg";
import { FiltersBar } from "./FiltersBar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
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
import { BottomNav } from "./BottomNav";
import { useNotifications } from "@/hooks/useNotifications";

interface AppLayoutProps {
  children: React.ReactNode;
  filters?: Filters;
  setFilters?: (f: Filters) => void;
  availableYears?: number[];
}

export function AppLayout({ children, filters, setFilters, availableYears }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { unreadCount: unreadNotifications } = useNotifications();

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

    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("read", false)
      .then(({ count }) => setUnreadMessages(count ?? 0));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        () => {
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("read", false)
            .then(({ count }) => setUnreadMessages(count ?? 0));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isAuditSection = ["/dashboard", "/audits", "/audits/new", "/audits/new/version", "/audits/new/form"].includes(location.pathname);
  const isActiviteSection = ["/activite", "/activite/new", "/activite/new/version", "/activite/dashboard"].includes(location.pathname);
  const isReseauSection = ["/reseau", "/reseau/partenaires", "/reseau/clubs", "/reseau/secteurs", "/business-plan"].includes(location.pathname);
  const isCommunauteSection = ["/messages", "/sondages"].includes(location.pathname);

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

  const navPill = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
      active
        ? "bg-primary/12 text-primary"
        : "text-foreground/60 hover:text-foreground hover:bg-secondary/60"
    }`;

  const iconBadge = (icon: typeof faBell, to: string, count: number, title: string) => (
    <Link to={to} className="relative h-11 w-11 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors" title={title}>
      <FontAwesomeIcon icon={icon} className="h-5 w-5 text-foreground/60" />
      {count > 0 && (
        <span className="absolute top-0 right-0 min-w-[20px] h-[20px] rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );

  const profileButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-11 w-11 rounded-full overflow-hidden border-2 border-border hover:border-primary/40 transition-all flex items-center justify-center shrink-0" title="Profil">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-primary">{initials}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground truncate">{displayName || "Utilisateur"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2.5 cursor-pointer">
            <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-muted-foreground" />
            Modifier mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/change-password" className="flex items-center gap-2.5 cursor-pointer">
            <FontAwesomeIcon icon={faKey} className="h-4 w-4 text-muted-foreground" />
            Modifier mon mot de passe
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleForgotPassword} className="flex items-center gap-2.5 cursor-pointer">
          <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-muted-foreground" />
          Mot de passe oublié
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/primes" className="flex items-center gap-2.5 cursor-pointer">
            <FontAwesomeIcon icon={faMoneyBill} className="h-4 w-4 text-muted-foreground" />
            Mes primes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/preferences" className="flex items-center gap-2.5 cursor-pointer">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4 text-muted-foreground" />
            Préférences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive">
          <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const desktopNav = () => (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={navPill(isAuditSection)}>
            <FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />
            <span>Audits</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-2xl">
          <DropdownMenuItem asChild><Link to="/dashboard" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-muted-foreground" />Tableau de bord</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/audits" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faClipboardList} className="h-4 w-4 text-muted-foreground" />Tous les audits</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/audits/new" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faPlus} className="h-4 w-4 text-muted-foreground" />Nouvel audit</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/audits?plan=1" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4 text-amber-500" />Planifier un audit</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={navPill(isActiviteSection)}>
            <FontAwesomeIcon icon={faListCheck} className="h-4 w-4" />
            <span>Activité</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-2xl">
          <DropdownMenuItem asChild><Link to="/activite/dashboard" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-muted-foreground" />Tableau de bord</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/activite" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faEye} className="h-4 w-4 text-muted-foreground" />Tous les suivis</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/activite/new/version" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faPlus} className="h-4 w-4 text-muted-foreground" />Nouveau suivi</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/activite?plan=1" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faCalendarPlus} className="h-4 w-4 text-amber-500" />Planifier un suivi</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={navPill(isReseauSection)}>
            <FontAwesomeIcon icon={faHandshake} className="h-4 w-4" />
            <span>Réseau</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-2xl">
          <DropdownMenuItem asChild><Link to="/reseau/partenaires" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-muted-foreground" />Partenaires</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/reseau/clubs" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faBriefcase} className="h-4 w-4 text-muted-foreground" />Clubs d'affaires</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/reseau/secteurs" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faMapLocationDot} className="h-4 w-4 text-muted-foreground" />Secteurs / Zones</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/business-plan" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-muted-foreground" />Business Plan</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={navPill(location.pathname === "/drive")}>
            <FontAwesomeIcon icon={faFolder} className="h-4 w-4" />
            <span>Drive</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-2xl">
          <DropdownMenuItem asChild><Link to="/drive" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faFolder} className="h-4 w-4 text-muted-foreground" />Tous les dossiers</Link></DropdownMenuItem>
          {isAdmin && <DropdownMenuItem asChild><Link to="/drive?upload=1" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faUpload} className="h-4 w-4 text-muted-foreground" />Ajouter un fichier</Link></DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={navPill(isCommunauteSection)}>
            <FontAwesomeIcon icon={faComments} className="h-4 w-4" />
            <span>Communauté</span>
            <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-2xl">
          <DropdownMenuItem asChild><Link to="/messages" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-muted-foreground" />Messagerie</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/sondages" className="flex items-center gap-2.5 cursor-pointer"><FontAwesomeIcon icon={faSquarePollVertical} className="h-4 w-4 text-muted-foreground" />Sondages</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NavLink to="/historique" className={() => navPill(location.pathname === "/historique")}>
        <FontAwesomeIcon icon={faClockRotateLeft} className="h-4 w-4" /><span>Historique</span>
      </NavLink>

      {isAdmin && (
        <NavLink to="/admin" className={() => navPill(location.pathname === "/admin")}>
          <FontAwesomeIcon icon={faUserShield} className="h-4 w-4" /><span>Admin</span>
        </NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/60 px-4 lg:px-6">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-5">
            <Link to="/" className="shrink-0">
              <img
                src={resolvedTheme === "dark" ? logoDark : logoLight}
                alt="DynaPerf"
                className="h-8 lg:h-8"
              />
            </Link>
            {!isMobile && (
              <nav className="flex items-center gap-1">
                {desktopNav()}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            {filters && setFilters && (
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setFiltersOpen(true)} title="Filtres">
                <FontAwesomeIcon icon={faSliders} className="h-[18px] w-[18px]" />
              </Button>
            )}

            {iconBadge(faBell, "/notifications", unreadNotifications, "Notifications")}
            {iconBadge(faEnvelope, "/messages", unreadMessages, "Messages")}

            {/* Gear icon only on desktop */}
            {!isMobile && (
              <Link to="/preferences" className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors" title="Préférences">
                <FontAwesomeIcon icon={faGear} className="h-[18px] w-[18px] text-foreground/60" />
              </Link>
            )}

            {profileButton()}
          </div>
        </div>
      </header>

      {/* Filters sheet */}
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
              <FiltersBar filters={filters} setFilters={setFilters} vertical availableYears={availableYears} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main content */}
      <main className="max-w-[1440px] mx-auto px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6 pb-24 lg:pb-6">
        {children}
      </main>

      {/* Bottom navigation (mobile only) */}
      {isMobile && <BottomNav />}

      {/* AI Assistant FAB */}
      <AiAssistant />
    </div>
  );
}
