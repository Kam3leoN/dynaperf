import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faHourglassHalf, faArrowTrendUp, faArrowTrendDown, faCalendarDay, faCalculator, faUmbrellaBeach, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import { Progress } from "@/components/ui/progress";

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
  objectifTotal?: number;
  objectifNotes?: number;
  annee?: string;
  semainesIndisponibles?: number;
  auditsTermines?: number;
  auditsPlanifies?: number;
}

export function GlobalStats({ totalAudits, auditsNotes, moyenneGlobale, enAttente, objectifTotal, annee, semainesIndisponibles = 10, auditsTermines, auditsPlanifies = 0 }: GlobalStatsProps) {
  const [modeRealiste, setModeRealiste] = useState(false);

  const obj = objectifTotal ?? 0;
  const realises = auditsTermines ?? totalAudits;
  const pctRealises = obj > 0 ? Math.min(100, (realises / obj) * 100) : 0;

  // Planifiés en % de l'objectif
  const pctPlanifies = obj > 0 ? Math.min(100, (auditsPlanifies / obj) * 100) : 0;

  // Restant = objectif - réalisés - planifiés (ce qui reste à programmer)
  const restant = Math.max(0, obj - realises - auditsPlanifies);
  const pctRestant = obj > 0 ? (restant / obj) * 100 : 0;

  // Ce qui reste à programmer après les planifiés
  const restantApresPlanif = restant;

  // Calculate remaining days until Dec 31 of selected year
  const selectedYear = annee && annee !== "Tous" ? parseInt(annee) : new Date().getFullYear();
  const now = new Date();
  const endOfYear = new Date(selectedYear, 11, 31);
  const diffMs = endOfYear.getTime() - now.getTime();
  const joursRestants = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const semainesRestantesTotal = Math.max(1, Math.ceil(joursRestants / 7));

  // Mode réaliste : on retire les semaines indisponibles
  const semainesEffectives = modeRealiste
    ? Math.max(1, semainesRestantesTotal - semainesIndisponibles)
    : semainesRestantesTotal;
  const moyenneParSemaine = restantApresPlanif > 0 ? +(restantApresPlanif / semainesEffectives).toFixed(1) : 0;

  // Moyenne: performance level
  const moyenneLevel = moyenneGlobale >= 8 ? "excellent" : moyenneGlobale >= 6.5 ? "bon" : moyenneGlobale >= 5 ? "moyen" : "faible";
  const moyenneColor = moyenneLevel === "excellent" ? "text-emerald-500" : moyenneLevel === "bon" ? "text-primary" : moyenneLevel === "moyen" ? "text-amber-500" : "text-destructive";
  const moyenneLabel = moyenneLevel === "excellent" ? "Excellent" : moyenneLevel === "bon" ? "Bonne performance" : moyenneLevel === "moyen" ? "Peut mieux faire" : "Insuffisant";
  const moyenneIcon = moyenneGlobale >= 5 ? faArrowTrendUp : faArrowTrendDown;
  const moyennePct = Math.min(100, (moyenneGlobale / 10) * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Card 1: Audits Réalisés */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.3 }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3 text-emerald-500" />
          Audits Réalisés
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{realises}</span>
          {obj > 0 && <span className="text-sm sm:text-base text-muted-foreground tabular-nums">/{obj}</span>}
        </div>
        {obj > 0 && (
          <div className="mt-2 space-y-1">
            <Progress value={pctRealises} className="h-2" />
            <p className="text-[10px] text-muted-foreground tabular-nums font-medium">
              {pctRealises.toFixed(0)}% de l'objectif
            </p>
          </div>
        )}
      </motion.div>

      {/* Card 2: Planifiés — valeur absolue */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, duration: 0.3 }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCalendarCheck} className="h-3 w-3 text-amber-500" />
          Planifiés
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{auditsPlanifies}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
          Encore {restantApresPlanif} à programmer
        </p>
      </motion.div>

      {/* Card 3: Restant à faire — valeur absolue */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faHourglassHalf} className="h-3 w-3 text-amber-500" />
          Restant à faire
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{restant}</span>
        </div>
      </motion.div>

      {/* Card 4: Moyenne globale */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3 }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
          Moyenne globale
        </p>
        <div className="flex items-baseline gap-1.5 mt-1.5 sm:mt-2">
          <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${moyenneColor}`}>
            {moyenneGlobale}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">/10</span>
        </div>
        <div className="mt-2 space-y-1">
          <Progress value={moyennePct} className="h-2" />
          <p className="text-[10px] text-muted-foreground tabular-nums font-medium">
            sur {realises} terminé{realises > 1 ? "s" : ""} · {auditsNotes} noté{auditsNotes > 1 ? "s" : ""}
          </p>
        </div>
        <p className={`text-[10px] sm:text-xs mt-1.5 flex items-center gap-1 ${moyenneColor}`}>
          <FontAwesomeIcon icon={moyenneIcon} className="h-3 w-3" /> {moyenneLabel}
        </p>
      </motion.div>

      {/* Card 5: Temps restant — avec toggle réaliste */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.3 }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60 cursor-pointer select-none col-span-2 lg:col-span-1"
        onClick={() => setModeRealiste((prev) => !prev)}
        title="Cliquez pour basculer entre estimation brute et réaliste (-10 semaines)"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon
            icon={modeRealiste ? faUmbrellaBeach : faCalendarDay}
            className={`h-3 w-3 ${modeRealiste ? "text-amber-500" : "text-blue-500"}`}
          />
          {modeRealiste ? "Temps réaliste" : "Temps restant"}
        </p>

        <div className="mt-1.5 sm:mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{joursRestants}</span>
            <span className="text-xs sm:text-sm text-muted-foreground">jours restants</span>
          </div>

          {modeRealiste && (
            <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
              <FontAwesomeIcon icon={faUmbrellaBeach} className="h-2.5 w-2.5" />
              −{semainesIndisponibles} sem. (CP, séminaire, frein commercial)
            </p>
          )}

          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
            {modeRealiste
              ? `${semainesEffectives} sem. effectives (sur ${semainesRestantesTotal})`
              : `${semainesRestantesTotal} semaines`
            }
          </p>

          {restantApresPlanif > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <FontAwesomeIcon icon={faCalculator} className="h-3 w-3 text-primary" />
              <span className="tabular-nums font-medium">
                {moyenneParSemaine} audits/sem. nécessaires
              </span>
            </div>
          ) : (
            <p className="text-[10px] sm:text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
              <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> Objectif atteint !
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
