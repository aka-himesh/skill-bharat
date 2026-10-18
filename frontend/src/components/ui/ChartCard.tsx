import { useState, type ReactNode } from "react";
import { Info, Download, Table, BarChart2 } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  info?: string;
  children: ReactNode;
  tableView?: ReactNode;
  onDownload?: () => void;
  ariaLabel?: string;
}

export default function ChartCard({ title, subtitle, info, children, tableView, onDownload, ariaLabel }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}
      role="region"
      aria-label={ariaLabel ?? title}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 16px 8px", borderBottom: "1px solid var(--color-border)", gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {info && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowInfo(!showInfo)}
                aria-label="More information"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4, display: "flex" }}
              >
                <Info size={14} />
              </button>
              {showInfo && (
                <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid var(--color-border)", borderRadius: 4, padding: "8px 12px", fontSize: 11, width: 220, boxShadow: "var(--shadow-md)", zIndex: 100, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  {info}
                </div>
              )}
            </div>
          )}
          {tableView && (
            <button
              onClick={() => setShowTable(!showTable)}
              aria-label={showTable ? "View as chart" : "View as table"}
              title={showTable ? "View as chart" : "View as table"}
              style={{ background: showTable ? "var(--color-surface-alt)" : "transparent", border: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-text-secondary)", padding: "3px 6px", borderRadius: 3, display: "flex", alignItems: "center" }}
            >
              {showTable ? <BarChart2 size={13} /> : <Table size={13} />}
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              aria-label="Download chart data"
              title="Download CSV"
              style={{ background: "transparent", border: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-text-secondary)", padding: "3px 6px", borderRadius: 3, display: "flex", alignItems: "center" }}
            >
              <Download size={13} />
            </button>
          )}
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: "12px 16px" }}>
        {showTable && tableView ? tableView : children}
      </div>
    </div>
  );
}
