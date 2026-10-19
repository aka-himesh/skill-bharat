import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { TrendForecastResponse } from "../../types";

interface Props {
  data: TrendForecastResponse;
}

export default function ForecastChart({ data }: Props) {
  const chartData = [
    ...data.history.map((h) => ({
      period: h.period, demand: h.demand, supply: h.supply, gap: h.gap, isActual: true,
    })),
    ...data.forecast.map((f) => ({
      period: f.period,
      forecastDemand: f.forecastDemand,
      forecastSupply: f.forecastSupply,
      demandBandLo: f.demandLower,
      demandBandHi: f.demandUpper,
      supplyBandLo: f.supplyLower,
      supplyBandHi: f.supplyUpper,
      isActual: false,
    })),
  ];

  const splitIdx = data.history.length - 1;
  const splitPeriod = data.history[splitIdx]?.period;

  return (
    <div aria-label={`Demand-supply forecast chart for ${data.tradeName}`}>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="demandBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a3a6b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1a3a6b" stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="supplyBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#138808" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#138808" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#7a8fa8" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#7a8fa8" }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <Tooltip
            contentStyle={{ fontSize: 11, border: "1px solid var(--color-border)", borderRadius: 4 }}
            formatter={(value: any, name: any) => [(Number(value) || 0).toLocaleString('en-IN'), String(name ?? "")]}
          />
          <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
          {splitPeriod && <ReferenceLine x={splitPeriod} stroke="#e8601c" strokeDasharray="4 2" label={{ value: "Forecast →", position: "insideTopRight", fontSize: 10, fill: "#e8601c" }} />}
          {/* 80% confidence bands */}
          <Area type="monotone" dataKey="demandBandHi" fill="url(#demandBand)" stroke="none" name="Demand Band Hi" legendType="none" />
          <Area type="monotone" dataKey="demandBandLo" fill="#fff" stroke="none" name="Demand Band Lo" legendType="none" />
          <Area type="monotone" dataKey="supplyBandHi" fill="url(#supplyBand)" stroke="none" name="Supply Band Hi" legendType="none" />
          <Area type="monotone" dataKey="supplyBandLo" fill="#fff" stroke="none" name="Supply Band Lo" legendType="none" />
          {/* Actual lines */}
          <Line type="monotone" dataKey="demand" stroke="var(--color-chart-demand)" strokeWidth={2.5} dot={{ r: 3 }} name="Demand (Actual)" connectNulls />
          <Line type="monotone" dataKey="supply" stroke="var(--color-chart-supply)" strokeWidth={2.5} dot={{ r: 3 }} name="Supply (Actual)" connectNulls />
          {/* Forecast lines */}
          <Line type="monotone" dataKey="forecastDemand" stroke="var(--color-chart-demand)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="Demand (Forecast)" connectNulls />
          <Line type="monotone" dataKey="forecastSupply" stroke="var(--color-chart-supply)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="Supply (Forecast)" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ textAlign: "center", fontSize: 10, color: "var(--color-text-muted)", marginTop: 4 }}>
        Shaded areas represent 80% confidence interval. Dashed lines = forecast period.
      </div>
    </div>
  );
}

