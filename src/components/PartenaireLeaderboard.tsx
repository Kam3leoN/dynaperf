import { motion } from "framer-motion";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PartenaireLeaderboardProps {
  data: { nom: string; type: string; count: number; avg: number | null }[];
}

export function PartenaireLeaderboard({ data }: PartenaireLeaderboardProps) {
  const types = ["Tous", ...new Set(data.map((d) => d.type))];
  const [selectedType, setSelectedType] = useState("Tous");

  const filtered = data
    .filter((d) => d.avg !== null)
    .filter((d) => selectedType === "Tous" || d.type === selectedType)
    .slice(0, 15);

  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-sora text-sm font-semibold text-foreground">Top partenaires par note moyenne</h3>
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
      <div className="space-y-2">
        {filtered.map((p, i) => (
          <motion.div
            key={`${p.nom}-${p.type}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 py-1.5"
          >
            <span className="font-sora text-xs font-bold text-muted-foreground w-5 tabular-nums">{i + 1}</span>
            <span className="text-sm text-foreground flex-1 truncate">{p.nom}</span>
            <span className="text-xs px-2 py-0.5 rounded-sm bg-secondary font-medium text-muted-foreground">{p.type}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{p.count} audit{p.count > 1 ? "s" : ""}</span>
            <span className={`font-sora text-sm font-bold tabular-nums ${p.avg! >= 7 ? "text-foreground" : "text-primary"}`}>
              {p.avg!.toFixed(1)}
            </span>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun partenaire noté pour ce type</p>
        )}
      </div>
    </div>
  );
}
