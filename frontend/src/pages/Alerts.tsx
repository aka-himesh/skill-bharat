import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../hooks/useApi";
import AlertCard from "../components/ui/AlertCard";
import LoginPage from "./LoginPage";
import type { Alert, AlertType } from "../types";

const TYPE_LABELS: Record<string | "all", string> = { all: "All Alerts", shortage: "Shortage", oversupply: "Oversupply", emerging: "Emerging Trade", saturation: "Saturation", sustained_growth: "Sustained Growth", capacity_excess: "Capacity Excess", approaching_shortage: "Approaching Shortage", approaching_oversupply: "Approaching Oversupply" };

export default function Alerts() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  if (!isLoggedIn) return <LoginPage />;

  const { data: alertsData, isLoading, isError } = useAlerts({
    alert_type: typeFilter !== "all" ? typeFilter : undefined,
  }, isLoggedIn);

  // Map backend alerts to the UI Alert type
  const alerts: Alert[] = (alertsData?.alerts ?? []).map((a) => ({
    id: String(a.id),
    type: (a.alert_type as AlertType) ?? "shortage",
    severity: mapSeverity(a.severity),
    tradeName: a.occupation_name,
    ncoCode: a.nco_code,
    sectorName: "—",
    stateId: String(a.district_id),
    stateName: a.state_name,
    districtId: String(a.district_id),
    districtName: a.district_name,
    message: a.rule_description,
    deltaPercent: 0,
    flaggedAt: a.created_at,
    isAspirational: false,
  }));

  // Compute counts for the type filter pills
  const allAlerts = alertsData?.alerts ?? [];
  const counts: Record<string, number> = { all: allAlerts.length };
  for (const a of allAlerts) {
    counts[a.alert_type] = (counts[a.alert_type] ?? 0) + 1;
  }

  // Severity counts
  const severityCounts = {
    critical: allAlerts.filter((a) => a.severity === "critical").length,
    high: allAlerts.filter((a) => a.severity === "high").length,
    medium: allAlerts.filter((a) => a.severity === "medium").length,
    low: allAlerts.filter((a) => a.severity === "low").length,
  };

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("alerts.title")}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            {t("alerts.subtitle")}
            {alertsData && <span style={{ marginLeft: 8, color: "#138808", fontSize: 10, fontWeight: 700 }}>● LIVE DATA</span>}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Type filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
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
              {label} {counts[type] != null ? `(${counts[type]})` : ""}
            </button>
          ))}
        </div>

        {/* Alert summary strip */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Critical", count: severityCounts.critical, color: "var(--color-critical-shortage)" },
            { label: "High", count: severityCounts.high, color: "var(--color-shortage)" },
            { label: "Medium", count: severityCounts.medium, color: "var(--color-accent)" },
            { label: "Low", count: severityCounts.low, color: "var(--color-text-muted)" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", boxShadow: "var(--shadow-sm)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Loading / error / alerts */}
        {isLoading && <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading alerts…</div>}
        {isError && <div style={{ padding: 16, background: "#fdf2f2", border: "1px solid #c0392b40", borderRadius: "var(--radius-sm)", fontSize: 12, color: "#c0392b" }}>Failed to load alerts.</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!isLoading && alerts.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)", fontSize: 13 }}>No alerts for this category.</div>
          )}
          {alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      </div>
    </div>
  );
}

function mapSeverity(severity: string): Alert["severity"] {
  const map: Record<string, Alert["severity"]> = {
    critical: "Critical Shortage",
    high: "Shortage",
    medium: "Balanced",
    low: "Oversupply",
  };
  return map[severity] ?? "Balanced";
}
