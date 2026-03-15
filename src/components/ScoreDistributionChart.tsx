import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ScoreDistributionChartProps {
  data: { range: string; count: number }[];
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <h3 className="font-sora text-sm font-semibold text-foreground mb-4">Distribution des notes</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,33,33,0.06)" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 11, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} />
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
            />
            <Bar dataKey="count" fill="#ee4542" radius={[4, 4, 0, 0]} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
