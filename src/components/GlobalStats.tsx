import { useState } from "react";
import { motion } from "framer-motion";
import { m3DurationSeconds, M3_MOTION_EASE } from "@/lib/m3Motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faArrowTrendUp, faArrowTrendDown, faCalendarDay, faCalculator, faUmbrellaBeach, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import { Progress } from "@/components/ui/progress";

const DEFAULT_SEM_INDispo = 10;

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
  annee?: string;
  auditsTermines?: number;
  auditsPlanifies?: number;
}

export function GlobalStats({
  totalAudits,
  auditsNotes,
  moyenneGlobale,
  enAttente,
  annee,
  auditsTermines,
  auditsPlanifies,
}: GlobalStatsProps) {
  const [modeRealiste, setModeRealiste] = useState(false);

  const realises = auditsTermines ?? totalAudits;
  const planifiesAffiche = auditsPlanifies ?? enAttente;

  // Jauge « restant à planifier » : uniquement relatif au volume filtré (sans cible globale)
  const restantSansStatutPlanifie = Math.max(0, totalAudits - realises - planifiesAffiche);

  // Calculate remaining days until Dec 31 of selected year
  const selectedYear = annee && annee !== "Tous" ? parseInt(annee) : new Date().getFullYear();
  const now = new Date();
  const endOfYear = new Date(selectedYear, 11, 31);
  const diffMs = endOfYear.getTime() - now.getTime();
  const joursRestants = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const semainesRestantesTotal = Math.max(1, Math.ceil(joursRestants / 7));

  const semainesEffectives = modeRealiste
    ? Math.max(1, semainesRestantesTotal - DEFAULT_SEM_INDispo)
    : semainesRestantesTotal;
  const moyenneParSemaine =
    restantSansStatutPlanifie > 0 ? +(restantSansStatutPlanifie / semainesEffectives).toFixed(1) : 0;

  const moyenneLevel = moyenneGlobale >= 8 ? "excellent" : moyenneGlobale >= 6.5 ? "bon" : moyenneGlobale >= 5 ? "moyen" : "faible";
  const moyenneColor = moyenneLevel === "excellent" ? "text-primary" : moyenneLevel === "bon" ? "text-primary" : moyenneLevel === "moyen" ? "text-amber-500" : "text-destructive";
  const moyenneLabel = moyenneLevel === "excellent" ? "Excellent" : moyenneLevel === "bon" ? "Bonne performance" : moyenneLevel === "moyen" ? "Peut mieux faire" : "Insuffisant";
  const moyenneIcon = moyenneGlobale >= 5 ? faArrowTrendUp : faArrowTrendDown;
  const moyennePct = Math.min(100, (moyenneGlobale / 10) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0,
          duration: m3DurationSeconds("standard"),
          ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
        }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3 text-primary" />
          Audits réalisés
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{realises}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
          Sur la période et les filtres sélectionnés
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: m3DurationSeconds("standardAccelerate") * 0.2,
          duration: m3DurationSeconds("standard"),
          ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
        }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCalendarCheck} className="h-3 w-3 text-amber-500" />
          Planifiés
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{planifiesAffiche}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
          {restantSansStatutPlanifie > 0
            ? `Encore ${restantSansStatutPlanifie} à rattacher ou compléter`
            : "Volume cohérent avec les filtres"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: m3DurationSeconds("standardAccelerate") * 0.4,
          duration: m3DurationSeconds("standard"),
          ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
        }}
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: m3DurationSeconds("standardAccelerate") * 0.6,
          duration: m3DurationSeconds("standard"),
          ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
        }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60 cursor-pointer select-none"
        onClick={() => setModeRealiste((prev) => !prev)}
        title="Cliquez pour basculer entre estimation brute et réaliste (−10 semaines)"
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
              −{DEFAULT_SEM_INDispo} sem. (CP, séminaire, frein commercial)
            </p>
          )}

          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
            {modeRealiste
              ? `${semainesEffectives} sem. effectives (sur ${semainesRestantesTotal})`
              : `${semainesRestantesTotal} semaines`}
          </p>

          {restantSansStatutPlanifie > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <FontAwesomeIcon icon={faCalculator} className="h-3 w-3 text-primary" />
              <span className="tabular-nums font-medium">
                {moyenneParSemaine} rattachements/sem. (ordre de grandeur)
              </span>
            </div>
          ) : (
            <p className="text-[10px] sm:text-xs text-primary mt-1.5 flex items-center gap-1">
              <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3" /> Rythme cohérent sur la période
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
