import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faListCheck, faUsers } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "@/components/AppLayout";

const cards = [
  { label: "Audits", icon: faClipboardList, to: "/dashboard", desc: "Performance & scores" },
  { label: "Activité", icon: faListCheck, to: "/activite/dashboard", desc: "Suivi d'activité" },
  { label: "Réseau", icon: faUsers, to: "/reseau", desc: "Partenaires & clubs" },
];

export default function DashboardHub() {
  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tableaux de bord</h1>
        <div className="grid-action">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-card border border-border/60 p-6 shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:scale-[0.97]"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <FontAwesomeIcon icon={c.icon} className="h-6 w-6" />
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold text-foreground">{c.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
