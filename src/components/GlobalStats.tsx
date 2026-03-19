import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendUp, faArrowTrendDown } from "@fortawesome/free-solid-svg-icons";

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
  objectifTotal?: number;
  objectifNotes?: number;
}

export function GlobalStats({ totalAudits, auditsNotes, moyenneGlobale, enAttente, objectifTotal, objectifNotes }: GlobalStatsProps) {
  const stats = [
    { label: "Audits Programmés", value: totalAudits, objectif: objectifTotal, suffix: "" },
    { label: "Audits Réalisés", value: auditsNotes, objectif: objectifNotes, suffix: "" },
    { label: "Moyenne globale", value: moyenneGlobale, suffix: "/10", highlight: true },
    { label: "En attente", value: enAttente, suffix: "", warn: enAttente > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="bg-card rounded-lg p-3 sm:p-5 shadow-soft"
        >
          <p className="font-sora text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{s.label}</p>
          <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
            <span className={`font-sora text-2xl sm:text-3xl font-bold tabular-nums ${s.highlight ? "text-primary" : "text-foreground"}`}>
              {s.value}
            </span>
            {s.objectif && s.objectif > 0 ? (
              <span className="text-sm sm:text-base text-muted-foreground font-sora tabular-nums">/{s.objectif}</span>
            ) : s.suffix ? (
              <span className="text-xs sm:text-sm text-muted-foreground">{s.suffix}</span>
            ) : null}
          </div>
          {s.objectif && s.objectif > 0 && (
            <div className="mt-2">
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (s.value / s.objectif) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                {((s.value / s.objectif) * 100).toFixed(0)}%
              </p>
            </div>
          )}
          {s.warn && (
            <p className="text-[10px] sm:text-xs text-primary mt-1.5 sm:mt-2 flex items-center gap-1">
              <FontAwesomeIcon icon={faArrowTrendDown} className="h-3 w-3" /> À noter
            </p>
          )}
          {s.highlight && s.value >= 6.5 && (
            <p className="text-[10px] sm:text-xs text-foreground/60 mt-1.5 sm:mt-2 flex items-center gap-1">
              <FontAwesomeIcon icon={faArrowTrendUp} className="h-3 w-3" /> Bonne performance
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
