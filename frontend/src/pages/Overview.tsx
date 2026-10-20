import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSummary, useGaps, useStates, useSectors } from "../hooks/useApi";
import { mockForecast } from "../mocks/data";
import { useFilters } from "../context/FilterContext";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import SeverityBadge from "../components/ui/SeverityBadge";
import DataTable from "../components/ui/DataTable";
import TrendAreaChart from "../components/charts/TrendAreaChart";
import SectorBarChart from "../components/charts/SectorBarChart";
import NewsHighlights from "../components/ui/NewsHighlights";
import EshramPanel from "../components/ui/EshramPanel";
import type { GapRow, StateMapData } from "../types";
import type { Column } from "../components/ui/DataTable";
import { RotateCcw } from "lucide-react";

const PAGE_STYLE: React.CSSProperties = {
  maxWidth: "var(--container-max, 1280px)",
  margin: "0 auto",
  padding: "20px 24px",
};

export default function Overview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filters, clearFilters } = useFilters();
  const { isLoggedIn } = useAuth();

  const numStateId = filters.stateId && /^\d+$/.test(filters.stateId) ? Number(filters.stateId) : undefined;
  const numDistrictId = filters.districtId && /^\d+$/.test(filters.districtId) ? Number(filters.districtId) : undefined;
  const numSectorId = filters.sectorId && /^\d+$/.test(filters.sectorId) ? Number(filters.sectorId) : undefined;
  const nsqfNum = filters.nsqfLevel ? Number(filters.nsqfLevel) : undefined;

  // Real-time summary counts dynamically filtered by state/district/sector
  const { data: summaryData, isLoading: summaryLoading } = useSummary(
    { state_id: numStateId, district_id: numDistrictId, sector_id: numSectorId },
    true
  );

  const { data: statesData = [] } = useStates(true);
  const { data: sectorsData = [] } = useSectors(true);

  // Derive the query level for backend
  const gapLevel = filters.districtId ? "district" : filters.stateId ? "state" : "national";
  const horizonYears = filters.horizon ? parseInt(filters.horizon) : undefined;
  const horizonMonths = horizonYears ? horizonYears * 12 : undefined;

  const { data: gapsData, isLoading: gapsLoading } = useGaps(
    {
      level: gapLevel,
      state_id: numStateId,
      district_id: numDistrictId,
      sector_id: numSectorId,
      nsqf_level: nsqfNum,
      is_aspirational: filters.isAspirational,
      horizon: horizonMonths,
    },
    true
  );

  const s = summaryData;

  // Selected names for headers/labels
  const selectedState = statesData.find(
    (st) => String(st.id) === filters.stateId || st.code.toLowerCase() === (filters.stateId ?? "").toLowerCase()
  );
  const selectedSector = sectorsData.find(
    (sc) => String(sc.id) === filters.sectorId || sc.code.toLowerCase() === (filters.sectorId ?? "").toLowerCase()
  );
  const isFiltered = Boolean(
    filters.stateId || filters.districtId || filters.sectorId || filters.nsqfLevel || filters.horizon || filters.isAspirational || filters.q
  );

  // ── Map backend gaps to display format ──
  let gapRows: GapRow[] = (gapsData?.gaps ?? []).map((g, i) => ({
    id: String(i),
    ncoCode: g.nco_code,
    tradeName: g.occupation_name,
    sectorName: g.sector_name ?? "General",
    stateId: String(g.state_id ?? g.district_id),
    stateName: g.state_name,
    districtId: String(g.district_id),
    districtName: g.district_name,
    demand: Math.round(g.forecast_demand),
    supply: Math.round(g.forecast_supply),
    gap: Math.round(g.forecast_demand - g.forecast_supply),
    gapPercent: g.gap_pct,
    severity: (g.gap_band as GapRow["severity"]) ?? "Balanced",
    nsqfLevel: g.nsqf_level ?? 0,
    isAspirational: Boolean(g.is_aspirational),
  }));

  // Client-side search keyword filter
  if (filters.q) {
    const kw = filters.q.toLowerCase().trim();
    gapRows = gapRows.filter(
      (r) =>
        r.tradeName.toLowerCase().includes(kw) ||
        r.ncoCode.toLowerCase().includes(kw) ||
        r.districtName.toLowerCase().includes(kw) ||
        r.sectorName.toLowerCase().includes(kw)
    );
  }

  // Client-side fallback filter for NSQF if not done by backend
  if (nsqfNum !== undefined && gapRows.some((r) => r.nsqfLevel > 0)) {
    gapRows = gapRows.filter((r) => r.nsqfLevel === nsqfNum);
  }

  // Client-side fallback filter for Aspirational if not done by backend
  if (filters.isAspirational === true) {
    gapRows = gapRows.filter((r) => r.isAspirational);
  }

  // ── Pilot States table — filter to selected state if one is chosen ──
  let stateTableData: StateMapData[] = statesData.map((st) => ({
    stateId: String(st.id),
    stateName: st.name,
    gapScore: 0,
    severity: "Balanced" as const,
    totalDemand: 0,
    totalSupply: 0,
  }));

  // When a specific state is selected, filter to that state
  if (filters.stateId) {
    stateTableData = stateTableData.filter(
      (st) =>
        st.stateId === filters.stateId ||
        st.stateName.toLowerCase() === (selectedState?.name ?? "").toLowerCase()
    );
  }

  // Compute aggregates from gap data
  const gapsByState: Record<string, { demand: number; supply: number; gaps: number; severity: string }> = {};
  for (const g of gapsData?.gaps ?? []) {
    const key = g.state_name;
    if (!gapsByState[key]) gapsByState[key] = { demand: 0, supply: 0, gaps: 0, severity: "Balanced" };
    gapsByState[key].demand += g.forecast_demand;
    gapsByState[key].supply += g.forecast_supply;
    gapsByState[key].gaps += 1;
    if (g.gap_band === "Critical Shortage" || g.gap_band === "Shortage") {
      gapsByState[key].severity = g.gap_band;
    }
  }

  stateTableData = stateTableData.map((st) => {
    const agg = gapsByState[st.stateName];
    if (agg) {
      return {
        ...st,
        totalDemand: Math.round(agg.demand),
        totalSupply: Math.round(agg.supply),
        gapScore: Math.round(agg.demand - agg.supply),
        severity: (agg.severity as StateMapData["severity"]) ?? "Balanced",
      };
    }
    return st;
  });

  const gapColumns: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade", "Trade / Occupation"), sortable: true, width: "180px" },
    { key: "ncoCode", header: "NCO Code", sortable: true, width: "100px" },
    { key: "sectorName", header: t("table.sector", "Sector"), sortable: true },
    { key: "stateName", header: t("table.state", "State"), sortable: true },
    {
      key: "districtName",
      header: t("table.district", "District"),
      sortable: true,
      render: (r) => (
        <span>
          {r.districtName}
          {r.isAspirational && (
            <span style={{ marginLeft: 4, color: "#d97706", fontSize: 10, fontWeight: 700 }}>★</span>
          )}
        </span>
      ),
    },
    { key: "demand", header: t("table.demand", "Demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply", "Supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    {
      key: "gapPercent",
      header: t("table.gapPct", "Gap %"),
      sortable: true,
      align: "right",
      render: (r) => (
        <span
          style={{
            color: r.gapPercent > 0 ? "var(--color-critical-shortage, #dc2626)" : "var(--color-oversupply, #7c3aed)",
            fontWeight: 700,
          }}
        >
          {r.gapPercent > 0 ? "+" : ""}
          {r.gapPercent.toFixed(1)}%
        </span>
      ),
    },
    { key: "severity", header: t("table.severity", "Severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
  ];

  const stateColumns: Column<StateMapData>[] = [
    { key: "stateName", header: "State", sortable: true },
    { key: "totalDemand", header: "Demand", sortable: true, align: "right", render: (r) => r.totalDemand.toLocaleString("en-IN") },
    { key: "totalSupply", header: "Supply", sortable: true, align: "right", render: (r) => r.totalSupply.toLocaleString("en-IN") },
    {
      key: "gapScore",
      header: "Net Gap",
      sortable: true,
      align: "right",
      render: (r) => (
        <span
          style={{
            color: r.gapScore > 0 ? "var(--color-critical-shortage, #dc2626)" : "var(--color-oversupply, #7c3aed)",
            fontWeight: 700,
          }}
        >
          {r.gapScore > 0 ? "+" : ""}
          {r.gapScore.toLocaleString("en-IN")}
        </span>
      ),
    },
    { key: "severity", header: "Status", render: (r) => <SeverityBadge severity={r.severity} /> },
  ];

  // ── Filter scope label shown in page header ──
  const scopeParts: string[] = [];
  if (selectedState) scopeParts.push(selectedState.name);
  if (filters.districtId) scopeParts.push(`District ID: ${filters.districtId}`);
  if (selectedSector) scopeParts.push(`${selectedSector.name} Sector`);
  if (filters.nsqfLevel) scopeParts.push(`NSQF Level ${filters.nsqfLevel}`);
  if (filters.horizon) scopeParts.push(`${filters.horizon} horizon`);
  if (filters.isAspirational) scopeParts.push("★ Aspirational");
  if (filters.q) scopeParts.push(`"${filters.q}"`);
  const scopeLabel = scopeParts.length > 0 ? scopeParts.join(" · ") : null;

  return (
    <div>
      {/* Page Title Bar */}
      <div style={{ background: "var(--color-surface, #ffffff)", borderBottom: "1px solid var(--color-border, #e2e8f0)", padding: "14px 0" }}>
        <div style={PAGE_STYLE}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary, #0f2447)", margin: 0 }}>
              {t("overview.title", "Labour Market Intelligence Dashboard")}
            </h1>
            {scopeLabel && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#0f2447",
                  background: "#e0f2fe",
                  border: "1px solid #7dd3fc",
                  borderRadius: 20,
                  padding: "2px 10px",
                }}
              >
                Scope: {scopeLabel}
              </span>
            )}
            <span style={{ marginLeft: "auto", color: "#138808", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              ● LIVE DATA
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary, #64748b)", margin: "4px 0 0" }}>
            {isFiltered
              ? `Filtered view active — ${gapRows.length} skill gap record(s) matching selected filter criteria`
              : t("overview.subtitle", "National summary of workforce supply-demand alignment across key pilot states")}
          </p>
        </div>
      </div>

      <div style={PAGE_STYLE}>
        {/* Dynamic KPI Tiles */}
        {summaryLoading && (
          <div style={{ padding: 12, textAlign: "center", color: "var(--color-text-muted, #94a3b8)", fontSize: 12 }}>
            Loading updated indicators…
          </div>
        )}
        {s && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <KpiTile
              label={filters.stateId ? "Selected State" : "Pilot States"}
              value={filters.stateId ? 1 : s.states}
              color="primary"
              size="lg"
            />
            <KpiTile
              label="Districts"
              value={s.districts}
              subtext={filters.stateId ? "in selected state" : "across pilot states"}
              color="green"
              size="lg"
            />
            <KpiTile
              label="Sectors"
              value={filters.sectorId ? 1 : s.sectors}
              color="blue"
              size="lg"
            />
            <KpiTile
              label="Occupations"
              value={s.occupations}
              color="orange"
              size="lg"
            />
            <KpiTile
              label="Critical Shortages"
              value={s.critical_shortage_count}
              subtext="district-trade pairs"
              color="red"
              size="lg"
            />
            <KpiTile
              label="Open Early Alerts"
              value={s.open_alerts}
              subtext="unacknowledged flags"
              color="orange"
              size="lg"
            />
          </div>
        )}

        {/* State table + Trend Chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard
            title={filters.stateId ? `Pilot State: ${selectedState?.name ?? "Selected State"}` : "Pilot States Overview"}
            subtitle={
              filters.stateId
                ? "State-level demand and supply aggregates — click row to drill down"
                : "4 pilot states covered under SIH prototype — click any row for district drill-down"
            }
            ariaLabel="State list table"
          >
            {stateTableData.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                No pilot state matches this filter.
              </div>
            ) : (
              <DataTable
                columns={stateColumns}
                data={stateTableData}
                pageSize={6}
                onRowClick={(r) => navigate(`/state/${r.stateId}`)}
                ariaLabel="State skill gap scores"
              />
            )}
          </ChartCard>

          <ChartCard
            title="Demand vs Supply Trend"
            subtitle="Multi-source forecasting (FY18-19 to FY24-25)"
            ariaLabel="National demand supply trend chart"
          >
            <TrendAreaChart data={mockForecast.history} title="Demand vs Supply Projection" />
          </ChartCard>
        </div>

        {/* Sector Bar Chart + Filtered Gaps Table */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard
            title="Demand vs Supply by Sector"
            subtitle="Top industrial sectors in selected scope"
            ariaLabel="Sector demand supply bar chart"
          >
            <SectorBarChart />
          </ChartCard>

          <ChartCard
            title={isFiltered ? `Filtered Skill Gaps (${gapRows.length})` : "Top Skill Gaps — All Trades"}
            subtitle={
              gapsLoading
                ? "Fetching latest gap scores…"
                : `${gapRows.length} district-trade pairs matching current filters`
            }
            ariaLabel="Skill gaps data table"
          >
            {gapsLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                Loading gap data…
              </div>
            ) : gapRows.length === 0 ? (
              <div
                style={{
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                  No Skill Gap Records Match the Selected Filters
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 16 }}>
                  Try relaxing your state, district, sector, or NSQF level filter.
                </div>
                <button
                  onClick={clearFilters}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: "#0f2447",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} /> Reset All Filters
                </button>
              </div>
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

        {/* Live News + e-Shram Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>
          <NewsHighlights variant="card" limit={5} />
          <EshramPanel />
        </div>
      </div>
    </div>
  );
}
