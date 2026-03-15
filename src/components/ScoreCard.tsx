import { motion } from "framer-motion";

interface ScoreCardProps {
  type: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  index: number;
}

export function ScoreCard({ type, avg, min, max, count, index }: ScoreCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="bg-card p-5 rounded-lg shadow-soft transition-shadow duration-200 hover:shadow-hover"
    >
      <h3 className="font-sora text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {type}
      </h3>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="font-sora text-4xl font-bold text-primary tabular-nums">{avg.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">/10</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{count} audit{count > 1 ? "s" : ""} noté{count > 1 ? "s" : ""}</p>

      {/* Range visualizer */}
      <div className="mt-5 relative">
        <div className="h-1 w-full bg-secondary rounded-full relative">
          {min > 0 && (
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-foreground/30 -top-[3px]"
              style={{ left: `${(min / 10) * 100}%` }}
              title={`Min: ${min}`}
            />
          )}
          {max > 0 && (
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-primary -top-[3px]"
              style={{ left: `${(max / 10) * 100}%` }}
              title={`Max: ${max}`}
            />
          )}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground tabular-nums">
          <span>Min {min.toFixed(1)}</span>
          <span>Max {max.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
}
