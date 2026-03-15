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
                <stop offset="0%" stopColor="#212121" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#212121" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,33,33,0.06)" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#212121",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
                fontFamily: "Sora",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#212121"
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
