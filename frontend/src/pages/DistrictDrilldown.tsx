import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { mockGapRows, mockDistricts } from "../mocks/data";
import { mockForecast } from "../mocks/data";
import DataTable from "../components/ui/DataTable";
import SeverityBadge from "../components/ui/SeverityBadge";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import ForecastChart from "../components/charts/ForecastChart";
import type { GapRow } from "../types";
import type { Column } from "../components/ui/DataTable";
import { ArrowLeft } from "lucide-react";

export default function DistrictDrilldown() {
  const { districtId } = useParams<{ districtId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const district = mockDistricts.find((d) => d.id === districtId);
  const rows = mockGapRows.filter((r) => r.districtId === districtId);

  if (!district) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 16, color: "var(--color-text-secondary)", marginBottom: 16 }}>District not found in demo dataset.</div>
      <button onClick={() => navigate("/overview")} style={{ background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>Back to Overview</button>
    </div>
  );

  const cols: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade"), sortable: true },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    { key: "gap", header: t("table.gap"), sortable: true, align: "right", render: (r) => <span style={{ fontWeight: 700, color: r.gap > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>{r.gap.toLocaleString("en-IN")}</span> },
    { key: "gapPercent", header: t("table.gapPct"), sortable: true, align: "right", render: (r) => <span style={{ fontWeight: 700, color: r.gapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>{r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%</span> },
    { key: "severity", header: t("table.severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "nsqfLevel", header: "NSQF", align: "center", render: (r) => `L${r.nsqfLevel}` },
  ];

  const totalDemand = rows.reduce((a, r) => a + r.demand, 0);
  const totalSupply = rows.reduce((a, r) => a + r.supply, 0);
  const totalGap = rows.reduce((a, r) => a + r.gap, 0);
  const criticalShortage = rows.filter((r) => r.severity === "Critical Shortage").length;

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => navigate(`/state/${district.stateId}`)} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid var(--color-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}>
              <ArrowLeft size={13} /> {district.stateName}
            </button>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{district.name}, {district.stateName}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            {district.isAspirational && <span style={{ background: "#e8601c", color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 3, fontWeight: 700 }}>ASPIRATIONAL DISTRICT</span>}
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{rows.length} trade-sector combinations</span>
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

        <ChartCard title="Demand-Supply Forecast" subtitle="Sample: Solar Panel Installation Technician (NCO 7412.0200)" ariaLabel="Trade forecast chart" info="Forecast uses SARIMA-XGBoost ensemble. Confidence bands at 80%.">
          <ForecastChart data={mockForecast} />
        </ChartCard>

        <div style={{ marginTop: 16 }}>
          <ChartCard title={`Trade Breakdown — ${district.name}`} ariaLabel="District trade gap table">
            {rows.length > 0
              ? <DataTable columns={cols} data={rows} pageSize={10} ariaLabel="District trade gaps" />
              : <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>No trade data for this district in demo. Try Jodhpur (RJ-JOD), Lucknow (UP-LKO), or Pune (MH-PUN).</div>
            }
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

