import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConfig } from "../context/ConfigContext";
import { mockSummary } from "../mocks/data";
import KpiTile from "../components/ui/KpiTile";
import { ArrowRight, Database, TrendingUp, AlertTriangle, Target, BarChart2, Map } from "lucide-react";

const FEATURES = [
  { Icon: Database, title: "Multi-Source Aggregation", desc: "Ingests NCS, e-Shram, PLFS, SMART portal data normalised to NCO-2015 codes.", color: "#1a3a6b" },
  { Icon: TrendingUp, title: "AI-Powered Forecasting", desc: "SARIMA-XGBoost ensemble generates 3-year demand-supply forecasts with 80% confidence bands.", color: "#138808" },
  { Icon: Map, title: "District-Level Heatmaps", desc: "National → State → District drill-down with severity colour coding.", color: "#e8601c" },
  { Icon: AlertTriangle, title: "Early Warning System", desc: "Automatic flags for trades approaching critical shortage or saturation.", color: "#e67e22" },
  { Icon: Target, title: "Seat Allocation Recommendations", desc: "AI-generated training target adjustments with evidence and impact estimates.", color: "#8e44ad" },
  { Icon: BarChart2, title: "API Export Layer", desc: "RESTful API and CSV exports for integration with scheme target-setting workflows.", color: "#2980b9" },
];

export default function Home() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const navigate = useNavigate();
  const s = mockSummary;

  return (
    <div style={{ fontFamily: "var(--font-family)" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#0f2447 0%,#1a3a6b 60%,#2552a3 100%)", color: "#fff", padding: "48px 24px 40px" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(232,96,28,0.2)", border: "1px solid rgba(232,96,28,0.4)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, marginBottom: 16, color: "#f5a623" }}>
              ● Smart India Hackathon 2026 · PS 26246
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.25 }}>
              {config.appName}
            </h1>
            <p style={{ fontSize: 15, color: "#a8c4e8", lineHeight: 1.7, margin: "0 0 24px" }}>
              {config.appTagline}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/overview")}
                style={{ background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 6, padding: "11px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {t("home.explore_btn")} <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate("/methodology")}
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "11px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {t("home.learn_more")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tricolour strip */}
      <div style={{ height: 3, background: "linear-gradient(to right,#ff9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)" }} />

      {/* Quick stats */}
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "20px 24px" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>{t("home.quick_stats")}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <KpiTile label={t("kpi.totalDemand")} value={s.totalDemand} color="primary" />
            <KpiTile label={t("kpi.totalSupply")} value={s.totalSupply} color="green" />
            <KpiTile label={t("kpi.totalGap")} value={s.totalGap} subtext={`${s.gapPercent}% gap`} color="orange" />
            <KpiTile label={t("kpi.criticalShortages")} value={s.criticalShortages} subtext="trades" color="red" />
            <KpiTile label={t("kpi.criticalOversupply")} value={s.criticalOversupply} subtext="trades" color="purple" />
            <KpiTile label={t("kpi.statesCovered")} value={s.statesCovered} color="blue" />
            <KpiTile label={t("kpi.districtsCovered")} value={s.districtsCovered} color="primary" />
            <KpiTile label={t("kpi.tradesAnalysed")} value={s.tradesAnalysed} color="green" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "36px 24px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24 }}>Platform Capabilities</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "18px 20px", boxShadow: "var(--shadow-sm)", borderTop: `3px solid ${f.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ background: f.color + "18", borderRadius: 6, padding: 8 }}>
                  <f.Icon size={18} color={f.color} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{f.title}</div>
              </div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: "var(--color-primary)", color: "#fff", padding: "36px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Start Exploring the Dashboard</h2>
          <p style={{ fontSize: 13, color: "#a8c4e8", lineHeight: 1.7, marginBottom: 20 }}>
            View real-time skill gap analysis across 20 states, 720 districts, and 86 trades. All data is synthetic and for demonstration only.
          </p>
          <button
            onClick={() => navigate("/overview")}
            style={{ background: "var(--color-accent)", color: "#fff", border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            Open National Overview <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
