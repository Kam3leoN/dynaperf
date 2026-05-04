import { motion } from "framer-motion";
import { m3FramerSpring, m3DurationSeconds, M3_MOTION_EASE } from "@/lib/m3Motion";

interface CollaborateurStat {
  nom: string;
  realise: number;
}

interface CollaborateurTrackerProps {
  data: CollaborateurStat[];
}

export function CollaborateurTracker({ data }: CollaborateurTrackerProps) {
  const maxRealise = Math.max(1, ...data.map((c) => c.realise));

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Volume par collaborateur</h3>
      <div className="space-y-3 sm:space-y-4">
        {data.map((c, i) => {
          const pct = Math.min(100, (c.realise / maxRealise) * 100);
          const behind = pct < 80;
          return (
            <motion.div
              key={c.nom}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * m3DurationSeconds("standardAccelerate") * 0.4,
                duration: m3DurationSeconds("standard"),
                ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
              }}
              whileHover={{ scale: 1.005 }}
              className="group"
            >
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm font-medium w-16 sm:w-24 text-foreground truncate">{c.nom}</span>
                <div className="flex-1 relative min-w-0">
                  <div className={`h-2 rounded-full w-full ${behind ? "bg-primary/10" : "bg-muted"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        ...m3FramerSpring("effects", "default"),
                        delay: i * m3DurationSeconds("standardAccelerate") / 2,
                      }}
                      className={`h-full rounded-full ${behind ? "bg-primary" : "bg-foreground"}`}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs sm:text-sm font-bold tabular-nums ${behind ? "text-primary" : "text-foreground"}`}>
                    {c.realise}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
