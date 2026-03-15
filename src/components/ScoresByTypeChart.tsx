import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ScoresByTypeChartProps {
  data: { type: string; avg: number; min: number; max: number; count: number }[];
}

export function ScoresByTypeChart({ data }: ScoresByTypeChartProps) {
  return (
    <div className="bg-card rounded-lg shadow-soft p-5">
      <h3 className="font-sora text-sm font-semibold text-foreground mb-4">Comparaison par type d'événement</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,33,33,0.06)" horizontal={false} />
            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="type" tick={{ fontSize: 11, fill: "rgba(33,33,33,0.6)" }} axisLine={false} tickLine={false} width={110} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#212121",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
                fontFamily: "Sora",
              }}
              formatter={(value: number, name: string) => [value.toFixed(2), name === "avg" ? "Moyenne" : name === "min" ? "Min" : "Max"]}
            />
            <Bar dataKey="min" fill="rgba(33,33,33,0.15)" radius={[4, 4, 4, 4]} barSize={8} />
            <Bar dataKey="avg" fill="#212121" radius={[4, 4, 4, 4]} barSize={8} />
            <Bar dataKey="max" fill="#ee4542" radius={[4, 4, 4, 4]} barSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-foreground/15" /> Min</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-foreground" /> Moyenne</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Max</span>
      </div>
    </div>
  );
}
