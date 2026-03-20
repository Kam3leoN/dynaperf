import { motion } from "framer-motion";
import { getTypeColorHSL } from "@/lib/eventTypeColors";

interface PodiumCardsProps {
  data: { nom: string; type: string; count: number; avg: number | null }[];
}

const TYPES = ["Club Affaires", "RD Présentiel", "RD Distanciel", "RDV Commercial"];

const MEDAL_COLORS = {
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
};

// Display order: silver (2nd), gold (1st), bronze (3rd)
const podiumConfig = [
  { rank: 2, color: MEDAL_COLORS.silver, height: "h-20" },
  { rank: 1, color: MEDAL_COLORS.gold, height: "h-28" },
  { rank: 3, color: MEDAL_COLORS.bronze, height: "h-14" },
];

export function PodiumCards({ data }: PodiumCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {TYPES.map((type) => {
        const typeColor = getTypeColorHSL(type);
        const top3 = data
          .filter((d) => d.type === type && d.avg !== null && d.avg > 0)
          .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
          .slice(0, 3);

        // Reorder for display: 2nd, 1st, 3rd
        const podiumOrder = top3.length >= 2
          ? [top3[1], top3[0], top3[2]].filter(Boolean)
          : top3;

        return (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-lg shadow-soft p-4"
          >
            <h4 className="text-xs font-semibold text-foreground mb-4 text-center truncate">{type}</h4>
            {podiumOrder.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
            ) : (
              <div className="flex items-end justify-center gap-2 sm:gap-3 min-h-[160px]">
                {podiumOrder.map((entry, i) => {
                  const cfg = top3.length >= 3
                    ? podiumConfig[i]
                    : top3.length === 2
                      ? podiumConfig[i === 0 ? 0 : 1]
                      : podiumConfig[1]; // single entry gets gold

                  return (
                    <div key={entry.nom} className="flex flex-col items-center flex-1 max-w-[90px]">
                      <span
                        className="text-lg font-bold tabular-nums mb-1"
                        style={{ color: typeColor }}
                      >
                        {entry.avg!.toFixed(1)}
                      </span>
                      <div
                        className={`w-full ${cfg.height} rounded-t-md relative flex items-center justify-center`}
                        style={{ backgroundColor: cfg.color }}
                      >
                        <span className="text-white font-bold" style={{ fontSize: "24px" }}>
                          {cfg.rank}
                        </span>
                      </div>
                      <p
                        className="text-[10px] font-bold mt-1.5 text-center leading-tight truncate w-full uppercase text-foreground"
                        title={entry.nom}
                      >
                        {entry.nom}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
