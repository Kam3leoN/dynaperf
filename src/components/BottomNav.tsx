import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChartLine } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { MobileMoreMenu } from "./MobileMoreMenu";
import { getRailSections } from "@/config/appNavigation";
import { usePermissionGate } from "@/contexts/PermissionsContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { publicAssetUrl } from "@/lib/basePath";

/**
 * Barre inférieure mobile — Material You 3 Expressive Navigation Bar.
 * Pill ovale horizontale 64×32 comme indicateur actif, surface tonale, icônes 24px, labels 12px.
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const { hasPermission, isModuleEnabled } = usePermissionGate();
  const [menuOpen, setMenuOpen] = useState(false);

  const sections = getRailSections(isAdmin, hasPermission, isModuleEnabled);
  const messagesSection = sections.find((s) => s.id === "messages");
  const driveSection = sections.find((s) => s.id === "drive");

  const isMessagesActive = location.pathname.startsWith("/messages");
  const messagesDefaultPath = "/messages?section=discussion";
  const isDriveActive = location.pathname === "/drive" || location.pathname.startsWith("/drive/");
  const isHubActive = location.pathname === "/hub" || location.pathname === "/";

  return (
    <>
      {/* M3 Navigation Bar — surface tonale, shadow-soft, 80px */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface-container shadow-soft backdrop-blur-xl safe-area-bottom shell:hidden">
        <div className="flex h-20 items-center justify-around px-1">

          {/* ── Menu ── */}
          <NavBarItem
            active={false}
            label="Menu"
            icon={<FontAwesomeIcon icon={faBars} className="h-6 w-6" />}
            onClick={() => setMenuOpen(true)}
          />

          {/* ── Messages ── */}
          {messagesSection && (
            <NavBarItem
              active={isMessagesActive}
              label="Messages"
              icon={<FontAwesomeIcon icon={messagesSection.icon} className="h-6 w-6" />}
              onClick={() => navigate(messagesDefaultPath)}
            />
          )}

          {/* ── Accueil FAB (brand) ── */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="relative -top-3 flex items-center justify-center w-14 h-14 rounded-3xl shadow-elevated active:scale-95 transition-transform"
            style={{ backgroundColor: "#212121" }}
            aria-label="Accueil"
          >
            <img src={publicAssetUrl("pwaDynaperf.svg")} alt="DynaPerf" className="h-7 w-7" />
          </button>

          {/* ── Drive ── */}
          {driveSection && (
            <NavBarItem
              active={isDriveActive}
              label="Drive"
              icon={<FontAwesomeIcon icon={driveSection.icon} className="h-6 w-6" />}
              onClick={() => navigate(driveSection.to)}
            />
          )}

          {/* ── Hub ── */}
          {hasPermission("nav.hub") && (
            <NavBarItem
              active={isHubActive}
              label="Hub"
              icon={<FontAwesomeIcon icon={faChartLine} className="h-6 w-6" />}
              onClick={() => navigate("/hub")}
            />
          )}
        </div>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-3 pb-10">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>
          <MobileMoreMenu onClose={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ─── M3 Navigation Bar Item ─── */

interface NavBarItemProps {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function NavBarItem({ active, label, icon, onClick }: NavBarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] py-1 touch-target"
    >
      {/* Active indicator pill — 64×32, rounded-full */}
      <div className="relative flex items-center justify-center w-16 h-8">
        {/* Pill background */}
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-200 ease-out",
            active
              ? "bg-primary/12 scale-x-100 opacity-100"
              : "bg-transparent scale-x-75 opacity-0",
          )}
        />
        {/* Icon — always visible */}
        <span className={cn("relative z-10 transition-colors duration-200", active ? "text-primary" : "text-muted-foreground")}>
          {icon}
        </span>
      </div>
      {/* Label — 12px semibold */}
      <span
        className={cn(
          "text-xs font-semibold transition-colors duration-200",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
