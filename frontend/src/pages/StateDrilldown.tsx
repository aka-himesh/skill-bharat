import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { mockStates, mockGapRows, mockDistricts, mockStateMapData } from "../mocks/data";
import DataTable from "../components/ui/DataTable";
import SeverityBadge from "../components/ui/SeverityBadge";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import GapBarChart from "../components/charts/GapBarChart";
import type { GapRow, SeverityBand } from "../types";
import type { Column } from "../components/ui/DataTable";
import { ArrowLeft, Radio } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useStates, useDistricts, useGaps } from "../hooks/useApi";

export default function StateDrilldown() {
  const { stateId } = useParams<{ stateId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();

  // Fetch real states from backend
  const { data: apiStates } = useStates(isLoggedIn);

  // Match state either by id, code, or fallback to mock
  const matchedApiState = apiStates?.find(
    (s) =>
      String(s.id) === stateId ||
      s.code.toLowerCase() === (stateId || "").toLowerCase()
  );
  const fallbackMockState = mockStates.find(
    (s) =>
      s.id === stateId ||
      s.code?.toLowerCase() === (stateId || "").toLowerCase()
  );

  const stateName = matchedApiState?.name || fallbackMockState?.name || stateId || "";
  const numericStateId = matchedApiState?.id;

  // Fetch districts and gaps from backend if logged in
  const { data: apiDistricts } = useDistricts(numericStateId, isLoggedIn && !!numericStateId);
  const { data: apiGapsResponse, isLoading: gapsLoading } = useGaps(
    numericStateId ? { state_id: numericStateId } : undefined,
    isLoggedIn && !!numericStateId
  );

  const isLive = isLoggedIn && !!apiGapsResponse?.gaps?.length;

  // Compute rows
  let rows: GapRow[] = [];
  if (isLive && apiGapsResponse?.gaps) {
    rows = apiGapsResponse.gaps.map((item) => ({
      id: `${item.district_id}-${item.occupation_id}`,
      ncoCode: item.nco_code,
      tradeName: item.occupation_name,
      sectorName: item.sector_name || "General",
      stateId: String(item.state_name),
      stateName: item.state_name,
      districtId: String(item.district_id),
      districtName: item.district_name,
      demand: Math.round(item.forecast_demand),
      supply: Math.round(item.forecast_supply),
      gap: Math.round(item.forecast_demand - item.forecast_supply),
      gapPercent: Math.round(item.gap_pct * 10) / 10,
      severity: (item.gap_band as SeverityBand) || "Balanced",
      nsqfLevel: 4,
      isAspirational: false,
    }));
  } else {
    rows = mockGapRows.filter((r) => r.stateId === stateId);
  }

  // Compute districts
  const districts = (isLoggedIn && apiDistricts && apiDistricts.length > 0)
    ? apiDistricts.map((d) => ({
        id: String(d.id),
        name: d.name,
        stateId: String(d.state_id),
        stateName: stateName,
        isAspirational: d.is_aspirational,
      }))
    : mockDistricts.filter((d) => d.stateId === stateId);

  // Compute state KPI summary
  const totalDemand = rows.reduce((a, r) => a + r.demand, 0);
  const totalSupply = rows.reduce((a, r) => a + r.supply, 0);
  const gapScore = totalDemand > 0 ? Math.round(((totalDemand - totalSupply) / totalDemand) * 100) : 0;
  const mockStateData = mockStateMapData.find((s) => s.stateId === stateId);
  const severity: SeverityBand = gapScore > 25 ? "Critical Shortage" : gapScore > 10 ? "Shortage" : gapScore < -20 ? "Critical Oversupply" : "Balanced";

  if (!matchedApiState && !fallbackMockState) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>State not found.</p>
        <button
          onClick={() => navigate("/overview")}
          style={{ background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}
        >
          Return to Overview
        </button>
      </div>
    );
  }

  const cols: Column<GapRow>[] = [
    { key: "districtName", header: "District", sortable: true },
    { key: "tradeName", header: t("table.trade"), sortable: true },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
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
  ];

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <button
              onClick={() => navigate("/overview")}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid var(--color-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}
            >
              <ArrowLeft size={13} /> Overview
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
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{stateName} — Skill Gap Analysis</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <SeverityBadge severity={mockStateData?.severity || severity} />
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              Gap Score: {gapScore > 0 ? "+" : ""}{gapScore}%
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <KpiTile label="Total Demand" value={totalDemand} color="primary" />
          <KpiTile label="Total Supply" value={totalSupply} color="green" />
          <KpiTile label="Gap Score" value={`${gapScore > 0 ? "+" : ""}${gapScore}%`} color={gapScore > 20 ? "red" : gapScore < -20 ? "purple" : "green"} />
          <KpiTile label="Districts" value={districts.length} color="blue" />
          <KpiTile label="Trade-District Combinations" value={rows.length} color="orange" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title={`${stateName} — District Breakdown`} ariaLabel="District gap table">
            <div>
              {districts.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                  No district data available for this state.
                </div>
              )}
              {districts.map((d) => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/district/${d.id}`)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--color-border)", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-alt)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{d.name}</span>
                    {d.isAspirational && (
                      <span style={{ marginLeft: 6, background: "#e8601c", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                        ASPIRATIONAL
                      </span>
                    )}
                  </div>
                  <span style={{ color: "var(--color-primary-light)", fontSize: 11 }}>View →</span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Gap Magnitude by Trade" ariaLabel="State gap bar chart">
            {rows.length > 0 ? (
              <GapBarChart data={rows} />
            ) : gapsLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading gap analysis...</div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>No trade data for this state.</div>
            )}
          </ChartCard>
        </div>

        <ChartCard title={`All Trade Gaps — ${stateName}`} ariaLabel="State trade gap table">
          {rows.length > 0 ? (
            <DataTable columns={cols} data={rows} pageSize={8} onRowClick={(r) => navigate(`/district/${r.districtId}`)} ariaLabel="State trade gaps" />
          ) : gapsLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading data...</div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
              No gap data available for this state. Try Maharashtra, Uttar Pradesh, or Rajasthan.
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
