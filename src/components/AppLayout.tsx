import { useState, useEffect, lazy, Suspense } from "react";
import { AiAssistant } from "@/components/AiAssistant";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faRightFromBracket,
  faSliders,
  faUser,
  faKey,
  faEnvelope,
  faThumbtack,
  faBell,
  faUsers,
  faGear,
  faMoneyBill,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "@/hooks/useAdmin";
import { FiltersBar } from "./FiltersBar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useMyPresence } from "@/hooks/useMyPresence";
import { PresenceAvatarBadge } from "./PresenceAvatarBadge";
import {
  DURATION_OPTIONS,
  PRESENCE_COLORS,
  PRESENCE_LABELS,
  expiresAtForDuration,
  presenceLabelFor,
  type PresenceStatus,
  type DurationKey,
} from "@/lib/presence";
import type { Filters } from "@/hooks/useAuditData";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNav } from "./BottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { MembersDirectoryPanel } from "./MembersDirectoryPanel";
import { AppNavRail } from "./AppNavRail";
import { DesktopUserDock } from "./DesktopUserDock";
import { AppSecondaryNav, AppSecondaryNavPanel } from "./AppSecondaryNav";
import { getActiveRailSection, RAIL_SECTIONS_ALL } from "@/config/appNavigation";
import { usePermissionGate } from "@/contexts/PermissionsContext";
import { useOptionalMessagingSidebarHost } from "@/contexts/MessagingSidebarContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  filters?: Filters;
  setFilters?: (f: Filters) => void;
  availableYears?: number[];
  /** Surcharge des classes du `<main>` (ex. messagerie pleine hauteur sans padding). */
  mainClassName?: string;
}

export function AppLayout({ children, filters, setFilters, availableYears, mainClassName }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { hasPermission } = usePermissionGate();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [secondaryNavSheetOpen, setSecondaryNavSheetOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { unreadCount: unreadNotifications } = useNotifications();
  const { row: presenceRow, setPresence } = useMyPresence(user?.id);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);

  const railSection = getActiveRailSection(location.pathname, RAIL_SECTIONS_ALL);
  const messagingSidebarHost = useOptionalMessagingSidebarHost();

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

  useEffect(() => {
    setSecondaryNavSheetOpen(false);
  }, [location.pathname]);

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

  const iconBadge = (icon: typeof faBell, to: string, count: number, title: string) => (
    <Link to={to} className="relative h-10 w-10 rounded-full flex items-center justify-center hover:bg-secondary/60 transition-colors" title={title}>
      <FontAwesomeIcon icon={icon} className="h-5 w-5 text-foreground/60" />
      {count > 0 && (
        <span className="absolute top-0 right-0 min-w-[20px] h-[20px] rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );

  const presenceStatusRow = (st: PresenceStatus) =>
    st === "invisible" ? (
      <span
        className="mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full box-border bg-transparent border-2 border-border/80"
        style={{ borderColor: PRESENCE_COLORS.invisible }}
        aria-hidden
      />
    ) : st === "dnd" ? (
      <span
        className="mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full box-border border border-border/70 flex items-center justify-center"
        style={{ backgroundColor: PRESENCE_COLORS.dnd }}
        aria-hidden
      >
        <span className="block w-[7px] h-[2px] bg-white rounded-full shrink-0" />
      </span>
    ) : (
      <span
        className="mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full box-border border border-border/70"
        style={{ backgroundColor: PRESENCE_COLORS[st] }}
        aria-hidden
      />
    );

  const setPresenceWithDuration = (status: PresenceStatus, key: DurationKey) => {
    void setPresence(status, expiresAtForDuration(new Date(), key));
  };

  const profileButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-transparent pl-0.5 pr-2 py-0 hover:bg-secondary/70 hover:border-border/60 transition-all shrink-0 max-w-[200px] md:max-w-[220px]"
          title="Profil et statut"
        >
          <div className="relative h-10 w-10 shrink-0">
            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-border flex items-center justify-center bg-secondary/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-primary">{initials}</span>
              )}
            </div>
            <PresenceAvatarBadge presence={presenceRow} />
          </div>
          {!isMobile && (
            <div className="hidden sm:flex flex-col items-start min-w-0 text-left leading-tight pr-0.5">
              <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                {displayName || "Utilisateur"}
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                {presenceLabelFor(presenceRow)}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground truncate">{displayName || "Utilisateur"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{presenceLabelFor(presenceRow)}</p>
        </div>
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Statut
        </DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer" onClick={() => void setPresence("online", null)}>
          {presenceStatusRow("online")}
          {PRESENCE_LABELS.online}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {presenceStatusRow("idle")}
            {PRESENCE_LABELS.idle}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl">
            {DURATION_OPTIONS.map((d) => (
              <DropdownMenuItem key={d.key} className="cursor-pointer" onClick={() => setPresenceWithDuration("idle", d.key)}>
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {presenceStatusRow("dnd")}
            {PRESENCE_LABELS.dnd}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl">
            {DURATION_OPTIONS.map((d) => (
              <DropdownMenuItem key={d.key} className="cursor-pointer" onClick={() => setPresenceWithDuration("dnd", d.key)}>
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            {presenceStatusRow("invisible")}
            {PRESENCE_LABELS.invisible}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl">
            {DURATION_OPTIONS.map((d) => (
              <DropdownMenuItem key={d.key} className="cursor-pointer" onClick={() => setPresenceWithDuration("invisible", d.key)}>
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
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

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      {/* Top app bar — le shell est en h-dvh + overflow-hidden sur la zone centrale : pas de scroll document */}
      <header className="z-40 shrink-0 bg-card/85 backdrop-blur-2xl border-b border-border/30 px-4 lg:px-0">
        <div className="w-full flex items-stretch justify-between h-16 lg:h-[4.25rem] lg:pl-[360px] lg:pr-[260px]">
          <div className="flex flex-1 items-center justify-between min-w-0 gap-2 pl-4 pr-4 lg:pl-6 lg:pr-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden h-10 w-10 rounded-full shrink-0"
                title="Menu de la section"
                aria-label="Ouvrir le menu de la section"
                onClick={() => setSecondaryNavSheetOpen(true)}
              >
                <FontAwesomeIcon icon={faBars} className="h-[18px] w-[18px] text-foreground/70" />
              </Button>
              {railSection && (
                <span
                  className="hidden sm:inline font-semibold text-foreground truncate max-w-[140px] md:max-w-[220px] shrink-0 text-[1.09375rem] leading-tight"
                  title={railSection.label}
                >
                  {railSection.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
            {filters && setFilters && (
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setFiltersOpen(true)} title="Filtres">
                <FontAwesomeIcon icon={faSliders} className="h-[18px] w-[18px]" />
              </Button>
            )}

            {iconBadge(faBell, "/notifications", unreadNotifications, "Notifications")}
            {location.pathname.startsWith("/messages") && messagingSidebarHost?.headerChrome && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 shrink-0 rounded-full"
                title="Messages épinglés"
                aria-label="Ouvrir les messages épinglés"
                onClick={() => messagingSidebarHost.headerChrome?.onOpenPinned()}
              >
                <FontAwesomeIcon icon={faThumbtack} className="h-[18px] w-[18px] text-foreground/60" />
                {messagingSidebarHost.headerChrome.pinnedCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {messagingSidebarHost.headerChrome.pinnedCount > 99
                      ? "99+"
                      : messagingSidebarHost.headerChrome.pinnedCount}
                  </span>
                )}
              </Button>
            )}
            {iconBadge(faEnvelope, "/messages", unreadMessages, "Messages")}

            {isMobile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0"
                title="Membres"
                aria-label="Ouvrir la liste des membres"
                onClick={() => setMembersSheetOpen(true)}
              >
                <FontAwesomeIcon icon={faUsers} className="h-[18px] w-[18px] text-foreground/60" />
              </Button>
            )}

            {/* Gear icon only on desktop */}
            {isMobile && profileButton()}
            </div>
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

      <div className="flex min-h-0 flex-1 flex-row overflow-x-auto overflow-y-hidden lg:pl-[360px] lg:pr-[260px]">
        <AppNavRail isAdmin={isAdmin} hasPermission={hasPermission} />
        <AppSecondaryNav isAdmin={isAdmin} hasPermission={hasPermission} />
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          <main
            className={cn(
              "mx-auto w-full max-w-[1440px] flex-1 min-h-0 space-y-5 py-5 pb-28 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] overflow-y-auto lg:max-w-none lg:space-y-6 lg:px-6 lg:py-6 lg:pb-6",
              mainClassName,
            )}
          >
            {children}
          </main>
          {isMobile && <BottomNav />}
        </div>

        <aside
          className="hidden lg:flex fixed right-0 top-0 bottom-0 z-[45] w-[260px] flex-col border-l border-border/40 bg-muted/10 min-h-0"
          aria-label="Annuaire des membres"
        >
          <MembersDirectoryPanel className="flex-1 min-h-0" />
        </aside>
      </div>

      <Sheet open={secondaryNavSheetOpen} onOpenChange={setSecondaryNavSheetOpen}>
        <SheetContent side="left" className="w-[min(100vw-1rem,280px)] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation de la section</SheetTitle>
          </SheetHeader>
          <AppSecondaryNavPanel
            isAdmin={isAdmin}
            hasPermission={hasPermission}
            className="flex-1 min-h-0 overflow-y-auto"
          />
        </SheetContent>
      </Sheet>

      <Sheet open={membersSheetOpen} onOpenChange={setMembersSheetOpen}>
        <SheetContent side="right" className="w-[min(100vw-1rem,260px)] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Membres</SheetTitle>
          </SheetHeader>
          <MembersDirectoryPanel
            className="flex-1 min-h-0 border-0"
            onPickMember={() => setMembersSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DesktopUserDock profileSlot={profileButton()} />

      {/* AI Assistant FAB */}
      <AiAssistant />
    </div>
  );
}
