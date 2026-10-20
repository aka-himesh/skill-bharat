import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { mockGapRows, mockDistricts, mockForecast } from "../mocks/data";
import DataTable from "../components/ui/DataTable";
import SeverityBadge from "../components/ui/SeverityBadge";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import ForecastChart from "../components/charts/ForecastChart";
import type { GapRow, SeverityBand, ForecastPoint, TrendForecastResponse } from "../types";
import type { Column } from "../components/ui/DataTable";
import { ArrowLeft, Radio } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useGaps, useDistricts, useForecast } from "../hooks/useApi";

export default function DistrictDrilldown() {
  const { districtId } = useParams<{ districtId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();

  // Try finding in mock or fetch from backend
  const mockDistrict = mockDistricts.find(
    (d) => d.id === districtId || d.name.toLowerCase() === (districtId || "").toLowerCase()
  );

  const numericDistrictId = Number(districtId);
  const isNumericId = !isNaN(numericDistrictId) && numericDistrictId > 0;

  // Fetch districts list if logged in
  const { data: apiDistricts } = useDistricts(undefined, isLoggedIn);
  const matchedApiDistrict = apiDistricts?.find(
    (d) =>
      d.id === numericDistrictId ||
      d.name.toLowerCase() === (districtId || "").toLowerCase()
  );

  const resolvedDistrictId = matchedApiDistrict?.id ?? (isNumericId ? numericDistrictId : undefined);
  const districtName = matchedApiDistrict?.name ?? mockDistrict?.name ?? districtId ?? "District";
  const stateName = mockDistrict?.stateName ?? "State";
  const isAspirational = matchedApiDistrict?.is_aspirational ?? mockDistrict?.isAspirational ?? false;

  // Fetch real gaps for this district
  const { data: apiGapsResponse, isLoading: gapsLoading } = useGaps(
    resolvedDistrictId ? { district_id: resolvedDistrictId } : undefined,
    isLoggedIn && !!resolvedDistrictId
  );

  const isLive = isLoggedIn && !!apiGapsResponse?.gaps?.length;

  let rows: GapRow[] = [];
  if (isLive && apiGapsResponse?.gaps) {
    rows = apiGapsResponse.gaps.map((item) => ({
      id: `${item.district_id}-${item.occupation_id}`,
      ncoCode: item.nco_code,
      tradeName: item.occupation_name,
      sectorName: item.sector_name || "General",
      stateId: item.state_name,
      stateName: item.state_name,
      districtId: String(item.district_id),
      districtName: item.district_name,
      demand: Math.round(item.forecast_demand),
      supply: Math.round(item.forecast_supply),
      gap: Math.round(item.forecast_demand - item.forecast_supply),
      gapPercent: Math.round(item.gap_pct * 10) / 10,
      severity: (item.gap_band as SeverityBand) || "Balanced",
      nsqfLevel: item.nsqf_level ?? 0,
      isAspirational: item.is_aspirational ?? isAspirational,
    }));
  } else {
    rows = mockGapRows.filter((r) => r.districtId === districtId);
  }

  // Selected trade for forecast
  const [selectedOccupationId, setSelectedOccupationId] = useState<number | null>(null);
  const activeOccupationId = selectedOccupationId ?? (apiGapsResponse?.gaps?.[0]?.occupation_id ?? 1);

  // Fetch forecast for district + occupation
  const { data: apiForecast } = useForecast(
    resolvedDistrictId ?? 1,
    activeOccupationId,
    isLoggedIn && !!resolvedDistrictId
  );

  // Map forecast data
  let forecastData: TrendForecastResponse = mockForecast;
  if (isLoggedIn && apiForecast && apiForecast.demand_forecast?.length > 0) {
    const forecastPoints: ForecastPoint[] = apiForecast.demand_forecast.map((df, i) => {
      const sf = apiForecast.supply_forecast?.[i];
      const demandVal = Math.round(df.point);
      const supplyVal = sf ? Math.round(sf.point) : 0;
      return {
        period: df.month,
        forecastDemand: demandVal,
        forecastSupply: supplyVal,
        forecastGap: demandVal - supplyVal,
        demandLower: df.lower_80 != null ? Math.round(df.lower_80) : Math.round(demandVal * 0.85),
        demandUpper: df.upper_80 != null ? Math.round(df.upper_80) : Math.round(demandVal * 1.15),
        supplyLower: sf?.lower_80 != null ? Math.round(sf.lower_80) : Math.round(supplyVal * 0.85),
        supplyUpper: sf?.upper_80 != null ? Math.round(sf.upper_80) : Math.round(supplyVal * 1.15),
        isActual: false,
      };
    });
    const historyPoints = (apiForecast.history || []).map((h) => ({
      period: h.month,
      demand: Math.round(h.demand_index),
      supply: Math.round(h.demand_index * 0.9),
      gap: Math.round(h.demand_index * 0.1),
    }));
    forecastData = {
      ncoCode: apiForecast.nco_code || mockForecast.ncoCode,
      tradeName: apiForecast.occupation_name || mockForecast.tradeName,
      history: historyPoints.length > 0 ? historyPoints : mockForecast.history,
      forecast: forecastPoints,
    };
  }

  const totalDemand = rows.reduce((a, r) => a + r.demand, 0);
  const totalSupply = rows.reduce((a, r) => a + r.supply, 0);
  const totalGap = rows.reduce((a, r) => a + r.gap, 0);
  const criticalShortage = rows.filter((r) => r.severity === "Critical Shortage").length;

  const cols: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade"), sortable: true },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    {
      key: "gap",
      header: t("table.gap"),
      sortable: true,
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.gap > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>
          {r.gap > 0 ? "+" : ""}{r.gap.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "gapPercent",
      header: t("table.gapPct"),
      sortable: true,
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.gapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>
          {r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%
        </span>
      ),
    },
    { key: "severity", header: t("table.severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "nsqfLevel", header: "NSQF", align: "center", render: (r) => `L${r.nsqfLevel}` },
  ];

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid var(--color-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}
            >
              <ArrowLeft size={13} /> Back
            </button>
            {isLive ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, background: "#f0faf4", color: "#138808", border: "1px solid #a8dfc0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                <Radio size={11} className="animate-pulse" /> LIVE BACKEND DATA
              </span>
            ) : (
              <span style={{ fontSize: 11, background: "#fef6ee", color: "#e67e22", border: "1px solid #fcd8b0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                DEMO DATA
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            {districtName}, {stateName}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            {isAspirational && (
              <span style={{ background: "#e8601c", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 3, fontWeight: 700 }}>
                ASPIRATIONAL DISTRICT
              </span>
            )}
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {rows.length} trade-sector combinations
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <KpiTile label="Total Demand" value={totalDemand} color="primary" />
          <KpiTile label="Total Supply" value={totalSupply} color="green" />
          <KpiTile label="Net Gap" value={totalGap} color={totalGap > 0 ? "red" : "purple"} />
          <KpiTile label="Critical Shortages" value={criticalShortage} subtext="trades" color="red" />
          <KpiTile label="Trades Analysed" value={rows.length} color="blue" />
        </div>

        <ChartCard
          title="Demand-Supply Forecast"
          subtitle={apiForecast?.occupation_name ? `Focus Trade: ${apiForecast.occupation_name} (NCO ${apiForecast.nco_code})` : "Sample: Solar Panel Installation Technician (NCO 7412.0200)"}
          ariaLabel="Trade forecast chart"
          info="Forecast uses SARIMA-XGBoost ensemble with 80% confidence interval bands."
        >
          <ForecastChart data={forecastData} />
        </ChartCard>

        <div style={{ marginTop: 16 }}>
          <ChartCard title={`Trade Breakdown — ${districtName}`} ariaLabel="District trade gap table">
            {rows.length > 0 ? (
              <DataTable
                columns={cols}
                data={rows}
                pageSize={10}
                onRowClick={(r) => {
                  if (apiGapsResponse?.gaps) {
                    const matched = apiGapsResponse.gaps.find((g) => g.nco_code === r.ncoCode);
                    if (matched) setSelectedOccupationId(matched.occupation_id);
                  }
                }}
                ariaLabel="District trade gaps"
              />
            ) : gapsLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading district trades...</div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                No trade data for this district. Try Jodhpur, Lucknow, or Pune.
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
