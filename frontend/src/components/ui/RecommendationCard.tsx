import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, RefreshCw, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Recommendation } from "../../types";

const TYPE_CONFIG = {
  increase_seats:   { Icon: ArrowUp,       color: "#138808", bg: "#f0faf4", border: "#a8dfc0", label: "Increase Seats" },
  decrease_seats:   { Icon: ArrowDown,     color: "#c0392b", bg: "#fdf2f2", border: "#f5c6c6", label: "Decrease Seats" },
  new_course:       { Icon: Plus,          color: "#e67e22", bg: "#fef6ee", border: "#fcd8b0", label: "New Course" },
  revise_curriculum:{ Icon: RefreshCw,     color: "#2980b9", bg: "#eef5fc", border: "#b0cfe8", label: "Revise Curriculum" },
  close_centre:     { Icon: MinusCircle,   color: "#8e44ad", bg: "#f8f0fc", border: "#d8a8f0", label: "Close Centre" },
};

const PRIORITY_COLOR = { High: "#c0392b", Medium: "#e67e22", Low: "#2980b9" };

export default function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[rec.type];

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}`, borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: cfg.color, borderRadius: 6, padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <cfg.Icon size={14} color="#fff" aria-hidden />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{rec.tradeName}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{rec.sectorName} · {rec.districtName}, {rec.stateName}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: cfg.color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3 }}>{cfg.label}</span>
            <span style={{ background: PRIORITY_COLOR[rec.priority], color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3 }}>{rec.priority} Priority</span>
          </div>
        </div>

        {/* Seat delta */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center", padding: "8px 14px", background: "rgba(255,255,255,0.6)", borderRadius: 4, border: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>{rec.currentSeats.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Current Seats</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 18, color: cfg.color, fontWeight: 700 }}>→</div>
          <div style={{ textAlign: "center", padding: "8px 14px", background: cfg.color + "20", borderRadius: 4, border: `1px solid ${cfg.border}` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: cfg.color }}>{rec.recommendedSeats.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Recommended</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px 14px", background: "rgba(255,255,255,0.6)", borderRadius: 4, border: "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: cfg.color }}>{rec.seatDelta > 0 ? "+" : ""}{rec.seatDelta.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Change</div>
          </div>
        </div>

        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{rec.rationale}</p>

        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          style={{ marginTop: 10, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: cfg.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: 0 }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide" : "Show"} Evidence &amp; Impact
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.5)", borderTop: `1px solid ${cfg.border}` }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 4 }}>Evidence</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.6 }}>{rec.evidence}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 4 }}>Estimated Impact</div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.6 }}>{rec.estimatedImpact}</div>
          </div>
        </div>
      )}
    </div>
  );
}
