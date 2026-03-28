import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faClipboardList,
  faPlus,
  faListCheck,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { MobileMoreMenu } from "./MobileMoreMenu";

const navItems = [
  { icon: faHouse, label: "Accueil", path: "/" },
  { icon: faClipboardList, label: "Audits", path: "/dashboard" },
  { icon: faPlus, label: "", path: "/audits/new", isFab: true },
  { icon: faListCheck, label: "Activité", path: "/activite" },
  { icon: faEllipsis, label: "Plus", path: "__more__" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/dashboard") return location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/audits");
    if (path === "/activite") return location.pathname.startsWith("/activite");
    return location.pathname === path;
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom lg:hidden">
        <div className="flex items-end justify-around px-2 pt-1 pb-1">
          {navItems.map((item) => {
            if (item.isFab) {
              return (
                <button
                  key="fab"
                  onClick={() => navigate(item.path)}
                  className="relative -top-3 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
                  aria-label="Créer"
                >
                  <FontAwesomeIcon icon={item.icon} className="h-6 w-6" />
                </button>
              );
            }

            if (item.path === "__more__") {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-2"
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className="h-5 w-5 text-muted-foreground"
                  />
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
                    icon={item.icon}
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

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-2 pb-8 max-h-[80vh]">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>
          <MobileMoreMenu onClose={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
