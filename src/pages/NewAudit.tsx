import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { auditTypeIcons } from "@/lib/auditTypeVisuals";

import iconRDPresentiel from "@/assets/rencontre-presentiel.svg";
import iconRDDistanciel from "@/assets/rencontre-distanciel.svg";
import iconClubAffaires from "@/assets/club-affaires.svg";
import iconRDVCommercial from "@/assets/rdv-business.svg";
import iconMiseEnPlace from "@/assets/mise-en-place.svg";
import iconEvenementiel from "@/assets/evenementiel.svg";

const auditTypes: { label: string; color: string; icon: string; key: string; desktopLabel?: React.ReactNode }[] = [
  {
    label: "Rencontre Dirigeants Présentiel",
    color: "#ee4540",
    icon: iconRDPresentiel,
    key: "RD Présentiel",
  },
  {
    label: "Rencontre Dirigeants Distanciel",
    color: "#234653",
    icon: iconRDDistanciel,
    key: "RD Distanciel",
  },
  {
    label: "Club d'Affaires",
    color: "#ffbd23",
    icon: iconClubAffaires,
    key: "Club Affaires",
    desktopLabel: <>Club<br />d'Affaires</>,
  },
  {
    label: "Rendez-Vous Commercial",
    color: "#5dbcb9",
    icon: iconRDVCommercial,
    key: "RDV Commercial",
  },
  {
    label: "Mise en Place",
    color: "#8b5cf6",
    icon: iconMiseEnPlace,
    key: "Mise en Place",
  },
  {
    label: "RD Événementiel",
    color: "#e67e22",
    icon: iconEvenementiel,
    key: "RD Événementiel",
    desktopLabel: <>RD<br />Événementiel</>,
  },
];

export default function NewAudit() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="py-10 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-xl font-semibold text-foreground">Nouvel audit</h2>
          <p className="text-muted-foreground text-sm mt-1">Sélectionnez le type d'événement</p>
        </div>
        <div className="grid-action max-w-3xl mx-auto">
          {auditTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => navigate(`/audits/new/version?type=${encodeURIComponent(type.key)}`)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ "--card-accent": type.color } as React.CSSProperties}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${type.color}18` }}
              >
                <div
                  className="h-6 w-6"
                  style={{
                    backgroundColor: type.color,
                    mask: `url(${type.icon}) no-repeat center / contain`,
                    WebkitMask: `url(${type.icon}) no-repeat center / contain`,
                  }}
                />
              </div>
              {type.desktopLabel ? (
                <>
                  <span className="text-sm font-medium text-foreground text-center leading-snug lg:hidden">
                    {type.label}
                  </span>
                  <span className="text-sm font-medium text-foreground text-center leading-snug hidden lg:block">
                    {type.desktopLabel}
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-foreground text-center leading-snug">
                  {type.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
