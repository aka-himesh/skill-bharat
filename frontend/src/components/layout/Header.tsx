import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConfig } from "../../context/ConfigContext";
import { useAuth } from "../../context/AuthContext";
import { Menu, X, ChevronDown, Search, LogIn, LogOut } from "lucide-react";

const NAV = [
  { key: "home", to: "/" },
  {
    key: "overview", to: "/overview",
    children: [
      { key: "overview", to: "/overview" },
      { key: "gaps", to: "/gaps" },
    ],
  },
  { key: "alerts", to: "/alerts" },
  { key: "recommendations", to: "/recommendations" },
  {
    key: "methodology", to: "/methodology",
    children: [
      { key: "methodology", to: "/methodology" },
      { key: "sources", to: "/sources" },
      { key: "docs", to: "/api-docs" },
    ],
  },
];

export default function Header() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const { isLoggedIn, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <header
      style={{ background: "var(--color-header-bg)", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      role="banner"
    >
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Logo block */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#fff" }}>
            <div style={{
              width: 44, height: 44, background: "linear-gradient(135deg,#e8601c,#f5a623)",
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, border: "2px solid rgba(255,255,255,0.25)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l9-13 9 13"/><path d="M5 17h14"/><path d="M9 12h6"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.3px" }}>{config.appShortName}</div>
              <div style={{ fontSize: 10, color: "#a8c4e8", lineHeight: 1.3, maxWidth: 260 }}>{config.appTagline}</div>
            </div>
          </Link>

          {/* Demo badge */}
          <div style={{
            background: "#f5a623", color: "#1a2332", fontSize: 10, fontWeight: 700,
            padding: "3px 8px", borderRadius: 4, letterSpacing: 0.3, whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a2332", display: "inline-block" }} />
            {t("header.demoData")}
          </div>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV.map((item) => (
              <div key={item.key} style={{ position: "relative" }}
                onMouseEnter={() => item.children && setOpenMenu(item.key)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Link
                  to={item.to}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  aria-haspopup={item.children ? "true" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "8px 12px", borderRadius: 4, textDecoration: "none",
                    color: isActive(item.to) ? "#fff" : "#cce0f7",
                    background: isActive(item.to) ? "rgba(255,255,255,0.15)" : "transparent",
                    fontSize: 13, fontWeight: isActive(item.to) ? 600 : 500,
                    transition: "background 0.15s",
                  }}
                >
                  {t(`nav.${item.key}`)}
                  {item.children && <ChevronDown size={12} />}
                </Link>
                {item.children && openMenu === item.key && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, background: "#fff",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)", borderRadius: 6,
                    minWidth: 180, zIndex: 200, border: "1px solid var(--color-border)",
                    padding: "4px 0",
                  }}>
                    {item.children.map((child) => (
                      <Link
                        key={child.key}
                        to={child.to}
                        style={{
                          display: "block", padding: "8px 16px", color: "var(--color-text-primary)",
                          textDecoration: "none", fontSize: 13,
                          background: isActive(child.to) ? "var(--color-surface-alt)" : "transparent",
                          fontWeight: isActive(child.to) ? 600 : 400,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-alt)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isActive(child.to) ? "var(--color-surface-alt)" : "transparent")}
                      >
                        {t(`nav.${child.key}`)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Search + Auth + MSDE badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button aria-label="Search" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 4, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <Search size={15} />
            </button>
            {isLoggedIn ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, background: "rgba(19,136,8,0.25)", border: "1px solid #138808", borderRadius: 4, padding: "3px 8px", color: "#a8dfc0", fontWeight: 600 }}>
                  Officer (PIN: 26246)
                </span>
                <button
                  onClick={logout}
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  title="Logout"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                style={{ background: "var(--color-accent, #e8601c)", border: "none", color: "#fff", borderRadius: 4, padding: "4px 10px", textDecoration: "none", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
              >
                <LogIn size={13} /> Login
              </Link>
            )}
            <span style={{ fontSize: 10, color: "#7aa8cc", background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "4px 8px", border: "1px solid rgba(255,255,255,0.12)" }}>
              {t("header.builtFor")}
            </span>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md-hide"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div style={{ background: "var(--color-primary-dark)", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "8px 0" }}>
          {NAV.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              style={{ display: "block", padding: "10px 24px", color: "#cce0f7", textDecoration: "none", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
