import { useConfig } from "../../context/ConfigContext";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Footer() {
  const { config } = useConfig();
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer role="contentinfo" style={{ background: "var(--color-primary-dark)", color: "#8a9db5", marginTop: "auto" }}>
      {/* Tricolour strip */}
      <div style={{ height: 4, background: "linear-gradient(to right,#ff9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)" }} />
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "28px 24px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{config.appName}</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>{config.appTagline}</div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#6a7d95" }}>Smart India Hackathon 2026 · PS 26246</div>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Platform</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[["National Overview", "/overview"],["Skill Gap Ranking", "/gaps"],["Early Warning Alerts", "/alerts"],["Recommendations", "/recommendations"]].map(([label, to]) => (
                <Link key={to} to={to} style={{ color: "#8a9db5", textDecoration: "none", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#cce0f7")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8a9db5")}
                >{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Resources</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[["Methodology", "/methodology"],["Data Sources", "/sources"],["API Documentation", "/api-docs"]].map(([label, to]) => (
                <Link key={to} to={to} style={{ color: "#8a9db5", textDecoration: "none", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#cce0f7")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#8a9db5")}
                >{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Data Notice</div>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: "#6a7d95" }}>
              All data shown is synthetic, generated for demonstration purposes in support of SIH 2026. Not for policy use.
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #2a3a50", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 11 }}>© {year} AI-LMIS · Built for Ministry of Skill Development &amp; Entrepreneurship</div>
          <div style={{ fontSize: 11 }}>{t("common.lastUpdated")}: 17 Oct 2026 · <span style={{ color: "#f5a623" }}>Demo data — synthetic</span></div>
        </div>
      </div>
    </footer>
  );
}
