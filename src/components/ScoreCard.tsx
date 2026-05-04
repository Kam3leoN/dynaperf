import { motion } from "framer-motion";
import { getTypeColorHSL } from "@/lib/eventTypeColors";
import { m3DurationSeconds, M3_MOTION_EASE } from "@/lib/m3Motion";

interface ScoreCardProps {
  type: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  index: number;
}

export function ScoreCard({ type, avg, min, max, count, index }: ScoreCardProps) {
  const typeColor = getTypeColorHSL(type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * m3DurationSeconds("standardAccelerate") / 3,
        duration: m3DurationSeconds("standard"),
        ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
      }}
      className="bg-card p-5 rounded-2xl shadow-soft border border-border/60"
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {type}
      </h3>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-4xl font-bold tabular-nums" style={{ color: typeColor }}>{avg.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">/10</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{count} audit{count > 1 ? "s" : ""} noté{count > 1 ? "s" : ""}</p>

      {/* Range visualizer */}
      <div className="mt-5 relative">
        <div className="h-1 w-full bg-muted rounded-full relative">
          {min > 0 && (
            <div
              className="absolute h-2.5 w-2.5 rounded-full -top-[3px]"
              style={{ left: `${(min / 10) * 100}%`, backgroundColor: `${typeColor}60` }}
              title={`Min: ${min}`}
            />
          )}
          {max > 0 && (
            <div
              className="absolute h-2.5 w-2.5 rounded-full -top-[3px]"
              style={{ left: `${(max / 10) * 100}%`, backgroundColor: typeColor }}
              title={`Max: ${max}`}
            />
          )}
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-muted-foreground tabular-nums">
          <span>Min {min.toFixed(1)}</span>
          <span>Max {max.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
}
