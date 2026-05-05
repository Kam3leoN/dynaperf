import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { m3DurationSeconds, M3_MOTION_EASE } from "@/lib/m3Motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faArrowTrendUp, faArrowTrendDown, faCalendarDay, faCalculator, faUmbrellaBeach, faCalendarCheck, faBullseye } from "@fortawesome/free-solid-svg-icons";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { parseBonusTariffJson } from "@/lib/bonusTariff";

const DEFAULT_SEM_INDispo = 10;

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
  annee?: string;
  periodMode?: "year" | "range";
  dateFrom?: string;
  dateTo?: string;
  auditsTermines?: number;
  auditsPlanifies?: number;
}

type ObjectiveTargets = {
  p1: number;
  p2: number;
  p3: number;
};

const DEFAULT_TARGETS: ObjectiveTargets = {
  p1: 150,
  p2: 155,
  p3: 175,
};

function parseObjectiveTargetsFromConditions(conditions: string[]): ObjectiveTargets {
  let p1 = DEFAULT_TARGETS.p1;
  let p2 = DEFAULT_TARGETS.p2;
  let p3 = DEFAULT_TARGETS.p3;

  for (const c of conditions) {
    const condition = c.trim();
    if (!condition) continue;
    const range = condition.match(/(\d+)\s*(?:à|a|-|–)\s*(\d+)/i);
    if (range) {
      const lo = Number.parseInt(range[1] ?? "", 10);
      if (Number.isFinite(lo) && lo > 0) p2 = lo;
    }
    const plus = condition.match(/(\d+)\s*(?:audits?\s*)?(?:ou\s*\+|et\s*\+)/i) || condition.match(/(\d+)\s*(?:et\s*plus)/i);
    if (plus) {
      const th = Number.parseInt(plus[1] ?? "", 10);
      if (Number.isFinite(th) && th > 0) p3 = th;
    }
    const explicitP1 = condition.match(/\b150\b/);
    if (explicitP1) p1 = 150;
  }

  if (p1 <= 0 || p1 >= p2) p1 = Math.max(1, p2 - 5);
  if (p2 <= 0 || p2 >= p3) p2 = Math.max(1, p3 - 20);

  return { p1, p2, p3 };
}

export function GlobalStats({
  totalAudits,
  auditsNotes,
  moyenneGlobale,
  enAttente,
  annee,
  periodMode,
  dateFrom,
  dateTo,
  auditsTermines,
  auditsPlanifies,
}: GlobalStatsProps) {
  const [modeRealiste, setModeRealiste] = useState(false);
  const [showPaliersDetail, setShowPaliersDetail] = useState(false);
  const [targets, setTargets] = useState<ObjectiveTargets>(DEFAULT_TARGETS);

  const realises = auditsTermines ?? totalAudits;
  const planifiesAffiche = auditsPlanifies ?? enAttente;

  // Jauge « restant à planifier » : uniquement relatif au volume filtré (sans cible globale)
  const restantSansStatutPlanifie = Math.max(0, totalAudits - realises - planifiesAffiche);

  // Calculate remaining days until Dec 31 of selected year
  const selectedYear =
    periodMode === "range" && dateTo
      ? new Date(`${dateTo}T12:00:00`).getFullYear()
      : annee && annee !== "Tous"
        ? parseInt(annee)
        : new Date().getFullYear();
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("bonus_prime_tariffs")
        .select("tariff_data")
        .eq("year", selectedYear)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setTargets(DEFAULT_TARGETS);
        return;
      }
      const tariff = parseBonusTariffJson(data.tariff_data);
      const parsed = parseObjectiveTargetsFromConditions(tariff.volume_tiers.map((x) => x.condition));
      setTargets(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const p1Progress = Math.min(100, Math.round((realises / Math.max(1, targets.p1)) * 100));
  const p2Progress = Math.min(100, Math.round((realises / Math.max(1, targets.p2)) * 100));
  const p3Progress = Math.min(100, Math.round((realises / Math.max(1, targets.p3)) * 100));

  const nextTarget = useMemo(() => {
    if (realises < targets.p1) return targets.p1;
    if (realises < targets.p2) return targets.p2;
    if (realises < targets.p3) return targets.p3;
    return null;
  }, [realises, targets]);

  const remainingToNextTarget = nextTarget ? Math.max(0, nextTarget - realises) : 0;
  const idealAuditsPerWeek =
    remainingToNextTarget > 0 ? +(remainingToNextTarget / Math.max(1, semainesEffectives)).toFixed(1) : 0;

  const moyenneLevel = moyenneGlobale >= 8 ? "excellent" : moyenneGlobale >= 6.5 ? "bon" : moyenneGlobale >= 5 ? "moyen" : "faible";
  const moyenneColor = moyenneLevel === "excellent" ? "text-primary" : moyenneLevel === "bon" ? "text-primary" : moyenneLevel === "moyen" ? "text-amber-500" : "text-destructive";
  const moyenneLabel = moyenneLevel === "excellent" ? "Excellent" : moyenneLevel === "bon" ? "Bonne performance" : moyenneLevel === "moyen" ? "Peut mieux faire" : "Insuffisant";
  const moyenneIcon = moyenneGlobale >= 5 ? faArrowTrendUp : faArrowTrendDown;
  const moyennePct = Math.min(100, (moyenneGlobale / 10) * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0,
          duration: m3DurationSeconds("standard"),
          ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
        }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60 cursor-pointer select-none"
        onClick={() => setShowPaliersDetail((prev) => !prev)}
        title="Cliquez pour afficher/masquer le détail des paliers"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faBullseye} className="h-3 w-3 text-primary" />
          Objectifs d'audits
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{targets.p1}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">équipe</span>
        </div>
        {showPaliersDetail ? (
          <div className="mt-2 space-y-1 text-[11px] sm:text-xs text-muted-foreground">
            <p className="tabular-nums">Palier 2 : {targets.p2} à {Math.max(targets.p2, targets.p3 - 1)}</p>
            <p className="tabular-nums">Palier 3 : {targets.p3}+</p>
          </div>
        ) : null}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: m3DurationSeconds("standardAccelerate") * 0.15,
          duration: m3DurationSeconds("standard"),
          ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
        }}
        className="bg-card rounded-2xl p-3 sm:p-5 shadow-soft border border-border/60 cursor-pointer select-none"
        onClick={() => setShowPaliersDetail((prev) => !prev)}
        title="Cliquez pour afficher/masquer le détail des paliers"
      >
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight flex items-center gap-1.5">
          <FontAwesomeIcon icon={faCheckCircle} className="h-3 w-3 text-primary" />
          Audits réalisés
        </p>
        <div className="flex items-baseline gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">{realises}</span>
        </div>
        {showPaliersDetail ? (
          <div className="mt-2 space-y-1.5 text-[10px] text-muted-foreground tabular-nums">
            <div className="grid grid-cols-[44px_1fr_34px] items-center gap-2">
              <span>Palier 1</span>
              <Progress value={p1Progress} className="h-1.5" />
              <span className="text-right">{p1Progress}%</span>
            </div>
            <div className="grid grid-cols-[44px_1fr_34px] items-center gap-2">
              <span>Palier 2</span>
              <Progress value={p2Progress} className="h-1.5" />
              <span className="text-right">{p2Progress}%</span>
            </div>
            <div className="grid grid-cols-[44px_1fr_34px] items-center gap-2">
              <span>Palier 3</span>
              <Progress value={p3Progress} className="h-1.5" />
              <span className="text-right">{p3Progress}%</span>
            </div>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-[1fr_34px] items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
            <Progress value={p1Progress} className="h-1.5" />
            <span className="text-right">{p1Progress}%</span>
          </div>
        )}
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
        {restantSansStatutPlanifie > 0 ? (
          <p className="text-[10px] text-muted-foreground mt-2 tabular-nums">
            Encore {restantSansStatutPlanifie} à rattacher ou compléter
          </p>
        ) : null}
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

          {remainingToNextTarget > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <FontAwesomeIcon icon={faCalculator} className="h-3 w-3 text-primary" />
              <span className="tabular-nums font-medium">
                {idealAuditsPerWeek} audits/sem. (objectif réaliste)
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
