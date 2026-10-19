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
import LoginPage from "./LoginPage";
import type { GapRow, RankingRow, SeverityBand } from "../types";
import type { Column } from "../components/ui/DataTable";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";

const TABS = ["shortage_tab", "oversupply_tab"] as const;

const TrendIcon = ({ trend }: { trend: "rising" | "stable" | "falling" }) => {
  if (trend === "rising") return <TrendingUp size={13} color="var(--color-critical-shortage)" />;
  if (trend === "falling") return <TrendingDown size={13} color="var(--color-oversupply)" />;
  return <Minus size={13} color="var(--color-text-muted)" />;
};

export default function Gaps() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filters } = useFilters();
  const { isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("shortage_tab");

  if (!isLoggedIn) return <LoginPage />;

  const { data: gapsData, isLoading: gapsLoading } = useGaps({
    state_id: filters.stateId ? Number(filters.stateId) : undefined,
    district_id: filters.districtId ? Number(filters.districtId) : undefined,
    sector_id: filters.sectorId ? Number(filters.sectorId) : undefined,
  }, isLoggedIn);

  const rankType = activeTab === "shortage_tab" ? "shortage" : "oversupply";
  const { data: rankingData } = useRanking({
    type: rankType,
    limit: 20,
    state_id: filters.stateId ? Number(filters.stateId) : undefined,
  }, isLoggedIn);

  const shortage: SeverityBand[] = ["Critical Shortage", "Shortage"];
  const oversupply: SeverityBand[] = ["Critical Oversupply", "Oversupply"];

  // Map backend gaps to UI format
  const allRows: GapRow[] = (gapsData?.gaps ?? []).map((g, i) => ({
    id: String(i),
    ncoCode: g.nco_code,
    tradeName: g.occupation_name,
    sectorName: g.sector_name ?? "—",
    stateId: String(g.district_id),
    stateName: g.state_name,
    districtId: String(g.district_id),
    districtName: g.district_name,
    demand: g.forecast_demand,
    supply: g.forecast_supply,
    gap: g.forecast_demand - g.forecast_supply,
    gapPercent: g.gap_pct,
    severity: g.gap_band as SeverityBand,
    nsqfLevel: 0,
    isAspirational: false,
  }));

  const tabData = allRows.filter((r) =>
    activeTab === "shortage_tab"
      ? shortage.includes(r.severity)
      : oversupply.includes(r.severity)
  );

  // Map ranking data
  const rankData: RankingRow[] = (rankingData?.ranking ?? []).map((r, i) => ({
    rank: i + 1,
    tradeName: r.occupation_name,
    ncoCode: r.nco_code,
    sectorName: r.sector_name ?? "—",
    stateCount: 1,
    avgGapPercent: r.avg_gap_pct,
    severity: r.gap_band as SeverityBand,
    trend: "stable" as const,
  }));

  const gapCols: Column<GapRow>[] = [
    { key: "tradeName", header: t("table.trade"), sortable: true, width: "180px" },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "stateName", header: t("table.state"), sortable: true },
    { key: "districtName", header: t("table.district"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    { key: "gap", header: t("table.gap"), sortable: true, align: "right", render: (r) => <span style={{ fontWeight: 700, color: r.gap > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>{r.gap > 0 ? "+" : ""}{r.gap.toLocaleString("en-IN")}</span> },
    { key: "gapPercent", header: t("table.gapPct"), sortable: true, align: "right", render: (r) => <span style={{ fontWeight: 700, color: r.gapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>{r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%</span> },
    { key: "severity", header: t("table.severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "isAspirational", header: "Asp.", align: "center", render: (r) => r.isAspirational ? <span style={{ color: "var(--color-accent)", fontWeight: 700, fontSize: 10 }}>●</span> : null },
  ];

  const rankCols: Column<RankingRow>[] = [
    { key: "rank", header: "#", align: "center", width: "40px" },
    { key: "tradeName", header: t("table.trade"), sortable: true },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "avgGapPercent", header: "Avg Gap %", sortable: true, align: "right", render: (r) => <span style={{ fontWeight: 700, color: r.avgGapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>{r.avgGapPercent > 0 ? "+" : ""}{Math.abs(r.avgGapPercent).toFixed(1)}%</span> },
    { key: "severity", header: "Severity", render: (r) => <SeverityBadge severity={r.severity} /> },
    { key: "trend", header: "Trend", align: "center", render: (r) => <TrendIcon trend={r.trend} /> },
  ];

  const handleExport = async () => {
    try {
      const url = getGapsExportCsvUrl({
        state_id: filters.stateId ? Number(filters.stateId) : undefined,
        district_id: filters.districtId ? Number(filters.districtId) : undefined,
        sector_id: filters.sectorId ? Number(filters.sectorId) : undefined,
      });
      await downloadAuthenticatedCsv(url, "gap_analysis.csv");
    } catch {
      // Fallback: client-side CSV
      const headers = ["Trade", "Sector", "State", "District", "Demand", "Supply", "Gap", "Gap%", "Severity"];
      const csv = [headers.join(","), ...tabData.map((r) => [r.tradeName, r.sectorName, r.stateName, r.districtName, r.demand, r.supply, r.gap, r.gapPercent, r.severity].join(","))].join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "skill-gaps.csv"; a.click();
    }
  };

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{t("gaps.title")}</h1>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Ranked by gap severity across all states, districts and trades</p>
          </div>
          <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 4, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Download size={13} /> {t("common.exportCsv")}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 16 }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "var(--color-primary)" : "var(--color-text-secondary)",
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
              marginBottom: -2,
            }}>{t(`gaps.${tab}`)}</button>
          ))}
        </div>

        {gapsLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading gap data…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 16 }}>
              <ChartCard title="Ranking" subtitle={`${rankData.length} trades ranked by severity`} ariaLabel="Trade ranking table">
                <DataTable columns={rankCols} data={rankData} pageSize={8} ariaLabel="Trade ranking" />
              </ChartCard>

              <ChartCard title="Gap Magnitude" subtitle="Top 10 trades by absolute gap %" ariaLabel="Gap bar chart">
                <GapBarChart data={tabData} />
              </ChartCard>
            </div>

            <ChartCard title="All Trade-District Combinations" subtitle={`${tabData.length} records`} ariaLabel="Full gap data table" onDownload={handleExport}>
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

