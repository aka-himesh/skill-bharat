import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../hooks/useApi";
import { useFilters } from "../context/FilterContext";
import AlertCard from "../components/ui/AlertCard";
import type { Alert, AlertType } from "../types";
import { RotateCcw } from "lucide-react";

const TYPE_LABELS: Record<string | "all", string> = {
  all: "All Alerts",
  shortage: "Shortage",
  oversupply: "Oversupply",
  emerging: "Emerging Trade",
  saturation: "Saturation",
  sustained_growth: "Sustained Growth",
  capacity_excess: "Capacity Excess",
  approaching_shortage: "Approaching Shortage",
  approaching_oversupply: "Approaching Oversupply",
};

export default function Alerts() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { filters, clearFilters } = useFilters();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const numStateId = filters.stateId && /^\d+$/.test(filters.stateId) ? Number(filters.stateId) : undefined;
  const numDistrictId = filters.districtId && /^\d+$/.test(filters.districtId) ? Number(filters.districtId) : undefined;
  const numSectorId = filters.sectorId && /^\d+$/.test(filters.sectorId) ? Number(filters.sectorId) : undefined;

  const { data: alertsData, isLoading, isError } = useAlerts(
    {
      alert_type: typeFilter !== "all" ? typeFilter : undefined,
      severity: severityFilter !== "all" ? severityFilter : undefined,
      state_id: numStateId,
      district_id: numDistrictId,
      sector_id: numSectorId,
      limit: 200,
    },
    true
  );

  // Map backend alerts to the UI Alert type
  let alerts: Alert[] = (alertsData?.alerts ?? []).map((a) => ({
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

  // Client-side search keyword
  if (filters.q) {
    const kw = filters.q.toLowerCase().trim();
    alerts = alerts.filter(
      (a) =>
        a.tradeName.toLowerCase().includes(kw) ||
        a.ncoCode.toLowerCase().includes(kw) ||
        a.districtName.toLowerCase().includes(kw) ||
        a.stateName.toLowerCase().includes(kw)
    );
  }

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
      <div style={{ background: "var(--color-surface, #ffffff)", borderBottom: "1px solid var(--color-border, #e2e8f0)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max, 1280px)", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f2447" }}>{t("alerts.title", "Early Warning Alerts")}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary, #64748b)", margin: "4px 0 0" }}>
            {t("alerts.subtitle", "System-generated early warnings based on econometric threshold triggers")}
            <span style={{ marginLeft: 8, color: "#138808", fontSize: 10, fontWeight: 700 }}>● LIVE DATA</span>
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "var(--container-max, 1280px)", margin: "0 auto", padding: "20px 24px" }}>
        {/* Type filter pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              style={{
                background: typeFilter === type ? "#0f2447" : "var(--color-surface, #ffffff)",
                color: typeFilter === type ? "#fff" : "var(--color-text-secondary, #64748b)",
                border: `1px solid ${typeFilter === type ? "#0f2447" : "var(--color-border, #cbd5e1)"}`,
                borderRadius: 20,
                padding: "5px 14px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {label} {counts[type] != null ? `(${counts[type]})` : ""}
            </button>
          ))}
        </div>

        {/* Alert summary strip — click to filter by severity */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted, #64748b)", marginRight: 4 }}>
            SEVERITY:
          </span>
          {[
            { key: "all", label: "All", count: allAlerts.length, color: "var(--color-text-secondary, #475569)" },
            { key: "critical", label: "Critical", count: severityCounts.critical, color: "var(--color-critical-shortage, #dc2626)" },
            { key: "high", label: "High", count: severityCounts.high, color: "var(--color-shortage, #d97706)" },
            { key: "medium", label: "Medium", count: severityCounts.medium, color: "#2563eb" },
            { key: "low", label: "Low", count: severityCounts.low, color: "#16a34a" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSeverityFilter(s.key)}
              aria-pressed={severityFilter === s.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: severityFilter === s.key ? s.color : "#ffffff",
                border: `1px solid ${severityFilter === s.key ? s.color : "#cbd5e1"}`,
                borderRadius: "var(--radius-sm, 4px)",
                padding: "6px 12px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {s.key !== "all" && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: severityFilter === s.key ? "#fff" : s.color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: severityFilter === s.key ? "#fff" : s.color }}>
                {s.count}
              </span>
              <span style={{ fontSize: 11, color: severityFilter === s.key ? "rgba(255,255,255,0.9)" : "#475569" }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* Loading / error / alerts */}
        {isLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted, #94a3b8)", fontSize: 12 }}>
            Loading alerts…
          </div>
        )}
        {isError && (
          <div style={{ padding: 16, background: "#fdf2f2", border: "1px solid #c0392b40", borderRadius: 4, fontSize: 12, color: "#c0392b" }}>
            Failed to load alerts.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!isLoading && alerts.length === 0 && (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: "6px",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                No Alerts in Current Scope
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                No early warning threshold flags match your selected state, district, or severity filters.
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
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
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
