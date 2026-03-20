import { motion } from "framer-motion";
import { getTypeColorHSL } from "@/lib/eventTypeColors";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";

interface PodiumCardsProps {
  data: { nom: string; type: string; count: number; avg: number | null }[];
}

const TYPES = ["Club Affaires", "RD Présentiel", "RD Distanciel", "RDV Commercial"];

const MEDAL_COLORS = {
  gold: { bg: "#FFD700", trophy: "#DAA520" },
  silver: { bg: "#C0C0C0", trophy: "#A0A0A0" },
  bronze: { bg: "#CD7F32", trophy: "#A0612B" },
};

const podiumConfig = [
  { rank: 2, medal: MEDAL_COLORS.silver, height: "h-20" },
  { rank: 1, medal: MEDAL_COLORS.gold, height: "h-28" },
  { rank: 3, medal: MEDAL_COLORS.bronze, height: "h-14" },
];

/** Format name as "Prénom NOM" — compound first names handled (Jean-Christophe) */
function formatName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { prenom: titleCase(parts[0] || ""), nom: "" };
  }
  const nom = parts[parts.length - 1].toUpperCase();
  const prenom = parts
    .slice(0, -1)
    .map(titleCase)
    .join(" ");
  return { prenom, nom };
}

function titleCase(word: string): string {
  return word
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("-");
}

export function PodiumCards({ data }: PodiumCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {TYPES.map((type) => {
        const typeColor = getTypeColorHSL(type);
        const top3 = data
          .filter((d) => d.type === type && d.avg !== null && d.avg > 0)
          .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
          .slice(0, 3);

        const podiumOrder =
          top3.length >= 2
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
            <h4 className="text-xs font-semibold text-foreground mb-4 text-center truncate">
              {type}
            </h4>
            {podiumOrder.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Aucune donnée
              </p>
            ) : (
              <div className="flex items-end justify-center gap-2 sm:gap-3 min-h-[160px]">
                {podiumOrder.map((entry, i) => {
                  const cfg =
                    top3.length >= 3
                      ? podiumConfig[i]
                      : top3.length === 2
                        ? podiumConfig[i === 0 ? 0 : 1]
                        : podiumConfig[1];

                  const { prenom, nom } = formatName(entry.nom);

                  return (
                    <div
                      key={entry.nom}
                      className="flex flex-col items-center flex-1 max-w-[90px]"
                    >
                      {/* Rank number on top */}
                      <span
                        className="text-lg font-bold tabular-nums mb-1"
                        style={{ color: typeColor }}
                      >
                        {cfg.rank}
                      </span>
                      {/* Bar with note inside */}
                      <div
                        className={`w-full ${cfg.height} rounded-t-md relative flex items-center justify-center`}
                        style={{ backgroundColor: cfg.color }}
                      >
                        <span
                          className="text-white font-bold"
                          style={{ fontSize: "24px" }}
                        >
                          {entry.avg!.toFixed(1)}
                        </span>
                      </div>
                      {/* Formatted name: Prénom + NOM */}
                      <p
                        className="text-[10px] font-bold mt-1.5 text-center leading-tight w-full text-foreground"
                        title={entry.nom}
                      >
                        <span className="block">{prenom}</span>
                        <span className="block uppercase">{nom}</span>
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
