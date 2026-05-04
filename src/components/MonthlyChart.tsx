import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { M3_MOTION_DURATION_MS, M3_MOTION_EASE_CSS } from "@/lib/m3Motion";

interface MonthlyChartProps {
  data: { mois: string; total: number }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Volume mensuel d'audits</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-area))" stopOpacity={0.08} />
                <stop offset="100%" stopColor="hsl(var(--chart-area))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "hsl(var(--chart-tick))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--chart-tick))" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--foreground))",
                border: "none",
                borderRadius: 6,
                color: "hsl(var(--background))",
                fontSize: 12,
                fontFamily: "Lexend",
              }}
              labelStyle={{ color: "hsl(var(--background))" }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              fill="url(#areaGrad)"
              animationDuration={M3_MOTION_DURATION_MS.emphasized + M3_MOTION_DURATION_MS.standard}
              animationEasing={M3_MOTION_EASE_CSS.standardDecelerate}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
