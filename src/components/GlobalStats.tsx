import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface GlobalStatsProps {
  totalAudits: number;
  auditsNotes: number;
  moyenneGlobale: number;
  enAttente: number;
}

export function GlobalStats({ totalAudits, auditsNotes, moyenneGlobale, enAttente }: GlobalStatsProps) {
  const stats = [
    { label: "Total audits", value: totalAudits, suffix: "" },
    { label: "Audits notés", value: auditsNotes, suffix: "" },
    { label: "Moyenne globale", value: moyenneGlobale, suffix: "/10", highlight: true },
    { label: "En attente", value: enAttente, suffix: "", warn: enAttente > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="bg-card rounded-lg p-5 shadow-soft"
        >
          <p className="font-sora text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className={`font-sora text-3xl font-bold tabular-nums ${s.highlight ? "text-primary" : "text-foreground"}`}>
              {s.value}
            </span>
            {s.suffix && <span className="text-sm text-muted-foreground">{s.suffix}</span>}
          </div>
          {s.warn && (
            <p className="text-xs text-primary mt-2 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> À noter
            </p>
          )}
          {s.highlight && s.value >= 6.5 && (
            <p className="text-xs text-foreground/60 mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Bonne performance
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
