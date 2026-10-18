import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { mockStates, mockGapRows, mockDistricts, mockStateMapData } from "../mocks/data";
import DataTable from "../components/ui/DataTable";
import SeverityBadge from "../components/ui/SeverityBadge";
import KpiTile from "../components/ui/KpiTile";
import ChartCard from "../components/ui/ChartCard";
import GapBarChart from "../components/charts/GapBarChart";
import type { GapRow } from "../types";
import type { Column } from "../components/ui/DataTable";
import { ArrowLeft } from "lucide-react";

export default function StateDrilldown() {
  const { stateId } = useParams<{ stateId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = mockStates.find((s) => s.id === stateId);
  const stateData = mockStateMapData.find((s) => s.stateId === stateId);
  const rows = mockGapRows.filter((r) => r.stateId === stateId);
  const districts = mockDistricts.filter((d) => d.stateId === stateId);

  if (!state) return <div style={{ padding: 48, textAlign: "center" }}>State not found.</div>;

  const cols: Column<GapRow>[] = [
    { key: "districtName", header: "District", sortable: true },
    { key: "tradeName", header: t("table.trade"), sortable: true },
    { key: "sectorName", header: t("table.sector"), sortable: true },
    { key: "demand", header: t("table.demand"), sortable: true, align: "right", render: (r) => r.demand.toLocaleString("en-IN") },
    { key: "supply", header: t("table.supply"), sortable: true, align: "right", render: (r) => r.supply.toLocaleString("en-IN") },
    { key: "gapPercent", header: t("table.gapPct"), sortable: true, align: "right", render: (r) => <span style={{ fontWeight: 700, color: r.gapPercent > 0 ? "var(--color-critical-shortage)" : "var(--color-oversupply)" }}>{r.gapPercent > 0 ? "+" : ""}{r.gapPercent.toFixed(1)}%</span> },
    { key: "severity", header: t("table.severity"), render: (r) => <SeverityBadge severity={r.severity} /> },
  ];

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <button onClick={() => navigate("/overview")} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid var(--color-border)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)" }}>
              <ArrowLeft size={13} /> Overview
            </button>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{state.name} — Skill Gap Analysis</h1>
          {stateData && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}><SeverityBadge severity={stateData.severity} /><span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Gap Score: {stateData.gapScore > 0 ? "+" : ""}{stateData.gapScore}</span></div>}
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        {stateData && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <KpiTile label="Total Demand" value={stateData.totalDemand} color="primary" />
            <KpiTile label="Total Supply" value={stateData.totalSupply} color="green" />
            <KpiTile label="Gap Score" value={`${stateData.gapScore > 0 ? "+" : ""}${stateData.gapScore}`} color={stateData.gapScore > 20 ? "red" : stateData.gapScore < -20 ? "purple" : "green"} />
            <KpiTile label="Districts" value={districts.length} color="blue" />
            <KpiTile label="Trade-District Combinations" value={rows.length} color="orange" />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title={`${state.name} — District Breakdown`} ariaLabel="District gap table">
            <div>
              {districts.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>No district data available for this state in demo.</div>}
              {districts.map((d) => (
                <div key={d.id}
                  onClick={() => navigate(`/district/${d.id}`)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--color-border)", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-alt)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{d.name}</span>
                    {d.isAspirational && <span style={{ marginLeft: 6, background: "#e8601c", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ASPIRATIONAL</span>}
                  </div>
                  <span style={{ color: "var(--color-primary-light)", fontSize: 11 }}>View →</span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Gap Magnitude by Trade" ariaLabel="State gap bar chart">
            {rows.length > 0 ? <GapBarChart data={rows} /> : <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>No trade data for this state in demo.</div>}
          </ChartCard>
        </div>

        <ChartCard title={`All Trade Gaps — ${state.name}`} ariaLabel="State trade gap table">
          {rows.length > 0
            ? <DataTable columns={cols} data={rows} pageSize={8} onRowClick={(r) => navigate(`/district/${r.districtId}`)} ariaLabel="State trade gaps" />
            : <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>No gap data available for this state in demo dataset. Try Maharashtra (MH), Uttar Pradesh (UP), or Rajasthan (RJ).</div>
          }
        </ChartCard>
      </div>
    </div>
  );
}

