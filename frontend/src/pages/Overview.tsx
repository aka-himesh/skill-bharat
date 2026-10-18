import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { mockSummary, mockGapRows, mockStateMapData, mockForecast } from "../mocks/data";
import { useFilters } from "../context/FilterContext";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import SeverityBadge from "../components/ui/SeverityBadge";
import DataTable from "../components/ui/DataTable";
import TrendAreaChart from "../components/charts/TrendAreaChart";
import SectorBarChart from "../components/charts/SectorBarChart";
import type { GapRow, StateMapData } from "../types";
import type { Column } from "../components/ui/DataTable";

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px",
};

export default function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filters } = useFilters();
  const s = mockSummary;

  // Apply filters to gap rows
  const filtered = mockGapRows.filter((r) => {
    if (filters.stateId && r.stateId !== filters.stateId) return false;
    if (filters.districtId && r.districtId !== filters.districtId) return false;
    if (filters.sectorId && r.sectorName !== filters.sectorId) return false;
    return true;
  });

  const gapColumns: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade"), sortable: true, width: "200px" },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "stateName", header: t("table.state"), sortable: true },
    { key: "districtName", header: t("table.district"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    { key: "gapPercent", header: t("table.gapPct"), sortable: true, align: "right", render: (r) => <span style={{ color: r.gapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-critical-oversupply)", fontWeight: 700 }}>{r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%</span> },
    { key: "severity", header: t("table.severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "nsqfLevel", header: t("table.nsqf"), align: "center", render: (r) => `L${r.nsqfLevel}` },
  ];

  const stateColumns: Column<StateMapData>[] = [
    { key: "stateName", header: "State", sortable: true },
    { key: "totalDemand", header: "Demand", sortable: true, align: "right", render: (r) => r.totalDemand.toLocaleString("en-IN") },
    { key: "totalSupply", header: "Supply", sortable: true, align: "right", render: (r) => r.totalSupply.toLocaleString("en-IN") },
    { key: "gapScore", header: "Gap Score", sortable: true, align: "right", render: (r) => <span style={{ color: r.gapScore > 0 ? "var(--color-critical-shortage)" : "var(--color-critical-oversupply)", fontWeight: 700 }}>{r.gapScore > 0 ? "+" : ""}{r.gapScore}</span> },
    { key: "severity", header: "Severity", render: (r) => <SeverityBadge severity={r.severity} /> },
  ];

  return (
    <div>
      {/* Page title bar */}
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={PAGE_STYLE}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{t("overview.title")}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{t("overview.subtitle")}</p>
        </div>
      </div>

      <div style={PAGE_STYLE}>
        {/* KPI row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <KpiTile label={t("kpi.totalDemand")} value={s.totalDemand} color="primary" size="lg" />
          <KpiTile label={t("kpi.totalSupply")} value={s.totalSupply} color="green" size="lg" />
          <KpiTile label={t("kpi.totalGap")} value={s.totalGap} subtext={`${s.gapPercent}% of demand`} color="orange" size="lg" />
          <KpiTile label={t("kpi.criticalShortages")} value={s.criticalShortages} subtext="trades in critical shortage" color="red" size="lg" />
          <KpiTile label={t("kpi.criticalOversupply")} value={s.criticalOversupply} subtext="trades in critical oversupply" color="purple" size="lg" />
          <KpiTile label={t("kpi.statesCovered")} value={`${s.statesCovered} / 28`} subtext="states + UTs" color="blue" size="lg" />
        </div>

        {/* State heat table + Trend */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="State-wise Skill Gap Score" subtitle="Click a state to drill down" ariaLabel="State skill gap table">
            <DataTable
              columns={stateColumns}
              data={mockStateMapData}
              pageSize={8}
              onRowClick={(r) => navigate(`/state/${r.stateId}`)}
              ariaLabel="State skill gap scores"
            />
          </ChartCard>

          <ChartCard title="National Demand vs Supply Trend" subtitle="FY-18-19 to FY-24-25 (historical)" ariaLabel="National demand supply trend chart">
            <TrendAreaChart data={mockForecast.history} title="National Demand vs Supply" />
          </ChartCard>
        </div>

        {/* Sector chart + Gap table */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="Demand vs Supply by Sector" subtitle="Top 10 sectors — current FY" ariaLabel="Sector demand supply bar chart">
            <SectorBarChart />
          </ChartCard>

          <ChartCard title="Top Skill Gaps — All Trades" subtitle={`${filtered.length} trade-district combinations`} ariaLabel="Skill gaps data table">
            <DataTable
              columns={gapColumns}
              data={filtered}
              pageSize={5}
              onRowClick={(r) => navigate(`/district/${r.districtId}`)}
              ariaLabel="Skill gap table"
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

