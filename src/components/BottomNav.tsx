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
    if (path === "/primes") return location.pathname === "/primes";
    return false;
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom lg:hidden">
        <div className="flex items-end justify-around px-2 pt-1 pb-1">
          {navItems.map((item, idx) => {
            if (item.isFab) {
              return (
                <button
                  key="fab"
                  onClick={() => navigate("/")}
                  className="relative -top-3 flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg active:scale-95 transition-transform"
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
                  className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-2"
                >
                  <div className="flex items-center justify-center w-16 h-8 rounded-2xl bg-transparent">
                    <FontAwesomeIcon
                      icon={item.icon!}
                      className="h-5 w-5 text-muted-foreground"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
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
                className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-2"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-16 h-8 rounded-2xl transition-colors",
                    active ? "bg-primary/12" : "bg-transparent"
                  )}
                >
                  <FontAwesomeIcon
                    icon={item.icon!}
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
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
        <SheetContent side="bottom" className="rounded-t-3xl px-2 pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>
          <MobileMoreMenu onClose={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
