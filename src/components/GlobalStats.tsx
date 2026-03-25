import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faHourglassHalf, faArrowTrendUp, faCalendarDay, faCalculator } from "@fortawesome/free-solid-svg-icons";
import { Progress } from "@/components/ui/progress";

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
  objectifTotal?: number;
  objectifNotes?: number;
  annee?: string;
}

export function GlobalStats({ totalAudits, auditsNotes, moyenneGlobale, enAttente, objectifTotal, annee }: GlobalStatsProps) {
  const obj = objectifTotal ?? 0;
  const pctRealises = obj > 0 ? Math.min(100, (totalAudits / obj) * 100) : 0;
  const restant = Math.max(0, obj - totalAudits);
  const pctRestant = obj > 0 ? (restant / obj) * 100 : 0;

  // Calculate remaining days until Dec 31 of selected year
  const selectedYear = annee && annee !== "Tous" ? parseInt(annee) : new Date().getFullYear();
  const now = new Date();
  const endOfYear = new Date(selectedYear, 11, 31); // Dec 31
  const diffMs = endOfYear.getTime() - now.getTime();
  const joursRestants = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const semainesRestantes = Math.max(1, Math.ceil(joursRestants / 7));
  const moyenneParSemaine = restant > 0 ? +(restant / semainesRestantes).toFixed(1) : 0;

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
    {
      label: "Temps restant",
      isCountdown: true,
      jours: joursRestants,
      semaines: semainesRestantes,
      moyenneSemaine: moyenneParSemaine,
      restantCount: restant,
      icon: faCalendarDay,
      iconColor: "text-blue-500",
    },
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

          {'isCountdown' in s && s.isCountdown ? (
            <div className="mt-1.5 sm:mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{s.jours}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">jours restants</span>
              </div>
              {s.restantCount > 0 ? (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                  <FontAwesomeIcon icon={faCalculator} className="h-3 w-3 text-primary" />
                  <span className="tabular-nums font-medium">
                    {s.moyenneSemaine} audits/sem. nécessaires
                  </span>
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> Objectif atteint !
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
                <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${'highlight' in s && s.highlight ? "text-primary" : "text-foreground"}`}>
                  {s.value}
                </span>
                {'objectif' in s && s.objectif && s.objectif > 0 ? (
                  <span className="text-sm sm:text-base text-muted-foreground tabular-nums">/{s.objectif}</span>
                ) : 'suffix' in s && s.suffix ? (
                  <span className="text-xs sm:text-sm text-muted-foreground">{s.suffix}</span>
                ) : null}
              </div>
              {'pct' in s && 'objectif' in s && s.objectif && s.objectif > 0 && (
                <div className="mt-2 space-y-1">
                  <Progress value={s.pct} className="h-2" />
                  <p className="text-[10px] text-muted-foreground tabular-nums font-medium">
                    {s.pct.toFixed(0)}% de l'objectif
                  </p>
                </div>
              )}
              {'highlight' in s && s.highlight && s.value >= 6.5 && (
                <p className="text-[10px] sm:text-xs text-foreground/60 mt-1.5 sm:mt-2 flex items-center gap-1">
                  <FontAwesomeIcon icon={faArrowTrendUp} className="h-3 w-3" /> Bonne performance
                </p>
              )}
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}