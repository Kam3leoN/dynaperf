import { motion } from "framer-motion";

interface CollaborateurStat {
  nom: string;
  objectif: number;
  palier1: number;
  realise: number;
  progression: number;
}

interface CollaborateurTrackerProps {
  data: CollaborateurStat[];
}

export function CollaborateurTracker({ data }: CollaborateurTrackerProps) {
  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <h3 className="font-sora text-sm font-semibold text-foreground mb-4">Progression collaborateurs</h3>
      <div className="space-y-4">
        {data.map((c, i) => {
          const pct = Math.min(c.progression, 100);
          const behind = c.progression < 80;
          return (
            <motion.div
              key={c.nom}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.005 }}
              className="group"
            >
              <div className="flex items-center gap-4">
                <span className="font-sora text-sm font-medium w-24 text-foreground truncate">{c.nom}</span>
                <div className="flex-1 relative">
                  <div className={`h-2 rounded-full w-full ${behind ? "bg-primary/10" : "bg-secondary"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className={`h-full rounded-full ${behind ? "bg-primary" : "bg-foreground"}`}
                    />
                  </div>
                  {/* Objective marker */}
                  {c.objectif > 0 && (
                    <div
                      className="absolute top-[-3px] h-[14px] w-[2px] bg-foreground/40"
                      style={{ left: "100%" }}
                      title={`Objectif: ${c.objectif}`}
                    />
                  )}
                </div>
                <div className="text-right w-24">
                  <span className={`font-sora text-sm font-bold tabular-nums ${behind ? "text-primary" : "text-foreground"}`}>
                    {c.realise}
                  </span>
                  <span className="text-xs text-muted-foreground">/{c.objectif}</span>
                </div>
                <span className={`text-xs font-medium tabular-nums w-14 text-right ${behind ? "text-primary" : "text-muted-foreground"}`}>
                  {c.progression.toFixed(0)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
