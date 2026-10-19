import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SectorData { sector: string; demand: number; supply: number; gap: number; }

const MOCK_SECTOR_DATA: SectorData[] = [
  { sector: "Green Jobs", demand: 34200, supply: 8900, gap: 25300 },
  { sector: "Healthcare", demand: 62100, supply: 28400, gap: 33700 },
  { sector: "Automotive", demand: 58400, supply: 29800, gap: 28600 },
  { sector: "Agriculture", demand: 74000, supply: 48200, gap: 25800 },
  { sector: "Construction", demand: 128000, supply: 84100, gap: 43900 },
  { sector: "Electronics", demand: 42000, supply: 21800, gap: 20200 },
  { sector: "IT & ITeS", demand: 94000, supply: 112000, gap: -18000 },
  { sector: "Retail", demand: 68000, supply: 91200, gap: -23200 },
  { sector: "Textile", demand: 52000, supply: 78400, gap: -26400 },
  { sector: "Food Proc.", demand: 38000, supply: 29600, gap: 8400 },
];

export default function SectorBarChart() {
  return (
    <div aria-label="Demand and supply by sector bar chart">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={MOCK_SECTOR_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e8f0" />
          <XAxis dataKey="sector" tick={{ fontSize: 9, fill: "#7a8fa8" }} angle={-35} textAnchor="end" interval={0} height={60} />
          <YAxis tick={{ fontSize: 10, fill: "#7a8fa8" }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <Tooltip contentStyle={{ fontSize: 11, border: "1px solid var(--color-border)", borderRadius: 4 }}
            formatter={(v: any, n: any) => [(Number(v) || 0).toLocaleString('en-IN'), String(n ?? "")]} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="demand" name="Demand" fill="#1a3a6b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="supply" name="Supply" fill="#138808" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

