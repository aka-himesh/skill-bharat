import { useTranslation } from "react-i18next";
import { useA11y } from "../../context/AccessibilityContext";
import { useConfig } from "../../context/ConfigContext";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

export default function UtilityBar() {
  const { t, i18n } = useTranslation();
  const { textSize, setTextSize, highContrast, toggleContrast } = useA11y();
  const { config } = useConfig();

  return (
    <div
      role="navigation"
      aria-label="Utility navigation"
      style={{
        background: "var(--color-util-bar)",
        color: "#cdd5e0",
        fontSize: "11px",
        padding: "4px 0",
        borderBottom: "1px solid #2a3a50",
      }}
    >
      <a href="#main-content" className="skip-link">{t("util.skipToContent")}</a>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Left: Platform breadcrumb */}
        <span style={{ color: "#8a9db5", fontSize: 11 }}>
          Ministry of Skill Development &amp; Entrepreneurship &nbsp;|&nbsp; {config.appShortName}
        </span>
        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Text size */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#8a9db5", marginRight: 4, fontSize: 11 }}>{t("util.fontSize")}:</span>
            {(["sm", "md", "lg"] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setTextSize(s)}
                aria-pressed={textSize === s}
                aria-label={`Text size ${["small", "medium", "large"][i]}`}
                style={{
                  background: textSize === s ? "var(--color-accent)" : "transparent",
                  border: "1px solid",
                  borderColor: textSize === s ? "var(--color-accent)" : "#3a4a60",
                  color: textSize === s ? "#fff" : "#8a9db5",
                  borderRadius: 3,
                  padding: "1px 6px",
                  cursor: "pointer",
                  fontSize: [10, 12, 14][i],
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}
              >
                A
              </button>
            ))}
          </div>
          {/* Contrast */}
          <button
            onClick={toggleContrast}
            aria-pressed={highContrast}
            aria-label={t("util.contrast")}
            style={{ background: highContrast ? "var(--color-accent)" : "transparent", border: "1px solid #3a4a60", color: highContrast ? "#fff" : "#8a9db5", borderRadius: 3, padding: "1px 8px", cursor: "pointer", fontSize: 11 }}
          >
            {t("util.contrast")}
          </button>
          {/* Language */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); localStorage.setItem("lang", lang.code); }}
                aria-current={i18n.language === lang.code ? "true" : undefined}
                style={{
                  background: i18n.language === lang.code ? "var(--color-accent)" : "transparent",
                  border: "none",
                  color: i18n.language === lang.code ? "#fff" : "#8a9db5",
                  cursor: "pointer",
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 3,
                  fontFamily: "var(--font-family)",
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
