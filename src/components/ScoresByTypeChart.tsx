import { motion } from "framer-motion";
import { M3_MOTION_DURATION_MS, M3_MOTION_EASE_CSS, m3DurationSeconds, M3_MOTION_EASE } from "@/lib/m3Motion";
import type { TooltipProps } from "recharts";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { getTypeColorTriad } from "@/lib/eventTypeColors";

interface ScoresByTypeChartProps {
  data: { type: string; avg: number; min: number; max: number; count: number };
  index: number;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-foreground text-background rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1">{d.label}</p>
      <p className="tabular-nums">{d.value.toFixed(2)}</p>
    </div>
  );
};

export function ScoresByTypeChart({ data, index }: ScoresByTypeChartProps) {
  const triad = getTypeColorTriad(data.type);

  const chartData = [
    { label: "Min", value: data.min, color: triad.min },
    { label: "Moyenne", value: data.avg, color: triad.avg },
    { label: "Max", value: data.max, color: triad.max },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * m3DurationSeconds("standardAccelerate") / 3,
        duration: m3DurationSeconds("standard"),
        ease: [...M3_MOTION_EASE.standardDecelerate] as [number, number, number, number],
      }}
      className="bg-card rounded-2xl shadow-soft border border-border/60 p-5"
    >
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {data.type}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">{data.count} audit{data.count > 1 ? "s" : ""}</p>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--chart-tick))" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--chart-tick))" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--chart-grid))" }} />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              barSize={28}
              animationDuration={M3_MOTION_DURATION_MS.emphasized + M3_MOTION_DURATION_MS.standardAccelerate}
              animationEasing={M3_MOTION_EASE_CSS.standardDecelerate}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: triad.min }} /> Min</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: triad.avg }} /> Moy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: triad.max }} /> Max</span>
      </div>
    </motion.div>
  );
}
