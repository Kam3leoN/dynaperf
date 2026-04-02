import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faChartLine, faBriefcase, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "@/components/AppLayout";
import { OnlineAvatars } from "@/components/OnlineAvatars";


const actions = [
  {
    label: "Créer un Audit",
    icon: faClipboardList,
    to: "/audits/new",
  },
  {
    label: "Suivi d'activité",
    icon: faChartLine,
    to: "/activite/new/version",
  },
  {
    label: "Business plan",
    icon: faBriefcase,
    to: "/business-plan",
  },
  {
    label: "Candidature",
    icon: faUserTie,
    to: "#",
  },
];

export default function Welcome() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const full = data?.display_name ?? user.email?.split("@")[0] ?? "Utilisateur";
        // Extract first name only
        setFirstName(full.split(" ")[0]);
      });
  }, [user]);

  const greeting = firstName ?? user?.email?.split("@")[0] ?? "Utilisateur";

  return (
    <AppLayout>
      <section className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center max-w-md w-full flex-1 flex flex-col items-center justify-center gap-6">
          {/* Online avatars */}
          <OnlineAvatars />

          {/* Greeting */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Bonjour {greeting} <span className="inline-block animate-bounce">😉</span>
            </h1>
            <p className="text-muted-foreground text-base mt-1.5">
              Que souhaites-tu faire aujourd'hui ?
            </p>
          </div>

          {/* Action cards — M3 tonal surface style */}
          <div className="grid-action w-full">
            {actions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="group flex flex-col items-center gap-2.5 rounded-2xl bg-card border border-border/60 p-5 shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:scale-[0.97]"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <FontAwesomeIcon icon={action.icon} className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-snug">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>

        </div>

        {/* Version chip */}
        <div className="mt-8 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-[10px] text-muted-foreground">
            v{(globalThis as any).__APP_VERSION__ ?? typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'} — {new Date(typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString()).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </section>
    </AppLayout>
  );
}
