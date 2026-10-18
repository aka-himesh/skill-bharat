import { useTranslation } from "react-i18next";
import { mockSources } from "../mocks/data";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  live: { Icon: CheckCircle2, color: "#138808", bg: "#f0faf4", label: "Live" },
  demo: { Icon: Clock, color: "#e67e22", bg: "#fef6ee", label: "Demo / Synthetic" },
  unavailable: { Icon: XCircle, color: "#c0392b", bg: "#fdf2f2", label: "Unavailable" },
};

export default function Sources() {
  const { t } = useTranslation();
  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("sources.title")}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{t("sources.subtitle")}</p>
        </div>
      </div>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, background: v.bg, border: `1px solid`, borderColor: v.color + "40", borderRadius: 20, padding: "4px 12px", fontSize: 11 }}>
              <v.Icon size={12} color={v.color} /> <span style={{ color: v.color, fontWeight: 700 }}>{v.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mockSources.map((src) => {
            const cfg = STATUS_CONFIG[src.status];
            return (
              <div key={src.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "16px 20px", boxShadow: "var(--shadow-sm)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <cfg.Icon size={16} color={cfg.color} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{src.name}</span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.6 }}>{src.description}</p>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>{src.coverageNote}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{src.recordCount.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Records</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Last ingested:<br />{src.lastIngested}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

