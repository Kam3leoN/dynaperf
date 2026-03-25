import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendUp, faArrowTrendDown, faCheckCircle, faHourglassHalf } from "@fortawesome/free-solid-svg-icons";
import { Progress } from "@/components/ui/progress";

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
  objectifTotal?: number;
  objectifNotes?: number;
}

export function GlobalStats({ totalAudits, auditsNotes, moyenneGlobale, enAttente, objectifTotal, objectifNotes }: GlobalStatsProps) {
  const obj = objectifTotal ?? 0;
  const pctRealises = obj > 0 ? Math.min(100, (totalAudits / obj) * 100) : 0;
  const restant = Math.max(0, obj - totalAudits);
  const pctRestant = obj > 0 ? (restant / obj) * 100 : 0;

  const stats = [
    {
      label: "Audits Réalisés",
      value: totalAudits,
      objectif: obj,
      pct: pctRealises,
      icon: faCheckCircle,
      iconColor: "text-emerald-500",
    },
    {
      label: "Restant à faire",
      value: restant,
      objectif: obj,
      pct: pctRestant,
      icon: faHourglassHalf,
      iconColor: "text-amber-500",
    },
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
          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
            {'icon' in s && s.icon && (
              <FontAwesomeIcon icon={s.icon} className={`h-3 w-3 ${s.iconColor}`} />
            )}
            {s.label}
          </p>
          <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
            <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${s.highlight ? "text-primary" : "text-foreground"}`}>
              {s.value}
            </span>
            {'objectif' in s && s.objectif > 0 ? (
              <span className="text-sm sm:text-base text-muted-foreground tabular-nums">/{s.objectif}</span>
            ) : s.suffix ? (
              <span className="text-xs sm:text-sm text-muted-foreground">{s.suffix}</span>
            ) : null}
          </div>
          {'pct' in s && s.objectif && s.objectif > 0 && (
            <div className="mt-2 space-y-1">
              <Progress value={s.pct} className="h-2" />
              <p className="text-[10px] text-muted-foreground tabular-nums font-medium">
                {s.pct.toFixed(0)}% de l'objectif
              </p>
            </div>
          )}
          {'warn' in s && s.warn && (
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
