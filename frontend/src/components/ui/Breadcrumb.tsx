import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "": "Home",
  overview: "National Overview",
  gaps: "Skill Gap Ranking",
  alerts: "Early Warning Alerts",
  recommendations: "Recommendations",
  methodology: "Methodology",
  sources: "Data Sources",
  "api-docs": "API Documentation",
  state: "State",
  district: "District",
  trade: "Trade Forecast",
};

export default function Breadcrumb() {
  const location = useLocation();
  if (location.pathname === "/") return null;

  const parts = location.pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "National", to: "/" }, ...parts.map((p, i) => ({
    label: ROUTE_LABELS[p] ?? p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    to: "/" + parts.slice(0, i + 1).join("/"),
  }))];

  return (
    <nav aria-label="Breadcrumb" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "6px 0" }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
        {crumbs.map((c, i) => (
          <span key={c.to} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {i < crumbs.length - 1 ? (
              <Link to={c.to} style={{ color: "var(--color-primary-light)", textDecoration: "none" }}>{c.label}</Link>
            ) : (
              <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }} aria-current="page">{c.label}</span>
            )}
            {i < crumbs.length - 1 && <ChevronRight size={12} />}
          </span>
        ))}
      </div>
    </nav>
  );
}

