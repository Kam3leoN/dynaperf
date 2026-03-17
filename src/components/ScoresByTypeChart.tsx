import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

interface ScoresByTypeChartProps {
  data: { type: string; avg: number; min: number; max: number; count: number };
  index: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-foreground text-background rounded-md px-3 py-2 text-xs font-sora shadow-lg">
      <p className="font-semibold mb-1">{d.label}</p>
      <p className="tabular-nums">{d.value.toFixed(2)}</p>
    </div>
  );
};

export function ScoresByTypeChart({ data, index }: ScoresByTypeChartProps) {
  const chartData = [
    { label: "Min", value: data.min, color: "hsl(var(--muted-foreground) / 0.3)" },
    { label: "Moyenne", value: data.avg, color: "hsl(var(--foreground))" },
    { label: "Max", value: data.max, color: "hsl(var(--primary))" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="bg-card rounded-lg shadow-soft p-5"
    >
      <h3 className="font-sora text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {data.type}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">{data.count} audit{data.count > 1 ? "s" : ""}</p>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,33,33,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(33,33,33,0.04)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28} animationDuration={600}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted-foreground/30" /> Min</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-foreground" /> Moy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary" /> Max</span>
      </div>
    </motion.div>
  );
}
