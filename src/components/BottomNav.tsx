import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faChartLine,
  faFolder,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { MobileMoreMenu } from "./MobileMoreMenu";

const navItems = [
  { icon: faBars, label: "Menu", path: "__menu__" },
  { icon: faChartLine, label: "Dashboard", path: "/hub" },
  { icon: null, label: "", path: "/", isFab: true },
  { icon: faFolder, label: "Drive", path: "/drive" },
  { icon: faGear, label: "Réglages", path: "/preferences" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/hub") return location.pathname === "/hub";
    if (path === "/preferences") return location.pathname === "/preferences";
    if (path === "/drive") return location.pathname === "/drive";
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/40 safe-area-bottom lg:hidden">
        <div className="flex items-end justify-around px-2 pt-2 pb-2">
          {navItems.map((item, idx) => {
            if (item.isFab) {
              return (
                <button
                  key="fab"
                  onClick={() => navigate("/")}
                  className="relative -top-4 flex items-center justify-center w-16 h-16 rounded-3xl shadow-elevated active:scale-95 transition-transform"
                  style={{ backgroundColor: "#212121" }}
                  aria-label="Accueil"
                >
                  <img src="/pwaDynaperf.svg" alt="DynaPerf" className="h-8 w-8" />
                </button>
              );
            }

            if (item.path === "__menu__") {
              return (
                <button
                  key="menu"
                  onClick={() => setMenuOpen(true)}
                  className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 touch-target"
                >
                  <div className="flex items-center justify-center w-16 h-8 rounded-2xl bg-transparent">
                    <FontAwesomeIcon
                      icon={item.icon!}
                      className="h-[22px] w-[22px] text-muted-foreground"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {item.label}
                  </span>
                </button>
              );
            }


            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 touch-target"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-16 h-8 rounded-2xl transition-all duration-200",
                    active ? "bg-primary/12 scale-105" : "bg-transparent"
                  )}
                >
                  <FontAwesomeIcon
                    icon={item.icon!}
                    className={cn(
                      "h-[22px] w-[22px] transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
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
