import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface MonthlyChartProps {
  data: { mois: string; total: number }[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <h3 className="font-sora text-sm font-semibold text-foreground mb-4">Volume mensuel d'audits</h3>
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
                fontFamily: "Sora",
              }}
              labelStyle={{ color: "hsl(var(--background))" }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              fill="url(#areaGrad)"
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
