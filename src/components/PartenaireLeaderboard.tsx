import { motion } from "framer-motion";

interface PartenaireLeaderboardProps {
  data: { nom: string; count: number; avg: number | null }[];
}

export function PartenaireLeaderboard({ data }: PartenaireLeaderboardProps) {
  const top10 = data.filter(d => d.avg !== null).slice(0, 10);
  
  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <h3 className="font-sora text-sm font-semibold text-foreground mb-4">Top partenaires par note moyenne</h3>
      <div className="space-y-2">
        {top10.map((p, i) => (
          <motion.div
            key={p.nom}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 py-1.5"
          >
            <span className="font-sora text-xs font-bold text-muted-foreground w-5 tabular-nums">{i + 1}</span>
            <span className="text-sm text-foreground flex-1 truncate">{p.nom}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{p.count} audit{p.count > 1 ? "s" : ""}</span>
            <span className={`font-sora text-sm font-bold tabular-nums ${p.avg! >= 7 ? "text-foreground" : "text-primary"}`}>
              {p.avg!.toFixed(1)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
