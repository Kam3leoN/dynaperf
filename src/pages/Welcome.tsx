import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faChartLine, faBriefcase, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import logoDark from "@/assets/DynaPerf_dark.svg";
import logoLight from "@/assets/DynaPerf_light.svg";

const actions = [
  {
    label: "Créer un Audit",
    icon: faClipboardList,
    to: "/audits/new",
    color: "hsl(var(--primary))",
  },
  {
    label: "Créer un suivi d'activité",
    icon: faChartLine,
    to: "/dashboard",
    color: "hsl(var(--accent-foreground))",
  },
  {
    label: "Créer un business plan",
    icon: faBriefcase,
    to: "/business-plan",
    color: "hsl(var(--primary))",
  },
  {
    label: "Suivre une candidature",
    icon: faUserTie,
    to: "#",
    color: "hsl(var(--accent-foreground))",
  },
];

export default function Welcome() {
  const { user, signOut } = useAuth();
  const { resolvedTheme } = useTheme();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "Utilisateur");
      });
  }, [user]);

  const greeting = displayName ?? user?.email?.split("@")[0] ?? "Utilisateur";

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      {/* Minimal header */}
      <header className="bg-card shadow-soft border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <img
            src={resolvedTheme === "dark" ? logoDark : logoLight}
            alt="DynaPerf"
            className="h-7 sm:h-8"
          />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut} title="Déconnexion">
              <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Bonjour {greeting} <span className="inline-block animate-bounce">😉</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg mb-10">
            Que souhaites-tu faire aujourd'hui ?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {actions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <FontAwesomeIcon icon={action.icon} className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground text-left leading-snug">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
