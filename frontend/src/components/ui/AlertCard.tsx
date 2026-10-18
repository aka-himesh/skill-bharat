import { AlertCircle, AlertTriangle, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Alert } from "../../types";
import SeverityBadge from "./SeverityBadge";

const TYPE_CONFIG = {
  shortage:   { Icon: AlertCircle,   color: "#c0392b", bg: "#fdf2f2", border: "#f5c6c6", label: "Shortage Alert" },
  oversupply: { Icon: TrendingDown,  color: "#2980b9", bg: "#eef5fc", border: "#b0cfe8", label: "Oversupply Alert" },
  emerging:   { Icon: TrendingUp,    color: "#e67e22", bg: "#fef6ee", border: "#fcd8b0", label: "Emerging Trade" },
  saturation: { Icon: AlertTriangle, color: "#8e44ad", bg: "#f8f0fc", border: "#d8a8f0", label: "Saturation Risk" },
};

export default function AlertCard({ alert }: { alert: Alert }) {
  const cfg = TYPE_CONFIG[alert.type];
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.color}`,
        borderRadius: "var(--radius-md)", padding: "14px 16px",
        boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.15s",
      }}
      role="alert"
      aria-label={`${cfg.label}: ${alert.tradeName}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <cfg.Icon size={16} color={cfg.color} aria-hidden />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{alert.tradeName}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {alert.sectorName} &nbsp;·&nbsp; {alert.districtName}, {alert.stateName}
              {alert.isAspirational && <span style={{ marginLeft: 6, background: "#e8601c", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>ASPIRATIONAL</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SeverityBadge severity={alert.severity} />
          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
            {alert.deltaPercent > 0 ? "+" : ""}{alert.deltaPercent}%
          </span>
        </div>
      </div>
      <p style={{ margin: "10px 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{alert.message}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>NCO: {alert.ncoCode} &nbsp;·&nbsp; Flagged: {alert.flaggedAt}</span>
        <button
          onClick={() => navigate(`/gaps?ncoCode=${alert.ncoCode}&stateId=${alert.stateId}`)}
          style={{ background: "transparent", border: `1px solid ${cfg.color}`, color: cfg.color, borderRadius: 3, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
        >
          View Details <ExternalLink size={10} />
        </button>
      </div>
    </div>
  );
}
