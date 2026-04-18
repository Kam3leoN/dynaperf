import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faListCheck, faUsers } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "@/components/AppLayout";
import { navHubPath } from "@/config/appNavigation";

const cards = [
  { label: "Audits", icon: faClipboardList, to: navHubPath("audits"), desc: "Vue d’ensemble & accès rapides" },
  { label: "Activité", icon: faListCheck, to: navHubPath("activite"), desc: "Suivi d’activité" },
  { label: "Réseau", icon: faUsers, to: navHubPath("reseau"), desc: "Partenaires & clubs" },
];

export default function DashboardHub() {
  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-7">
        <h1 className="m3-headline-medium text-foreground font-display">Tableaux de bord</h1>
        <div className="grid-action">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group flex flex-col items-center gap-4 rounded-3xl bg-card border border-border/30 p-6 shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:scale-[0.97]"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <FontAwesomeIcon icon={c.icon} className="h-6 w-6" />
              </div>
              <div className="text-center">
                <span className="m3-title-medium text-foreground">{c.label}</span>
                <p className="m3-body-medium text-muted-foreground mt-1">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
