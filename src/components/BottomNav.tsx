import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faChartLine } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { MobileMoreMenu } from "./MobileMoreMenu";
import { getRailSections } from "@/config/appNavigation";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";

/**
 * Barre inférieure mobile : entrées alignées sur le rail (config centrale).
 */
export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const [menuOpen, setMenuOpen] = useState(false);

  const sections = getRailSections(isAdmin);
  const messagesSection = sections.find((s) => s.id === "messages");
  const driveSection = sections.find((s) => s.id === "drive");
  const hubPath = "/hub";

  const isMessagesActive = location.pathname.startsWith("/messages");
  const isDriveActive = location.pathname === "/drive" || location.pathname.startsWith("/drive/");
  const isHubActive = location.pathname === "/hub" || location.pathname === "/";

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/40 safe-area-bottom lg:hidden">
        <div className="flex items-end justify-around px-2 pt-2 pb-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 touch-target"
          >
            <div className="flex items-center justify-center w-16 h-8 rounded-2xl bg-transparent">
              <FontAwesomeIcon icon={faBars} className="h-[22px] w-[22px] text-muted-foreground" />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">Menu</span>
          </button>

          {messagesSection && (
            <button
              type="button"
              onClick={() => navigate(messagesSection.to)}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 touch-target"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-16 h-8 rounded-2xl transition-all duration-200",
                  isMessagesActive ? "bg-primary/12 scale-105" : "bg-transparent",
                )}
              >
                <FontAwesomeIcon
                  icon={messagesSection.icon}
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    isMessagesActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold transition-colors",
                  isMessagesActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                Messages
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/")}
            className="relative -top-4 flex items-center justify-center w-16 h-16 rounded-3xl shadow-elevated active:scale-95 transition-transform"
            style={{ backgroundColor: "#212121" }}
            aria-label="Accueil"
          >
            <img src="/pwaDynaperf.svg" alt="DynaPerf" className="h-8 w-8" />
          </button>

          {driveSection && (
            <button
              type="button"
              onClick={() => navigate(driveSection.to)}
              className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 touch-target"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-16 h-8 rounded-2xl transition-all duration-200",
                  isDriveActive ? "bg-primary/12 scale-105" : "bg-transparent",
                )}
              >
                <FontAwesomeIcon
                  icon={driveSection.icon}
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    isDriveActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] font-semibold transition-colors",
                  isDriveActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                Drive
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(hubPath)}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 touch-target"
          >
            <div
              className={cn(
                "flex items-center justify-center w-16 h-8 rounded-2xl transition-all duration-200",
                isHubActive ? "bg-primary/12 scale-105" : "bg-transparent",
              )}
            >
              <FontAwesomeIcon
                icon={faChartLine}
                className={cn(
                  "h-[22px] w-[22px] transition-colors",
                  isHubActive ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
            <span
              className={cn(
                "text-[11px] font-semibold transition-colors",
                isHubActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              Hub
            </span>
          </button>
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
