import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faRightFromBracket,
  faSliders,
  faUser,
  faKey,
  faEnvelope,
  faCommentDots,
  faBell,
  faUsers,
  faGear,
  faThumbtack,
  faUserShield,
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
import { PresenceStatusMenuIcon } from "./PresenceStatusMenuIcon";
import { usePresenceStatusDefinitions } from "@/contexts/PresenceStatusDefinitionsContext";
import {
  DURATION_OPTIONS,
  PRESENCE_LABELS,
  expiresAtForDuration,
  type PresenceStatus,
  type DurationKey,
} from "@/lib/presence";
import type { Filters } from "@/hooks/useAuditData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNav } from "./BottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { MembersDirectoryPanel } from "./MembersDirectoryPanel";
import { AppNavRail } from "./AppNavRail";
import { DesktopUserDock } from "./DesktopUserDock";
import { MobilePrimaryNavSheet } from "./MobilePrimaryNavSheet";
import {
  ADMIN_RAIL_NAV_DESTINATION,
  getActiveRailSection,
  getRailHeaderLabel,
  RAIL_SECTIONS_ALL,
} from "@/config/appNavigation";
import { DocsPrevNextNav } from "./DocsPrevNextNav";
import { usePermissionGate } from "@/contexts/PermissionsContext";
import { useOptionalMessagingSidebarHost } from "@/contexts/MessagingSidebarContext";
import { useNavigationShell } from "@/contexts/NavigationShellContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown } from "lucide-react";
import {
  m3DockSplitChevronMd,
  m3DockSplitGroup,
  m3DockSplitSegmentFirst,
  m3DockSplitSegmentFirstGrow,
  m3DockSplitSegmentSecond,
  m3DockSplitSegmentSecondGrow,
} from "@/lib/m3DockSplitButton";
import { cn } from "@/lib/utils";

/** Ligne 1 du tooltip dock : « Prénom NOM » (dernier segment en majuscules si plusieurs mots). */
function formatPrénomNom(displayName: string | null): string {
  const n = (displayName ?? "Utilisateur").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return n;
  const last = parts.pop()!;
  return `${parts.join(" ")} ${last.toLocaleUpperCase("fr-FR")}`;
}

interface AppLayoutProps {
  children: React.ReactNode;
  filters?: Filters;
  setFilters?: (f: Filters) => void;
  availableYears?: number[];
  /** Surcharge des classes du `<main>` (ex. messagerie pleine hauteur sans padding). */
  mainClassName?: string;
}

export function AppLayout({
  children,
  filters,
  setFilters,
  availableYears,
  mainClassName,
}: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin, isSuperAdmin } = useAdmin(user);
  const { hasPermission, isModuleEnabled } = usePermissionGate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [secondaryNavSheetOpen, setSecondaryNavSheetOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  /** Non lus dans salons / groupes (messages avec group_id). */
  const [unreadChannelMessages, setUnreadChannelMessages] = useState(0);
  /** Non lus en MP (sans group_id, destinataire = moi). */
  const [unreadDmMessages, setUnreadDmMessages] = useState(0);
  const { unreadCount: unreadNotifications } = useNotifications();
  const [pinnedMessagesCount, setPinnedMessagesCount] = useState(0);
  const { row: presenceRow, setPresence } = useMyPresence(user?.id);
  const { labelForRow, defsByKey } = usePresenceStatusDefinitions();
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const { railExpanded } = useNavigationShell();

  const railSection = getActiveRailSection(location.pathname, RAIL_SECTIONS_ALL);
  const railHeaderLabel = getRailHeaderLabel(location.pathname, RAIL_SECTIONS_ALL);
  const messagingSidebarHost = useOptionalMessagingSidebarHost();
  /** Sur /messages (desktop), même total que la somme des points par salon dans la colonne. */
  const channelNavUnread =
    messagingSidebarHost?.api != null
      ? messagingSidebarHost.api.totalChannelUnread
      : unreadChannelMessages;
  const dmNavUnread =
    messagingSidebarHost?.api != null ? messagingSidebarHost.api.totalDmUnread : unreadDmMessages;

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

    const loadUnreadSplit = async () => {
      const [dmRes, chRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("read", false)
          .is("group_id", null),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("read", false)
          .neq("sender_id", user.id)
          .not("group_id", "is", null),
      ]);
      setUnreadDmMessages(dmRes.count ?? 0);
      setUnreadChannelMessages(chRes.count ?? 0);
    };
    void loadUnreadSplit();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const loadUnreadSplit = async () => {
      const [dmRes, chRes] = await Promise.all([
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("read", false)
          .is("group_id", null),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("read", false)
          .neq("sender_id", user.id)
          .not("group_id", "is", null),
      ]);
      setUnreadDmMessages(dmRes.count ?? 0);
      setUnreadChannelMessages(chRes.count ?? 0);
    };
    const channel = supabase
      .channel("unread-messages-split")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void loadUnreadSplit(), 280);
      })
      .subscribe();
    return () => {
      clearTimeout(debounce);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadPinnedCount = async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .not("pinned_at", "is", null);
      if (!error) setPinnedMessagesCount(count ?? 0);
    };
    void loadPinnedCount();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("pinned-messages-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void loadPinnedCount(), 280);
      })
      .subscribe();
    return () => {
      clearTimeout(debounce);
      void supabase.removeChannel(channel);
    };
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
    <Link
      to={to}
      className="relative flex h-10 w-10 max-lg:min-h-12 max-lg:min-w-12 items-center justify-center rounded-full hover:bg-primary/[0.08] transition-colors"
      title={title}
    >
      <FontAwesomeIcon icon={icon} className="h-5 w-5 text-foreground/60" />
      {count > 0 && (
        <span className="absolute top-0 right-0 min-w-[20px] h-[20px] rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );

  const messagingSearch = new URLSearchParams(location.search);
  const messagingHeaderSection =
    messagingSearch.get("section") === "messagerie" ? "messagerie" : "discussion";
  const messagingViewPinned =
    location.pathname.startsWith("/messages") && messagingSearch.get("view") === "pinned";

  const setPresenceWithDuration = (status: PresenceStatus, key: DurationKey) => {
    void setPresence(status, expiresAtForDuration(new Date(), key));
  };

  const profileButton = (opts?: { compact?: boolean; forDock?: boolean }) => {
    const dockCompact = Boolean(opts?.forDock && opts?.compact);
    const dockExpanded = Boolean(opts?.forDock && !opts?.compact);
    const tooltipLine1 = formatPrénomNom(displayName);
    const tooltipLine2 = labelForRow(presenceRow);

    const canAccessAdministration = isAdmin && hasPermission("nav.admin");

    const profileMenuContent = (
      <DropdownMenuContent align="end" className="w-56 rounded-2xl">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground truncate">{displayName || "Utilisateur"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{labelForRow(presenceRow)}</p>
        </div>
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Statut
        </DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer" onClick={() => void setPresence("online", null)}>
          <PresenceStatusMenuIcon status="online" />
          {defsByKey.online?.label_fr ?? PRESENCE_LABELS.online}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <PresenceStatusMenuIcon status="idle" />
            {defsByKey.idle?.label_fr ?? PRESENCE_LABELS.idle}
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
            <PresenceStatusMenuIcon status="dnd" />
            {defsByKey.dnd?.label_fr ?? PRESENCE_LABELS.dnd}
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
            <PresenceStatusMenuIcon status="stream" />
            {defsByKey.stream?.label_fr ?? PRESENCE_LABELS.stream}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl">
            {DURATION_OPTIONS.map((d) => (
              <DropdownMenuItem key={d.key} className="cursor-pointer" onClick={() => setPresenceWithDuration("stream", d.key)}>
                {d.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <PresenceStatusMenuIcon status="invisible" />
            {defsByKey.invisible?.label_fr ?? PRESENCE_LABELS.invisible}
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
          <Link to="/preferences" className="flex items-center gap-2.5 cursor-pointer">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4 text-muted-foreground" />
            Préférences
          </Link>
        </DropdownMenuItem>
        {canAccessAdministration && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={ADMIN_RAIL_NAV_DESTINATION} className="flex items-center gap-2.5 cursor-pointer">
                <FontAwesomeIcon icon={faUserShield} className="h-4 w-4 text-muted-foreground" />
                Administration
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()} className="flex items-center gap-2.5 cursor-pointer text-destructive focus:text-destructive">
          <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    );

    /** Barre du haut uniquement (le dock utilise le split dédié ci‑dessus). */
    const triggerInner = (
      <button
        type="button"
        className="flex shrink-0 max-w-[200px] items-center gap-2 rounded-full border border-transparent py-0 pl-0.5 pr-2 transition-all hover:border-border/60 hover:bg-primary/[0.1] md:max-w-[220px]"
        title="Profil et statut"
      >
        <div className="relative h-10 w-10 shrink-0">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-border bg-primary/[0.08]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="relative z-0 h-full w-full object-cover" />
            ) : (
              <span className="relative z-0 text-xs font-semibold text-primary">{initials}</span>
            )}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[1] rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_3px_18px_rgba(0,0,0,0.28)]"
            />
          </div>
          <PresenceAvatarBadge presence={presenceRow} />
        </div>
        <div className="hidden min-w-0 flex-col items-start text-left leading-tight pr-0.5 sm:flex">
          <span className="w-full max-w-[140px] truncate font-semibold text-foreground text-sm md:max-w-[140px]">
            {displayName || "Utilisateur"}
          </span>
          <span className="w-full max-w-[140px] truncate text-[11px] text-muted-foreground md:max-w-[140px]">
            {labelForRow(presenceRow)}
          </span>
        </div>
      </button>
    );

    if (opts?.forDock) {
      return (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            dockCompact && "w-full",
          )}
        >
          <div
            className={cn(
              dockCompact ? m3DockSplitGroup.compactRow : m3DockSplitGroup.expanded,
              "shrink-0",
            )}
          >
            <Tooltip delayDuration={400}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    dockCompact ? m3DockSplitSegmentFirstGrow : m3DockSplitSegmentFirst,
                    "relative p-0",
                    dockExpanded && "overflow-hidden",
                  )}
                  aria-label="Profil"
                >
                  {dockCompact ? (
                    <div className="relative h-full w-full min-h-0 min-w-0 shrink-0">
                      <div
                        className={cn(
                          "relative flex h-full w-full items-center justify-center overflow-hidden bg-primary/[0.08] border-0",
                          "rounded-tl-[18px] rounded-bl-[18px] rounded-tr-[4px] rounded-br-[4px]",
                        )}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="relative z-0 h-full w-full object-cover" />
                        ) : (
                          <span className="relative z-0 text-sm font-semibold text-primary">{initials}</span>
                        )}
                        <div
                          aria-hidden
                          className={cn(
                            "pointer-events-none absolute inset-0 z-[1]",
                            "rounded-tl-[18px] rounded-bl-[18px] rounded-tr-[4px] rounded-br-[4px]",
                            "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_3px_18px_rgba(0,0,0,0.28)]",
                          )}
                        />
                      </div>
                      <PresenceAvatarBadge
                        presence={presenceRow}
                        className="bottom-auto left-auto right-[-3px] top-[-3px] translate-none"
                      />
                    </div>
                  ) : (
                    <>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="absolute inset-0 z-0 size-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 z-0 flex items-center justify-center bg-primary/[0.08] text-xs font-semibold text-primary">
                          {initials}
                        </span>
                      )}
                      <div
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 z-[1]",
                          "rounded-tl-[18px] rounded-bl-[18px] rounded-tr-[4px] rounded-br-[4px]",
                          "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_3px_18px_rgba(0,0,0,0.28)]",
                        )}
                      />
                      <PresenceAvatarBadge presence={presenceRow} />
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-[min(18rem,calc(100vw-2rem))]">
                <p className="font-semibold leading-tight text-white">{tooltipLine1}</p>
                <p className="mt-0.5 text-xs font-normal leading-snug text-white/75">{tooltipLine2}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={dockCompact ? m3DockSplitSegmentSecondGrow : m3DockSplitSegmentSecond}
                  aria-label="Menu du compte"
                >
                  <ChevronDown className={m3DockSplitChevronMd} />
                </button>
              </DropdownMenuTrigger>
              {profileMenuContent}
            </DropdownMenu>
          </div>
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{triggerInner}</DropdownMenuTrigger>
        {profileMenuContent}
      </DropdownMenu>
    );
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      {/* Top app bar — le shell est en h-dvh + overflow-hidden sur la zone centrale : pas de scroll document */}
      <header className="z-40 shrink-0 bg-card/85 backdrop-blur-2xl border-b border-border/30 px-4 shell:px-0">
        <div className="w-full flex items-stretch justify-between h-16 shell:h-[4.25rem] shell:pl-[var(--shell-nav-rail-width,256px)] shell:pr-[260px]">
          <div className="flex flex-1 items-center justify-between min-w-0 gap-2 pl-4 pr-4 shell:pl-6 shell:pr-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shell:hidden h-10 w-10 max-lg:min-h-12 max-lg:min-w-12 rounded-full shrink-0"
                title="Menu de la section"
                aria-label="Ouvrir le menu de la section"
                onClick={() => setSecondaryNavSheetOpen(true)}
              >
                <FontAwesomeIcon icon={faBars} className="h-[18px] w-[18px] text-foreground/70" />
              </Button>
              {railSection && (
                <span
                  className="hidden sm:inline font-semibold text-foreground truncate max-w-[140px] md:max-w-[220px] shrink-0 text-[1.09375rem] leading-tight"
                  title={
                    location.pathname.startsWith("/messages")
                      ? messagingViewPinned
                        ? "Messages épinglés"
                        : messagingHeaderSection === "messagerie"
                          ? "Messages privés"
                          : "Discussions"
                      : (railHeaderLabel ?? railSection.label)
                  }
                >
                  {location.pathname.startsWith("/messages")
                    ? messagingViewPinned
                      ? "Messages épinglés"
                      : messagingHeaderSection === "messagerie"
                        ? "Messages privés"
                        : "Discussions"
                    : (railHeaderLabel ?? railSection.label)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
            {filters && setFilters && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 max-lg:min-h-12 max-lg:min-w-12 rounded-full"
                onClick={() => setFiltersOpen(true)}
                title="Filtres"
              >
                <FontAwesomeIcon icon={faSliders} className="h-[18px] w-[18px]" />
              </Button>
            )}

            {iconBadge(faBell, "/notifications", unreadNotifications, "Notifications")}
            {iconBadge(faThumbtack, "/messages?view=pinned", pinnedMessagesCount, "Messages épinglés")}
            <div className="flex items-center gap-1">
              <Link
                to="/messages?section=discussion"
                className="relative flex h-10 w-10 max-lg:min-h-12 max-lg:min-w-12 items-center justify-center rounded-full transition-colors hover:bg-primary/[0.08]"
                title="Discussions (salons et groupes)"
              >
                <FontAwesomeIcon icon={faCommentDots} className="h-5 w-5 text-foreground/60" />
                {channelNavUnread > 0 && (
                  <span className="absolute top-0 right-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                    {channelNavUnread > 99 ? "99+" : channelNavUnread}
                  </span>
                )}
              </Link>
              <Link
                to="/messages?section=messagerie"
                className="relative flex h-10 w-10 max-lg:min-h-12 max-lg:min-w-12 items-center justify-center rounded-full transition-colors hover:bg-primary/[0.08]"
                title="Messages privés"
              >
                <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5 text-foreground/60" />
                {dmNavUnread > 0 && (
                  <span className="absolute top-0 right-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                    {dmNavUnread > 99 ? "99+" : dmNavUnread}
                  </span>
                )}
              </Link>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 max-lg:min-h-12 max-lg:min-w-12 shrink-0 rounded-full shell:hidden"
              title="Membres"
              aria-label="Ouvrir la liste des membres"
              onClick={() => setMembersSheetOpen(true)}
            >
              <FontAwesomeIcon icon={faUsers} className="h-[18px] w-[18px] text-foreground/60" />
            </Button>

            <div className="shrink-0 shell:hidden">{profileButton({ compact: true })}</div>
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

      <div className="flex min-h-0 flex-1 flex-row overflow-x-auto overflow-y-hidden shell:pl-[var(--shell-nav-rail-width,256px)] shell:pr-[260px]">
        <AppNavRail isAdmin={isAdmin} hasPermission={hasPermission} isModuleEnabled={isModuleEnabled} />
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          <main
            id="layout-main-scroll"
            className={cn(
              "mx-auto w-full max-w-[1440px] flex-1 min-h-0 space-y-5 py-5 pb-28 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] overflow-y-auto shell:max-w-none shell:space-y-6 shell:px-6 shell:py-6 shell:pb-6",
              mainClassName,
            )}
          >
            {children}
            <DocsPrevNextNav />
          </main>
          <BottomNav />
        </div>

        <aside
          className="hidden shell:flex fixed right-0 top-0 bottom-0 z-[45] w-[260px] flex-col border-l border-border/40 bg-muted/10 min-h-0"
          aria-label="Annuaire des membres"
        >
          <MembersDirectoryPanel className="flex-1 min-h-0" currentUserPresence={presenceRow} />
        </aside>
      </div>

      <Sheet open={secondaryNavSheetOpen} onOpenChange={setSecondaryNavSheetOpen}>
        <SheetContent side="left" className="w-[min(100vw-1rem,300px)] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <MobilePrimaryNavSheet
            onNavigate={() => setSecondaryNavSheetOpen(false)}
            isAdmin={isAdmin}
            hasPermission={hasPermission}
            isModuleEnabled={isModuleEnabled}
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
            currentUserPresence={presenceRow}
          />
        </SheetContent>
      </Sheet>

      <DesktopUserDock profileSlot={profileButton({ compact: !railExpanded, forDock: true })} />

    </div>
  );
}
