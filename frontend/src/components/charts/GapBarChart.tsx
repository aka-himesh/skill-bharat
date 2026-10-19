import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import type { GapRow } from "../../types";

export default function GapBarChart({ data }: { data: GapRow[] }) {
  const top10 = [...data].sort((a, b) => Math.abs(b.gapPercent) - Math.abs(a.gapPercent)).slice(0, 10);

  return (
    <div aria-label="Top 10 skill gap trades bar chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e0e8f0" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#7a8fa8" }} tickLine={false}
            tickFormatter={(v: number) => `${v}%`} domain={[-150, 100]} />
          <YAxis type="category" dataKey="tradeName" tick={{ fontSize: 10, fill: "#4a5a72" }} width={95} />
          <Tooltip
            formatter={(v: any) => [(Number(v) || 0).toFixed(1) + '%', 'Gap %']}
            contentStyle={{ fontSize: 11, border: "1px solid var(--color-border)", borderRadius: 4 }}
          />
          <Bar dataKey="gapPercent" name="Gap %" radius={[0, 3, 3, 0]}>
            {top10.map((row) => (
              <Cell key={row.id} fill={
                row.severity === "Critical Shortage" ? "#c0392b" :
                row.severity === "Shortage" ? "#e67e22" :
                row.severity === "Balanced" ? "#27ae60" :
                row.severity === "Oversupply" ? "#2980b9" : "#8e44ad"
              } />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

