import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";

interface PodiumEntry {
  nom: string;
  avg: number;
  count: number;
}

interface PodiumCardsProps {
  data: { nom: string; type: string; count: number; avg: number | null }[];
}

const TYPES = ["Club Affaires", "RD Présentiel", "RD Distanciel", "RDV Commercial"];

const medalStyles = [
  { bar: "bg-[hsl(0,0%,78%)]", text: "text-[hsl(0,0%,40%)]", label: "🥈" },   // Silver (2nd, left)
  { bar: "bg-[hsl(43,90%,55%)]", text: "text-[hsl(43,80%,30%)]", label: "🥇" }, // Gold (1st, center)
  { bar: "bg-[hsl(25,60%,65%)]", text: "text-[hsl(25,60%,30%)]", label: "🥉" }, // Bronze (3rd, right)
];

const barHeights = ["h-20", "h-28", "h-14"]; // silver, gold, bronze

export function PodiumCards({ data }: PodiumCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {TYPES.map((type) => {
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
            <h4 className="font-sora text-xs font-semibold text-foreground mb-4 text-center truncate">{type}</h4>
            {podiumOrder.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée</p>
            ) : (
              <div className="flex items-end justify-center gap-2 sm:gap-3 min-h-[140px]">
                {podiumOrder.map((entry, i) => {
                  const styleIdx = top3.length >= 3 ? i : (top3.length === 2 ? (i === 0 ? 0 : 1) : 1);
                  const style = medalStyles[styleIdx];
                  const height = barHeights[styleIdx];

                  return (
                    <div key={entry.nom} className="flex flex-col items-center flex-1 max-w-[90px]">
                      <span className="text-lg mb-1">{style.label}</span>
                      <span className={`text-xs font-bold tabular-nums ${style.text} mb-1`}>
                        {entry.avg!.toFixed(1)}
                      </span>
                      <div className={`w-full ${height} ${style.bar} rounded-t-md transition-all`} />
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight truncate w-full" title={entry.nom}>
                        {entry.nom.split(" ")[0]}
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
