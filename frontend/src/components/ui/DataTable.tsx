import { useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  ariaLabel?: string;
  stickyHeader?: boolean;
}

export default function DataTable<T extends object>({ columns, data, pageSize = 15, onRowClick, ariaLabel = "Data table", stickyHeader }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as Record<string, unknown>)[sortKey];
    const bv = (b as Record<string, unknown>)[sortKey];
    if (av === bv) return 0;
    const gt = av! > bv!;
    return sortDir === "asc" ? (gt ? 1 : -1) : (gt ? -1 : 1);
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  return (
    <div>
      <div className="table-scroll">
        <table
          role="grid"
          aria-label={ariaLabel}
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr style={{ background: "var(--color-primary)", color: "#fff" }}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  aria-sort={sortKey === String(col.key) ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  style={{
                    padding: "9px 12px", textAlign: col.align ?? "left", fontWeight: 600,
                    fontSize: 11, letterSpacing: 0.3, whiteSpace: "nowrap",
                    position: stickyHeader ? "sticky" : undefined, top: 0,
                    width: col.width, cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => col.sortable && toggleSort(String(col.key))}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: col.align === "right" ? "flex-end" : "flex-start" }}>
                    {col.header}
                    {col.sortable && (
                      sortKey === String(col.key)
                        ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                        : <ChevronsUpDown size={11} style={{ opacity: 0.5 }} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)", fontSize: 13 }}>No data available</td></tr>
            )}
            {paged.map((row, i) => (
              <tr
                key={i}
                className="zebra-row"
                onClick={() => onRowClick?.(row)}
                onKeyDown={(e) => e.key === "Enter" && onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                style={{
                  cursor: onRowClick ? "pointer" : "default",
                  borderBottom: "1px solid var(--color-border)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = "var(--color-surface-alt)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                {columns.map((col) => {
                  const raw = (row as Record<string, unknown>)[String(col.key)];
                  return (
                    <td key={String(col.key)} style={{ padding: "8px 12px", textAlign: col.align ?? "left", color: "var(--color-text-primary)" }}>
                      {col.render ? col.render(row) : String(raw ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderTop: "1px solid var(--color-border)", fontSize: 12, color: "var(--color-text-secondary)" }}>
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button disabled={page === 1} onClick={() => setPage(1)} style={pgBtn(page === 1)}>«</button>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={pgBtn(page === 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{ ...pgBtn(false), background: p === page ? "var(--color-primary)" : undefined, color: p === page ? "#fff" : undefined, fontWeight: p === page ? 700 : 400 }}>{p}</button>
              );
            })}
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} style={pgBtn(page === totalPages)}>›</button>
            <button disabled={page === totalPages} onClick={() => setPage(totalPages)} style={pgBtn(page === totalPages)}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}

function pgBtn(disabled: boolean): React.CSSProperties {
  return { border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 3, padding: "3px 8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, fontSize: 12 };
}
