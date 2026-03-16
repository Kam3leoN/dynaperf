import { motion } from "framer-motion";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";

interface PartenaireLeaderboardProps {
  data: { nom: string; type: string; count: number; avg: number | null }[];
}

const medalColors: Record<number, { bg: string; text: string; icon: string }> = {
  0: { bg: "bg-[hsl(43,80%,90%)]", text: "text-[hsl(43,80%,35%)]", icon: "text-[hsl(43,90%,50%)]" },
  1: { bg: "bg-[hsl(0,0%,90%)]", text: "text-[hsl(0,0%,40%)]", icon: "text-[hsl(0,0%,65%)]" },
  2: { bg: "bg-[hsl(25,60%,88%)]", text: "text-[hsl(25,60%,35%)]", icon: "text-[hsl(25,70%,50%)]" },
};

export function PartenaireLeaderboard({ data }: PartenaireLeaderboardProps) {
  const types = ["Tous", ...new Set(data.map((d) => d.type))];
  const [selectedType, setSelectedType] = useState("Tous");

  const filtered = data
    .filter((d) => d.avg !== null)
    .filter((d) => selectedType === "Tous" || d.type === selectedType)
    .slice(0, 10);

  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-sora text-sm font-semibold text-foreground">🏆 Top 10 partenaires par note moyenne</h3>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        {filtered.map((p, i) => {
          const medal = medalColors[i];
          const isPodium = i < 3;

          return (
            <motion.div
              key={`${p.nom}-${p.type}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${
                isPodium ? medal.bg : "hover:bg-secondary/50"
              }`}
            >
              {isPodium ? (
                <div className="w-7 h-7 flex items-center justify-center">
                  <Trophy className={`h-5 w-5 ${medal.icon}`} fill="currentColor" />
                </div>
              ) : (
                <span className="w-7 h-7 flex items-center justify-center font-sora text-xs font-bold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
              )}
              <span className={`text-sm flex-1 truncate ${isPodium ? `font-semibold ${medal.text}` : "text-foreground"}`}>
                {p.nom}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-sm bg-secondary font-medium text-muted-foreground hidden sm:inline">
                {p.type}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {p.count} audit{p.count > 1 ? "s" : ""}
              </span>
              <span className={`font-sora text-base font-bold tabular-nums ${
                isPodium ? medal.text : p.avg! >= 7 ? "text-foreground" : "text-primary"
              }`}>
                {p.avg!.toFixed(1)}
              </span>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun partenaire noté pour ce type</p>
        )}
      </div>
    </div>
  );
}
