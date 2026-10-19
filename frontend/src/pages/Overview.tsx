import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSummary, useGaps, useStates } from "../hooks/useApi";
import { mockSummary, mockGapRows, mockStateMapData, mockForecast } from "../mocks/data";
import { useFilters } from "../context/FilterContext";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import SeverityBadge from "../components/ui/SeverityBadge";
import DataTable from "../components/ui/DataTable";
import TrendAreaChart from "../components/charts/TrendAreaChart";
import SectorBarChart from "../components/charts/SectorBarChart";
import NewsHighlights from "../components/ui/NewsHighlights";
import EshramPanel from "../components/ui/EshramPanel";
import LoginPage from "./LoginPage";
import type { GapRow, StateMapData } from "../types";
import type { Column } from "../components/ui/DataTable";

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px",
};

export default function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filters } = useFilters();
  const { isLoggedIn } = useAuth();

  // If not logged in, show login
  if (!isLoggedIn) return <LoginPage />;

  const { data: summaryData, isLoading: summaryLoading } = useSummary(isLoggedIn);
  const { data: gapsData, isLoading: gapsLoading } = useGaps({
    state_id: filters.stateId ? Number(filters.stateId) : undefined,
    district_id: filters.districtId ? Number(filters.districtId) : undefined,
    sector_id: filters.sectorId ? Number(filters.sectorId) : undefined,
  }, isLoggedIn);
  const { data: statesData } = useStates(isLoggedIn);

  const s = summaryData;

  // Map backend gaps to display format
  const gapRows: GapRow[] = (gapsData?.gaps ?? []).map((g, i) => ({
    id: String(i),
    ncoCode: g.nco_code,
    tradeName: g.occupation_name,
    sectorName: g.sector_name ?? "—",
    stateId: String(g.district_id), // used for filtering
    stateName: g.state_name,
    districtId: String(g.district_id),
    districtName: g.district_name,
    demand: g.forecast_demand,
    supply: g.forecast_supply,
    gap: g.forecast_demand - g.forecast_supply,
    gapPercent: g.gap_pct,
    severity: g.gap_band as GapRow["severity"],
    nsqfLevel: 0,
    isAspirational: false,
  }));

  // Map states for table
  const stateTableData: StateMapData[] = (statesData ?? []).map((st) => ({
    stateId: String(st.id),
    stateName: st.name,
    gapScore: 0,
    severity: "Balanced" as const,
    totalDemand: 0,
    totalSupply: 0,
  }));

  const gapColumns: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade"), sortable: true, width: "200px" },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "stateName", header: t("table.state"), sortable: true },
    { key: "districtName", header: t("table.district"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    { key: "gapPercent", header: t("table.gapPct"), sortable: true, align: "right", render: (r) => <span style={{ color: r.gapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-critical-oversupply)", fontWeight: 700 }}>{r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%</span> },
    { key: "severity", header: t("table.severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
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
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {t("overview.subtitle")}
            {s && <span style={{ marginLeft: 8, color: "#138808", fontSize: 10, fontWeight: 700 }}>● LIVE DATA</span>}
          </p>
        </div>
      </div>

      <div style={PAGE_STYLE}>
        {/* KPI row */}
        {summaryLoading && <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading summary…</div>}
        {s && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <KpiTile label="Pilot States" value={s.states} color="primary" size="lg" />
            <KpiTile label="Districts" value={s.districts} color="green" size="lg" />
            <KpiTile label="Sectors" value={s.sectors} color="blue" size="lg" />
            <KpiTile label="Occupations" value={s.occupations} color="orange" size="lg" />
            <KpiTile label="Critical Shortages" value={s.critical_shortage_count} subtext="district-occupation pairs" color="red" size="lg" />
            <KpiTile label="Open Alerts" value={s.open_alerts} subtext="unacknowledged" color="orange" size="lg" />
          </div>
        )}

        {/* State table + Trend */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="Pilot States" subtitle="Click a state to drill down" ariaLabel="State list table">
            <DataTable
              columns={stateColumns}
              data={stateTableData.length > 0 ? stateTableData : mockStateMapData}
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

          <ChartCard title="Top Skill Gaps — All Trades" subtitle={gapsLoading ? "Loading…" : `${gapRows.length} trade-district combinations`} ariaLabel="Skill gaps data table">
            {gapsLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading gap data…</div>
            ) : (
              <DataTable
                columns={gapColumns}
                data={gapRows}
                pageSize={5}
                onRowClick={(r) => navigate(`/district/${r.districtId}`)}
                ariaLabel="Skill gap table"
              />
            )}
          </ChartCard>
        </div>

        {/* News + e-Shram row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>
          <NewsHighlights variant="card" limit={5} />
          <EshramPanel />
        </div>
      </div>
    </div>
  );
}

