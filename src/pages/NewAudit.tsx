import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faLaptop, faBriefcase, faHandshake } from "@fortawesome/free-solid-svg-icons";

const auditTypes: { label: string; color: string; icon: typeof faUsers; key: string; desktopLabel?: React.ReactNode }[] = [
  {
    label: "Rencontre Dirigeants Présentiel",
    color: "#ee4540",
    icon: faUsers,
    key: "RD Présentiel",
  },
  {
    label: "Rencontre Dirigeants Distanciel",
    color: "#234653",
    icon: faLaptop,
    key: "RD Distanciel",
  },
  {
    label: "Club d'Affaires",
    color: "#ffbd23",
    icon: faBriefcase,
    key: "Club Affaires",
    desktopLabel: <>Club<br />d'Affaires</>,
  },
  {
    label: "Rendez-Vous Commercial",
    color: "#5dbcb9",
    icon: faHandshake,
    key: "RDV Commercial",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl mx-auto">
          {auditTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => {
                // TODO: navigate to form with type pre-filled
              }}
              className="group flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md hover:border-transparent hover:-translate-y-1 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ "--card-accent": type.color } as React.CSSProperties}
            >
              <div
                className="flex items-center justify-center w-14 h-14 rounded-full transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${type.color}18` }}
              >
                <FontAwesomeIcon
                  icon={type.icon}
                  className="h-6 w-6"
                  style={{ color: type.color }}
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
