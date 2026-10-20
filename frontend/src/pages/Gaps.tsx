import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGaps, useRanking } from "../hooks/useApi";
import { useFilters } from "../context/FilterContext";
import { downloadAuthenticatedCsv, getGapsExportCsvUrl } from "../services/api";
import DataTable from "../components/ui/DataTable";
import SeverityBadge from "../components/ui/SeverityBadge";
import ChartCard from "../components/ui/ChartCard";
import GapBarChart from "../components/charts/GapBarChart";
import type { GapRow, RankingRow, SeverityBand } from "../types";
import type { Column } from "../components/ui/DataTable";
import { Download, TrendingUp, TrendingDown, Minus, RotateCcw } from "lucide-react";

const TABS = ["shortage_tab", "oversupply_tab"] as const;

const TrendIcon = ({ trend }: { trend: "rising" | "stable" | "falling" }) => {
  if (trend === "rising") return <TrendingUp size={13} color="var(--color-critical-shortage, #dc2626)" />;
  if (trend === "falling") return <TrendingDown size={13} color="var(--color-oversupply, #7c3aed)" />;
  return <Minus size={13} color="var(--color-text-muted, #94a3b8)" />;
};

export default function Gaps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filters, clearFilters } = useFilters();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("shortage_tab");

  const numStateId = filters.stateId && /^\d+$/.test(filters.stateId) ? Number(filters.stateId) : undefined;
  const numDistrictId = filters.districtId && /^\d+$/.test(filters.districtId) ? Number(filters.districtId) : undefined;
  const numSectorId = filters.sectorId && /^\d+$/.test(filters.sectorId) ? Number(filters.sectorId) : undefined;
  const nsqfNum = filters.nsqfLevel ? Number(filters.nsqfLevel) : undefined;

  // Derive query level so the backend WHERE clause filters correctly
  const gapLevel = filters.districtId ? "district" : filters.stateId ? "state" : "national";
  const horizonYears = filters.horizon ? parseInt(filters.horizon) : undefined;
  const horizonMonths = horizonYears ? horizonYears * 12 : undefined;

  const { data: gapsData, isLoading: gapsLoading } = useGaps({
    level: gapLevel,
    state_id: numStateId,
    district_id: numDistrictId,
    sector_id: numSectorId,
    nsqf_level: nsqfNum,
    is_aspirational: filters.isAspirational,
    horizon: horizonMonths,
  }, true);

  const rankType = activeTab === "shortage_tab" ? "shortage" : "oversupply";
  const { data: rankingData } = useRanking({
    type: rankType,
    limit: 20,
    state_id: numStateId,
    district_id: numDistrictId,
    sector_id: numSectorId,
  }, true);

  const shortage: SeverityBand[] = ["Critical Shortage", "Shortage"];
  const oversupply: SeverityBand[] = ["Critical Oversupply", "Oversupply"];

  // Map backend gaps to UI format
  const allRows: GapRow[] = (gapsData?.gaps ?? []).map((g, i) => ({
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
    severity: (g.gap_band as SeverityBand) ?? "Balanced",
    nsqfLevel: g.nsqf_level ?? 0,
    isAspirational: Boolean(g.is_aspirational),
  }));

  // Client-side filter
  const tabData = allRows.filter((r) => {
    const inTab =
      activeTab === "shortage_tab"
        ? shortage.includes(r.severity)
        : oversupply.includes(r.severity);
    if (!inTab) return false;

    // NSQF filter
    if (nsqfNum !== undefined && r.nsqfLevel > 0 && r.nsqfLevel !== nsqfNum) {
      return false;
    }

    // Aspirational filter
    if (filters.isAspirational === true && !r.isAspirational) {
      return false;
    }

    // Search keyword filter
    if (filters.q) {
      const kw = filters.q.toLowerCase().trim();
      const match =
        r.tradeName.toLowerCase().includes(kw) ||
        r.ncoCode.toLowerCase().includes(kw) ||
        r.districtName.toLowerCase().includes(kw) ||
        r.sectorName.toLowerCase().includes(kw);
      if (!match) return false;
    }

    return true;
  });

  // Map ranking data
  const rankData: RankingRow[] = (rankingData?.ranking ?? []).map((r, i) => ({
    rank: i + 1,
    tradeName: r.occupation_name,
    ncoCode: r.nco_code,
    sectorName: r.sector_name ?? "General",
    stateCount: 1,
    avgGapPercent: r.avg_gap_pct,
    severity: (r.gap_band as SeverityBand) ?? "Balanced",
    trend: "stable" as const,
  }));

  const gapCols: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade", "Trade / Occupation"), sortable: true, width: "180px" },
    { key: "ncoCode", header: "NCO Code", sortable: true, width: "90px" },
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
      key: "gap",
      header: t("table.gap", "Gap"),
      sortable: true,
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.gap > 0 ? "var(--color-critical-shortage, #dc2626)" : "var(--color-oversupply, #7c3aed)" }}>
          {r.gap > 0 ? "+" : ""}{r.gap.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "gapPercent",
      header: t("table.gapPct", "Gap %"),
      sortable: true,
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.gapPercent > 0 ? "var(--color-critical-shortage, #dc2626)" : "var(--color-oversupply, #7c3aed)" }}>
          {r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%
        </span>
      ),
    },
    { key: "severity", header: t("table.severity", "Severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
  ];

  const rankCols: Column<RankingRow>[] = [
    { key: "rank", header: "#", width: "40px", render: (r) => <span style={{ fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>{r.rank}</span> },
    { key: "tradeName", header: t("table.trade", "Trade"), sortable: true },
    { key: "sectorName", header: t("table.sector", "Sector"), sortable: true },
    {
      key: "avgGapPercent",
      header: t("table.avgGapPct", "Avg Gap %"),
      sortable: true,
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, color: r.avgGapPercent > 0 ? "var(--color-critical-shortage, #dc2626)" : "var(--color-oversupply, #7c3aed)" }}>
          {r.avgGapPercent > 0 ? "+" : ""}{r.avgGapPercent.toFixed(1)}%
        </span>
      ),
    },
    { key: "severity", header: t("table.severity", "Severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "trend", header: "Trend", width: "50px", align: "center", render: (r) => <TrendIcon trend={r.trend} /> },
  ];

  const handleExport = async () => {
    try {
      const url = getGapsExportCsvUrl({
        state_id: numStateId,
        district_id: numDistrictId,
        sector_id: numSectorId,
      });
      await downloadAuthenticatedCsv(url, "gap_analysis.csv");
    } catch {
      // Fallback: client-side CSV
      const headers = ["Trade", "NCO", "Sector", "State", "District", "Demand", "Supply", "Gap", "Gap%", "Severity"];
      const csv = [
        headers.join(","),
        ...tabData.map((r) => [
          `"${r.tradeName}"`,
          r.ncoCode,
          `"${r.sectorName}"`,
          `"${r.stateName}"`,
          `"${r.districtName}"`,
          r.demand,
          r.supply,
          r.gap,
          r.gapPercent,
          r.severity,
        ].join(","))
      ].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "skill-gaps.csv";
      a.click();
    }
  };

  return (
    <div>
      <div style={{ background: "var(--color-surface, #ffffff)", borderBottom: "1px solid var(--color-border, #e2e8f0)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max, 1280px)", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary, #0f2447)", margin: 0 }}>
              {t("gaps.title", "Workforce Demand-Supply Gap Analysis")}
            </h1>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary, #64748b)", margin: "4px 0 0" }}>
              Ranked by gap severity across pilot states, districts and NCO-2015 trades
            </p>
          </div>
          <button
            onClick={handleExport}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#0f2447",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Download size={13} /> {t("common.exportCsv", "Export CSV")}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max, 1280px)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Shortage vs Oversupply Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border, #e2e8f0)", marginBottom: 16 }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? "#0f2447" : "var(--color-text-secondary, #64748b)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderBottom: activeTab === tab ? "2px solid #0f2447" : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              {tab === "shortage_tab" ? "Critical Shortages" : "Oversupply / Saturation"}
            </button>
          ))}
        </div>

        {gapsLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted, #94a3b8)", fontSize: 12 }}>
            Loading gap data…
          </div>
        ) : tabData.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "6px",
              border: "1px dashed #cbd5e1",
              margin: "20px 0",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
              No Trade Records Match the Applied Filters
            </div>
            <div style={{ fontSize: 12, color: "#64748b", maxWidth: 440, margin: "0 auto 16px" }}>
              Currently viewing {activeTab === "shortage_tab" ? "Shortages" : "Oversupply"}. Try adjusting your State, District, Sector or NSQF level filter.
            </div>
            <button
              onClick={clearFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                background: "#0f2447",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={13} /> Reset All Filters
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 16 }}>
              <ChartCard
                title="Priority Ranking"
                subtitle={`${rankData.length} trades prioritized by severity`}
                ariaLabel="Trade ranking table"
              >
                <DataTable columns={rankCols} data={rankData} pageSize={8} ariaLabel="Trade ranking" />
              </ChartCard>

              <ChartCard
                title="Gap Magnitude (%)"
                subtitle="Top 10 trades by absolute gap percentage"
                ariaLabel="Gap bar chart"
              >
                <GapBarChart data={tabData} />
              </ChartCard>
            </div>

            <ChartCard
              title="Workforce Gap Records"
              subtitle={`${tabData.length} district-trade combinations in scope`}
              ariaLabel="Full gap data table"
              onDownload={handleExport}
            >
              <DataTable
                columns={gapCols}
                data={tabData}
                pageSize={10}
                stickyHeader
                onRowClick={(r) => navigate(`/district/${r.districtId}`)}
                ariaLabel="Skill gap full table"
              />
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}
