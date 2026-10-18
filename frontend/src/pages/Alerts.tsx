import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockAlerts } from "../mocks/data";
import AlertCard from "../components/ui/AlertCard";
import type { AlertType } from "../types";

const TYPE_LABELS: Record<AlertType | "all", string> = { all: "All Alerts", shortage: "Shortage", oversupply: "Oversupply", emerging: "Emerging Trade", saturation: "Saturation" };

export default function Alerts() {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");

  const filtered = typeFilter === "all" ? mockAlerts : mockAlerts.filter((a) => a.type === typeFilter);
  const counts = { all: mockAlerts.length, shortage: mockAlerts.filter((a) => a.type === "shortage").length, oversupply: mockAlerts.filter((a) => a.type === "oversupply").length, emerging: mockAlerts.filter((a) => a.type === "emerging").length, saturation: mockAlerts.filter((a) => a.type === "saturation").length };

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("alerts.title")}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{t("alerts.subtitle")}</p>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Type filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(Object.keys(TYPE_LABELS) as (AlertType | "all")[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                background: typeFilter === type ? "var(--color-primary)" : "var(--color-surface)",
                color: typeFilter === type ? "#fff" : "var(--color-text-secondary)",
                border: `1px solid ${typeFilter === type ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              {TYPE_LABELS[type]} ({counts[type]})
            </button>
          ))}
        </div>

        {/* Alert summary strip */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Critical Shortage", count: mockAlerts.filter((a) => a.severity === "Critical Shortage").length, color: "var(--color-critical-shortage)" },
            { label: "Shortage", count: mockAlerts.filter((a) => a.severity === "Shortage").length, color: "var(--color-shortage)" },
            { label: "Saturation Risk", count: mockAlerts.filter((a) => a.type === "saturation").length, color: "var(--color-critical-oversupply)" },
            { label: "Emerging", count: mockAlerts.filter((a) => a.type === "emerging").length, color: "var(--color-accent)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", boxShadow: "var(--shadow-sm)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Alert cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)", fontSize: 13 }}>No alerts for this category.</div>
          )}
          {filtered.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      </div>
    </div>
  );
}
