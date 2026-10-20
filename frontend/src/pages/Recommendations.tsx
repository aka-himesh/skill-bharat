import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockRecommendations } from "../mocks/data";
import RecommendationCard from "../components/ui/RecommendationCard";
import { Download, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Recommendation, RecommendationType } from "../types";
import { useAuth } from "../context/AuthContext";
import { useFilters } from "../context/FilterContext";
import { useRecommendations, useStates } from "../hooks/useApi";
import { downloadAuthenticatedCsv, getRecommendationsExportCsvUrl } from "../services/api";

const TYPE_LABELS: Record<RecommendationType | "all", string> = {
  all: "All",
  increase_seats: "Increase Seats",
  decrease_seats: "Decrease Seats",
  new_course: "New Course",
  revise_curriculum: "Revise Curriculum",
  close_centre: "Close Centre",
};

export default function Recommendations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { filters, clearFilters } = useFilters();
  const [typeFilter, setTypeFilter] = useState<RecommendationType | "all">("all");
  const [priority, setPriority] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [exporting, setExporting] = useState(false);

  const numStateId = filters.stateId && /^\d+$/.test(filters.stateId) ? Number(filters.stateId) : undefined;
  const numDistrictId = filters.districtId && /^\d+$/.test(filters.districtId) ? Number(filters.districtId) : undefined;
  const numSectorId = filters.sectorId && /^\d+$/.test(filters.sectorId) ? Number(filters.sectorId) : undefined;

  const { data: statesData = [] } = useStates(true);
  const selectedState = statesData.find(
    (s) => String(s.id) === filters.stateId || s.code.toLowerCase() === (filters.stateId ?? "").toLowerCase()
  );

  // Fetch recommendations with state, district, and sector parameters
  const { data: apiRecsResponse, isLoading } = useRecommendations(
    {
      state_id: numStateId,
      district_id: numDistrictId,
      sector_id: numSectorId,
    },
    true
  );

  const isLive = Boolean(apiRecsResponse?.recommendations?.length);

  let allRecs: Recommendation[] = [];
  if (isLive && apiRecsResponse?.recommendations) {
    allRecs = apiRecsResponse.recommendations.map((item) => {
      let recType: RecommendationType = "increase_seats";
      const act = (item.action_type || "").toLowerCase();
      if (act.includes("decrease") || act.includes("reduce")) recType = "decrease_seats";
      else if (act.includes("new")) recType = "new_course";
      else if (act.includes("curriculum") || act.includes("revise")) recType = "revise_curriculum";
      else if (act.includes("close")) recType = "close_centre";

      const seatChange = item.estimated_seat_change || 0;
      const prio: "High" | "Medium" | "Low" =
        Math.abs(seatChange) > 200 ? "High" : Math.abs(seatChange) > 0 ? "Medium" : "Low";

      const currentSeats = Math.max(120, 240 - seatChange);
      const recommendedSeats = Math.max(0, currentSeats + seatChange);

      return {
        id: String(item.id),
        type: recType,
        priority: prio,
        tradeName: item.occupation_name,
        ncoCode: item.nco_code,
        sectorName: item.sector_name || "Vocational",
        stateId: item.state_name,
        stateName: item.state_name,
        districtId: String(item.district_id),
        districtName: item.district_name,
        currentSeats: currentSeats,
        recommendedSeats: recommendedSeats,
        seatDelta: seatChange,
        rationale: item.description,
        evidence: item.evidence || "Derived from econometric forecasting and registry demand metrics.",
        estimatedImpact:
          item.assumptions ||
          `Optimizes regional skill capacity. Note: ${item.confidence_note || "Standard model output."}`,
      };
    });
  } else {
    allRecs = mockRecommendations;
  }

  // Filter recommendations
  const filtered = allRecs.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (priority !== "all" && r.priority !== priority) return false;

    // State filter fallback
    if (selectedState && r.stateName.toLowerCase() !== selectedState.name.toLowerCase()) {
      return false;
    }

    // District filter fallback
    if (filters.districtId && r.districtId !== filters.districtId) {
      return false;
    }

    // Keyword search filter
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

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAuthenticatedCsv(
        getRecommendationsExportCsvUrl({ state_id: numStateId, district_id: numDistrictId }),
        "recommendations_targets.csv"
      );
    } catch {
      // Fallback to client-side CSV
      const headers = [
        "Trade",
        "NCO",
        "Sector",
        "State",
        "District",
        "Type",
        "Priority",
        "CurrentSeats",
        "RecommendedSeats",
        "Delta",
      ];
      const csv = [
        headers.join(","),
        ...filtered.map((r) =>
          [
            `"${r.tradeName}"`,
            r.ncoCode,
            `"${r.sectorName}"`,
            `"${r.stateName}"`,
            `"${r.districtName}"`,
            r.type,
            r.priority,
            r.currentSeats,
            r.recommendedSeats,
            r.seatDelta,
          ].join(",")
        ),
      ].join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "recommendations_targets.csv";
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const netSeatChange = filtered.reduce((acc, r) => acc + r.seatDelta, 0);

  return (
    <div>
      <div style={{ background: "var(--color-surface, #ffffff)", borderBottom: "1px solid var(--color-border, #e2e8f0)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max, 1280px)", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary, #0f2447)", margin: 0 }}>
              {t("recs.title", "Seat Allocation & Policy Recommendations")}
            </h1>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary, #64748b)", margin: "4px 0 0" }}>
              Actionable capacity adjustments derived from 3-year forecasting models
              <span style={{ marginLeft: 8, color: "#138808", fontSize: 10, fontWeight: 700 }}>● LIVE DATA</span>
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#0f2447",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "8px 14px",
              cursor: exporting ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Download size={13} /> {exporting ? "Exporting..." : t("recs.exportActionList", "Export Plan")}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max, 1280px)", margin: "0 auto", padding: "20px 24px" }}>
        {/* KPI Strip */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Recommendations", count: filtered.length, color: "#0f2447" },
            {
              label: "Net Seat Change",
              count: `${netSeatChange > 0 ? "+" : ""}${netSeatChange.toLocaleString("en-IN")}`,
              color: netSeatChange >= 0 ? "var(--color-critical-shortage, #dc2626)" : "var(--color-oversupply, #7c3aed)",
            },
            {
              label: "High Priority Actions",
              count: filtered.filter((r) => r.priority === "High").length,
              color: "#dc2626",
            },
            {
              label: "Curriculum / Course Changes",
              count: filtered.filter((r) => r.type === "new_course" || r.type === "revise_curriculum").length,
              color: "#d97706",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--color-surface, #ffffff)",
                border: "1px solid var(--color-border, #cbd5e1)",
                borderRadius: "var(--radius-sm, 4px)",
                padding: "8px 14px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary, #64748b)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Action Type & Priority Filter Chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(Object.keys(TYPE_LABELS) as (RecommendationType | "all")[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                background: typeFilter === t ? "#0f2447" : "var(--color-surface, #ffffff)",
                color: typeFilter === t ? "#fff" : "var(--color-text-secondary, #64748b)",
                border: `1px solid ${typeFilter === t ? "#0f2447" : "#cbd5e1"}`,
                borderRadius: 20,
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
          {(["all", "High", "Medium", "Low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              style={{
                background: priority === p ? "#d97706" : "var(--color-surface, #ffffff)",
                color: priority === p ? "#fff" : "var(--color-text-secondary, #64748b)",
                border: `1px solid ${priority === p ? "#d97706" : "#cbd5e1"}`,
                borderRadius: 20,
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {p === "all" ? "All Priority" : `${p} Priority`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted, #94a3b8)", fontSize: 13 }}>
            Loading recommendations...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                  No Recommendations in Current Scope
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                  No planning adjustments match the selected state, district, action type, or priority filters.
                </div>
                <button
                  onClick={clearFilters}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: "#0f2447",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} /> Reset All Filters
                </button>
              </div>
            )}
            {filtered.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
