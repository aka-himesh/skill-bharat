import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockMethodology } from "../mocks/data";
import { ChevronDown, ChevronUp, BookOpen, Radio, Terminal } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMethodology } from "../hooks/useApi";

function Accordion({
  step,
  defaultOpen = false,
}: {
  step: { id: string; title: string; description: string; formula?: string; references: string[]; scriptFile?: string };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          background: open ? "var(--color-surface-alt)" : "var(--color-surface)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--color-primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {step.id.replace("m", "")}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{step.title}</span>
        </div>
        {open ? <ChevronUp size={16} color="var(--color-text-secondary)" /> : <ChevronDown size={16} color="var(--color-text-secondary)" />}
      </button>
      {open && (
        <div style={{ padding: "16px 16px 16px 54px", borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "0 0 12px" }}>
            {step.description}
          </p>
          {step.scriptFile && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
              <Terminal size={13} color="var(--color-primary)" />
              <span>Pipeline Module: <code style={{ fontFamily: "monospace", color: "var(--color-primary)", background: "var(--color-surface-alt)", padding: "1px 5px", borderRadius: 3 }}>{step.scriptFile}</code></span>
            </div>
          )}
          {step.formula && (
            <div
              style={{
                background: "#f0f3f8",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: "10px 14px",
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--color-primary)",
                whiteSpace: "pre-line",
                marginBottom: 12,
              }}
            >
              {step.formula}
            </div>
          )}
          {step.references.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                References
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {step.references.map((r, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Methodology() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { data: apiMethodology } = useMethodology(isLoggedIn);

  const isLive = isLoggedIn && !!apiMethodology?.pipeline_steps?.length;

  type StepItem = {
    id: string;
    title: string;
    description: string;
    formula?: string;
    references: string[];
    scriptFile?: string;
  };

  let steps: StepItem[] = mockMethodology.map((m) => ({ ...m }));

  if (isLive && apiMethodology?.pipeline_steps) {
    steps = apiMethodology.pipeline_steps.map((ps) => {
      const existing = mockMethodology.find((m) => m.id === `m${ps.step}`);
      return {
        id: `m${ps.step}`,
        title: `Step ${ps.step}: ${ps.name}`,
        description: ps.description || existing?.description || "",
        formula: existing?.formula,
        references: existing?.references || ["MSDE / NSDC Methodology Framework"],
        scriptFile: ps.file,
      };
    });
  }

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {apiMethodology?.title || t("methodology.title")}
            </h1>
            {isLive ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, background: "#f0faf4", color: "#138808", border: "1px solid #a8dfc0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                <Radio size={11} className="animate-pulse" /> LIVE PIPELINE DOCS v{apiMethodology?.version || "1.0"}
              </span>
            ) : (
              <span style={{ fontSize: 11, background: "#fef6ee", color: "#e67e22", border: "1px solid #fcd8b0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                METHODOLOGY SPECIFICATION
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{t("methodology.subtitle")}</p>
        </div>
      </div>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
          {/* Sidebar summary */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 18,
              height: "fit-content",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <BookOpen size={16} color="var(--color-primary)" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Methodology Overview</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {steps.map((s) => (
                <li key={s.id} style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{s.title}</span>
                </li>
              ))}
            </ol>
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                background: "var(--color-surface-alt)",
                borderRadius: "var(--radius-sm)",
                fontSize: 11,
                color: "var(--color-text-muted)",
                lineHeight: 1.6,
              }}
            >
              {apiMethodology?.disclaimer ||
                "Methodology documents the analytical pipeline executing demand-supply econometric synthesis."}
            </div>
          </div>
          {/* Accordion steps */}
          <div>
            {steps.map((step, i) => (
              <Accordion key={step.id} step={step} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
