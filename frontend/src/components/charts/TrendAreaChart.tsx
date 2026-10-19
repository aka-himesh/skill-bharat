import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { TrendPoint } from "../../types";

export default function TrendAreaChart({ data, title }: { data: TrendPoint[]; title?: string }) {
  return (
    <div aria-label={title ?? "Trend analysis chart"}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-demand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a3a6b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1a3a6b" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="grad-supply" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#138808" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#138808" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#7a8fa8" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#7a8fa8" }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <Tooltip contentStyle={{ fontSize: 11, border: "1px solid var(--color-border)", borderRadius: 4 }}
            formatter={(v: any, n: any) => [(Number(v) || 0).toLocaleString('en-IN'), String(n ?? "")]} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="demand" stroke="#1a3a6b" fill="url(#grad-demand)" strokeWidth={2.5} name="Demand" dot={{ r: 3 }} />
          <Area type="monotone" dataKey="supply" stroke="#138808" fill="url(#grad-supply)" strokeWidth={2.5} name="Supply" dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

