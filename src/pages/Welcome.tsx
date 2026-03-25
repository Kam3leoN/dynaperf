import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faChartLine, faBriefcase, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "@/components/AppLayout";

const actions = [
  {
    label: "Créer un Audit",
    icon: faClipboardList,
    to: "/audits/new",
  },
  {
    label: "Créer un suivi d'activité",
    icon: faChartLine,
    to: "/activite/new",
  },
  {
    label: "Créer un business plan",
    icon: faBriefcase,
    to: "/business-plan",
  },
  {
    label: "Suivre une candidature",
    icon: faUserTie,
    to: "#",
  },
];

export default function Welcome() {
  const { user } = useAuth();
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
    <AppLayout>
      <section className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl w-full flex-1 flex flex-col items-center justify-center">
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

        {/* Version chip */}
        <div className="mt-10 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">
            v{__APP_VERSION__} — Dernière mise à jour le {new Date(__BUILD_DATE__).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </section>
    </AppLayout>
  );
}
