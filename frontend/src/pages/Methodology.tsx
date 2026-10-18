import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockMethodology } from "../mocks/data";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";

function Accordion({ step, defaultOpen = false }: { step: typeof mockMethodology[0]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: open ? "var(--color-surface-alt)" : "var(--color-surface)", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {step.id.replace("m", "")}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{step.title}</span>
        </div>
        {open ? <ChevronUp size={16} color="var(--color-text-secondary)" /> : <ChevronDown size={16} color="var(--color-text-secondary)" />}
      </button>
      {open && (
        <div style={{ padding: "16px 16px 16px 54px", borderTop: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "0 0 12px" }}>{step.description}</p>
          {step.formula && (
            <div style={{ background: "#f0f3f8", border: "1px solid var(--color-border)", borderRadius: 4, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--color-primary)", whiteSpace: "pre-line", marginBottom: 12 }}>
              {step.formula}
            </div>
          )}
          {step.references.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 6 }}>References</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {step.references.map((r, i) => <li key={i} style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{r}</li>)}
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
  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("methodology.title")}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{t("methodology.subtitle")}</p>
        </div>
      </div>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
          {/* Sidebar summary */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 18, height: "fit-content", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <BookOpen size={16} color="var(--color-primary)" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Methodology Overview</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {mockMethodology.map((s) => (
                <li key={s.id} style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{s.title}</span>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--color-surface-alt)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
              All data shown is synthetic. The methodology documents how the production system would function.
            </div>
          </div>
          {/* Accordion steps */}
          <div>
            {mockMethodology.map((step, i) => <Accordion key={step.id} step={step} defaultOpen={i === 0} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
