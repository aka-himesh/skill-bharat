import type { ReactNode } from "react";

interface KpiTileProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  color?: "primary" | "orange" | "green" | "red" | "purple" | "blue";
  size?: "md" | "lg";
}

const COLORS = {
  primary: { bg: "#eef3fa", border: "#b0c4e8", text: "var(--color-primary)", icon: "var(--color-primary)" },
  orange:  { bg: "#fef6ee", border: "#fcd8b0", text: "var(--color-accent)",  icon: "var(--color-accent)" },
  green:   { bg: "#f0faf4", border: "#a8dfc0", text: "#138808",              icon: "#138808" },
  red:     { bg: "#fdf2f2", border: "#f5c6c6", text: "#c0392b",              icon: "#c0392b" },
  purple:  { bg: "#f8f0fc", border: "#d8a8f0", text: "#8e44ad",              icon: "#8e44ad" },
  blue:    { bg: "#eef5fc", border: "#b0cfe8", text: "#2980b9",              icon: "#2980b9" },
};

export default function KpiTile({ label, value, subtext, icon, color = "primary", size = "md" }: KpiTileProps) {
  const c = COLORS[color];
  const isLg = size === "lg";

  return (
    <div
      style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius-md)",
        padding: isLg ? "20px 24px" : "14px 18px",
        borderLeft: `3px solid ${c.text}`,
        boxShadow: "var(--shadow-sm)",
        display: "flex", flexDirection: "column", gap: 4,
        minWidth: isLg ? 180 : 140,
      }}
    >
      {icon && <div style={{ color: c.icon, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontSize: isLg ? 26 : 22, fontWeight: 700, color: c.text, lineHeight: 1.2 }}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      {subtext && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{subtext}</div>}
    </div>
  );
}
