import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockRecommendations } from "../mocks/data";
import RecommendationCard from "../components/ui/RecommendationCard";
import { Download, Radio, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Recommendation, RecommendationType } from "../types";
import { useAuth } from "../context/AuthContext";
import { useRecommendations } from "../hooks/useApi";
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
  const [typeFilter, setTypeFilter] = useState<RecommendationType | "all">("all");
  const [priority, setPriority] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [exporting, setExporting] = useState(false);

  // Fetch recommendations from API if logged in
  const { data: apiRecsResponse, isLoading } = useRecommendations(undefined, isLoggedIn);

  const isLive = isLoggedIn && !!apiRecsResponse?.recommendations?.length;

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

  const filtered = allRecs.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (priority !== "all" && r.priority !== priority) return false;
    return true;
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      if (isLoggedIn) {
        await downloadAuthenticatedCsv(
          getRecommendationsExportCsvUrl(),
          "recommendations_targets.csv"
        );
      } else {
        throw new Error("Client export fallback");
      }
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
      a.download = "recommendations.csv";
      a.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("recommendations.title")}</h1>
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
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
              {t("recommendations.subtitle")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isLoggedIn && (
              <button
                onClick={() => navigate("/login")}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: 4, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              >
                <LogIn size={13} /> Login for Live Targets
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 4, padding: "8px 14px", cursor: exporting ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}
            >
              <Download size={13} /> {exporting ? "Exporting..." : "Export Targets CSV"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Summary chips */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            {
              label: "Seat Increases",
              count: allRecs.filter((r) => r.type === "increase_seats" || r.type === "new_course").length,
              color: "#138808",
            },
            {
              label: "Seat Reductions",
              count: allRecs.filter((r) => r.type === "decrease_seats" || r.type === "close_centre").length,
              color: "#c0392b",
            },
            {
              label: "Curriculum Changes",
              count: allRecs.filter((r) => r.type === "revise_curriculum").length,
              color: "#2980b9",
            },
            {
              label: "High Priority",
              count: allRecs.filter((r) => r.priority === "High").length,
              color: "#e67e22",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(Object.keys(TYPE_LABELS) as (RecommendationType | "all")[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                background: typeFilter === t ? "var(--color-primary)" : "var(--color-surface)",
                color: typeFilter === t ? "#fff" : "var(--color-text-secondary)",
                border: `1px solid ${typeFilter === t ? "var(--color-primary)" : "var(--color-border)"}`,
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
                background: priority === p ? "#e67e22" : "var(--color-surface)",
                color: priority === p ? "#fff" : "var(--color-text-secondary)",
                border: `1px solid ${priority === p ? "#e67e22" : "var(--color-border)"}`,
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
          <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)", fontSize: 13 }}>
            Loading recommendations...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)", fontSize: 13 }}>
                No recommendations match the selected filters.
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
