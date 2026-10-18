import { AlertCircle, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import type { SeverityBand } from "../../types";

const CONFIG: Record<SeverityBand, { bg: string; color: string; border: string; Icon: typeof AlertCircle; label: string }> = {
  "Critical Shortage": { bg: "#fdf2f2", color: "var(--color-critical-shortage)", border: "#f5c6c6", Icon: AlertCircle, label: "Critical Shortage" },
  "Shortage":          { bg: "#fef6ee", color: "var(--color-shortage)",          border: "#fcd8b0", Icon: AlertTriangle, label: "Shortage" },
  "Balanced":          { bg: "#f0faf4", color: "var(--color-balanced)",          border: "#a8dfc0", Icon: CheckCircle2,  label: "Balanced" },
  "Oversupply":        { bg: "#eef5fc", color: "var(--color-oversupply)",        border: "#b0cfe8", Icon: TrendingDown,  label: "Oversupply" },
  "Critical Oversupply": { bg: "#f8f0fc", color: "var(--color-critical-oversupply)", border: "#d8a8f0", Icon: TrendingUp, label: "Critical Oversupply" },
};

export default function SeverityBadge({ severity, size = "sm" }: { severity: SeverityBand; size?: "sm" | "md" }) {
  const cfg = CONFIG[severity] ?? CONFIG["Balanced"];
  const { bg, color, border, Icon, label } = cfg;
  const iconSize = size === "sm" ? 11 : 13;
  const fontSize = size === "sm" ? 11 : 12;
  const padding = size === "sm" ? "2px 7px" : "4px 10px";

  return (
    <span
      role="status"
      aria-label={`Severity: ${label}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding, fontSize, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      <Icon size={iconSize} aria-hidden />
      {label}
    </span>
  );
}
