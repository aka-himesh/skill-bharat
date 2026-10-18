import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockRecommendations } from "../mocks/data";
import RecommendationCard from "../components/ui/RecommendationCard";
import { Download } from "lucide-react";
import type { RecommendationType } from "../types";

const TYPE_LABELS: Record<RecommendationType | "all", string> = {
  all: "All", increase_seats: "Increase Seats", decrease_seats: "Decrease Seats",
  new_course: "New Course", revise_curriculum: "Revise Curriculum", close_centre: "Close Centre",
};

export default function Recommendations() {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<RecommendationType | "all">("all");
  const [priority, setPriority] = useState<"all" | "High" | "Medium" | "Low">("all");

  const filtered = mockRecommendations.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (priority !== "all" && r.priority !== priority) return false;
    return true;
  });

  const handleExport = () => {
    const headers = ["Trade", "NCO", "Sector", "State", "District", "Type", "Priority", "CurrentSeats", "RecommendedSeats", "Delta"];
    const csv = [headers.join(","), ...filtered.map((r) => [r.tradeName, r.ncoCode, r.sectorName, r.stateName, r.districtName, r.type, r.priority, r.currentSeats, r.recommendedSeats, r.seatDelta].join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "recommendations.csv"; a.click();
  };

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("recommendations.title")}</h1>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{t("recommendations.subtitle")}</p>
          </div>
          <button onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 4, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Download size={13} /> Export Targets CSV
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Summary chips */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Seat Increases", count: mockRecommendations.filter((r) => r.type === "increase_seats" || r.type === "new_course").length, color: "#138808" },
            { label: "Seat Reductions", count: mockRecommendations.filter((r) => r.type === "decrease_seats" || r.type === "close_centre").length, color: "#c0392b" },
            { label: "Curriculum Changes", count: mockRecommendations.filter((r) => r.type === "revise_curriculum").length, color: "#2980b9" },
            { label: "High Priority", count: mockRecommendations.filter((r) => r.priority === "High").length, color: "#e67e22" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(Object.keys(TYPE_LABELS) as (RecommendationType | "all")[]).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ background: typeFilter === t ? "var(--color-primary)" : "var(--color-surface)", color: typeFilter === t ? "#fff" : "var(--color-text-secondary)", border: `1px solid ${typeFilter === t ? "var(--color-primary)" : "var(--color-border)"}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              {TYPE_LABELS[t]}
            </button>
          ))}
          {(["all", "High", "Medium", "Low"] as const).map((p) => (
            <button key={p} onClick={() => setPriority(p)} style={{ background: priority === p ? "#e67e22" : "var(--color-surface)", color: priority === p ? "#fff" : "var(--color-text-secondary)", border: `1px solid ${priority === p ? "#e67e22" : "var(--color-border)"}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              {p === "all" ? "All Priority" : `${p} Priority`}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)", fontSize: 13 }}>No recommendations match the selected filters.</div>}
          {filtered.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
        </div>
      </div>
    </div>
  );
}
