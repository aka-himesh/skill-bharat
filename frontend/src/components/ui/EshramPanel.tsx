/**
 * EshramPanel.tsx — e-Shram worker registration panel.
 *
 * Shows registered unorganised worker counts from the data.gov.in API.
 * Clearly labelled as a SUPPLY-SIDE / workforce-size indicator — NOT vacancies.
 *
 * Features:
 *   - State ranking bar chart (horizontal)
 *   - District table (sortable, searchable)
 *   - Demographic breakdown for a selected district
 *   - "Live from data.gov.in" / "Cached" / "2025 Data" badge
 *   - Attribution link to data.gov.in
 */
import { useState } from "react";
import { useEshramSummary, useEshramDistricts } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { mockEshramSummary } from "../../mocks/data";
import type { EshramDistrictRow, EshramSummaryResponse } from "../../types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, Search, ExternalLink, Database } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return String(n);
}

function fmtFull(n: number): string {
  return n.toLocaleString("en-IN");
}

type DataSource = "live" | "cached" | "synthetic";

function ProvBadge({ source, snapshotDate }: { source: DataSource; snapshotDate: string | null }) {
  const conf: Record<DataSource, { label: string; bg: string; color: string; border: string }> = {
    live:      { label: "Live · data.gov.in", bg: "#f0faf4", color: "#138808", border: "#a8dfc0" },
    cached:    { label: "Cached · data.gov.in", bg: "#eef5fc", color: "#2980b9", border: "#9ab3e0" },
    synthetic: { label: "2025 Data", bg: "#f0f4f8", color: "#475569", border: "#cbd5e1" },
  };
  const c = conf[source] ?? conf.synthetic;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      <Database size={8} /> {c.label}
      {snapshotDate && source !== "synthetic" && ` · as on ${snapshotDate}`}
    </span>
  );
}

// ── Demographic Breakdown ─────────────────────────────────────────────────────

const PIE_COLORS = ["#154590", "#f58220", "#138808", "#c0392b", "#8e44ad"];

function DemographicBreakdown({ row }: { row: EshramDistrictRow }) {
  const genderData = [
    { name: "Male", value: row.male },
    { name: "Female", value: row.female },
  ];
  const ageData = [
    { name: "18–40", value: row.age_18_40 },
    { name: "40+", value: row.age_40_plus },
  ];
  const casteData = [
    { name: "SC", value: row.sc },
    { name: "ST", value: row.st },
    { name: "OBC", value: row.obc },
    { name: "General", value: row.general },
  ].filter(d => d.value > 0);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>
        Demographic Breakdown — {row.district}
        <span style={{ fontWeight: 400, color: "var(--color-text-muted)", marginLeft: 8 }}>
          Total: {fmtFull(row.registered_workers_total)} registered workers
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {/* Gender */}
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4, textAlign: "center" }}>Gender</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value">
                {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => fmtFull(Number(v))} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Age */}
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4, textAlign: "center" }}>Age Group</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={ageData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value">
                {ageData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i + 2]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => fmtFull(Number(v))} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Caste */}
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4, textAlign: "center" }}>Category</div>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie data={casteData} cx="50%" cy="50%" outerRadius={40} dataKey="value">
                {casteData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: unknown) => fmtFull(Number(v))} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── State Bar Chart ───────────────────────────────────────────────────────────

function StateBarChart({ data }: { data: EshramSummaryResponse }) {
  const chartData = data.state_totals.slice(0, 8).map(s => ({
    state: s.state.replace(" Pradesh", " Pr.").replace("Uttar Pr.", "UP").replace("Madhya Pr.", "MP"),
    total: s.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12 }}>
        <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9 }} />
        <YAxis type="category" dataKey="state" width={55} tick={{ fontSize: 9 }} />
        <Tooltip formatter={(v: unknown) => [fmtFull(Number(v)), "Registered Workers"]} />
        <Bar dataKey="total" fill="var(--color-primary, #154590)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── District Table ─────────────────────────────────────────────────────────────

function DistrictTable({
  rows, selectedDistrict, onSelect,
}: {
  rows: EshramDistrictRow[];
  selectedDistrict: string | null;
  onSelect: (d: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = rows
    .filter(r => !q || r.district.toLowerCase().includes(q.toLowerCase()) || r.state.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sortDir === "desc"
      ? b.registered_workers_total - a.registered_workers_total
      : a.registered_workers_total - b.registered_workers_total
    );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 5, padding: "4px 8px", flex: 1 }}>
          <Search size={11} color="var(--color-text-muted)" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search district or state…"
            style={{ border: "none", background: "transparent", outline: "none", fontSize: 11, width: "100%", color: "var(--color-text-primary)" }}
          />
        </div>
        <button
          onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
          style={{ fontSize: 10, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "var(--color-text-secondary)" }}
        >
          Workers {sortDir === "desc" ? "▼" : "▲"}
        </button>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 4, border: "1px solid var(--color-border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)", position: "sticky", top: 0 }}>
              {["District", "State", "Registered Workers", "M/F Split"].map(h => (
                <th key={h} style={{ padding: "6px 10px", textAlign: h.includes("Workers") || h.includes("M/F") ? "right" : "left", fontWeight: 700, fontSize: 10, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map(row => (
              <tr
                key={`${row.state}-${row.district}`}
                onClick={() => onSelect(selectedDistrict === row.district ? null : row.district)}
                style={{
                  cursor: "pointer", background: selectedDistrict === row.district ? "var(--color-primary-bg, #eaf0fb)" : "transparent",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <td style={{ padding: "5px 10px", fontWeight: 600, color: "var(--color-text-primary)" }}>{row.district}</td>
                <td style={{ padding: "5px 10px", color: "var(--color-text-secondary)" }}>{row.state}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700 }}>{fmtFull(row.registered_workers_total)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: "var(--color-text-muted)", fontSize: 10 }}>
                  {row.male > 0 ? `${Math.round(row.male / row.registered_workers_total * 100)}M / ${Math.round(row.female / row.registered_workers_total * 100)}F` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface EshramPanelProps {
  /** Optional state filter for state drilldown pages */
  stateFilter?: string;
  /** Optional pre-selected district (from URL params) */
  initialDistrict?: string;
}

export default function EshramPanel({ stateFilter, initialDistrict }: EshramPanelProps) {
  const { isLoggedIn } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(initialDistrict ?? null);

  const { data: summaryData, isLoading: summaryLoading } = useEshramSummary(stateFilter, isLoggedIn);
  const { data: districtsData, isLoading: districtsLoading } = useEshramDistricts(
    { state: stateFilter }, isLoggedIn
  );

  const summary = summaryData ?? mockEshramSummary;
  const districtRows = districtsData?.rows ?? summary.top_districts;
  const source = summaryData?.source ?? "synthetic";
  const snapshotDate = summaryData?.snapshot_date ?? null;

  const selectedRow = selectedDistrict
    ? districtRows.find(r => r.district === selectedDistrict) ?? null
    : null;

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={14} color="var(--color-primary)" />
          <span style={{ fontWeight: 700, fontSize: 13 }}>e-Shram — Unorganised Worker Registrations</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ProvBadge source={source} snapshotDate={snapshotDate} />
          <a
            href="https://data.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open data.gov.in dataset"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Attribution <ExternalLink size={8} />
          </a>
        </div>
      </div>

      {/* Methodology note */}
      <div style={{ padding: "6px 16px", background: "#fef6ee", borderBottom: "1px solid var(--color-border)", fontSize: 10, color: "#7d6b2e" }}>
        ⚠ Registrations measure <strong>workforce size</strong> (supply-side indicator), not job vacancies. Used for district weighting in the demand index.
      </div>

      {/* National KPI */}
      {summaryLoading ? (
        <div style={{ padding: "16px", display: "flex", gap: 12 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 40, flex: 1, background: "var(--color-border)", borderRadius: 6, animation: "pulse 1.4s ease infinite" }} />)}
        </div>
      ) : (
        <div style={{ padding: "10px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "8px 14px", minWidth: 140 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>{fmt(summary.national_total)}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>National Total {stateFilter ? `(${stateFilter})` : ""}</div>
          </div>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "8px 14px", minWidth: 140 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#138808" }}>{summary.record_count}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600 }}>Districts Tracked</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: stateFilter ? "1fr" : "1fr 1fr", gap: 0 }}>
        {/* State bar chart (only on national view) */}
        {!stateFilter && (
          <div style={{ padding: "12px 16px", borderRight: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              Top States by Registrations
            </div>
            {summaryLoading
              ? <div style={{ height: 180, background: "var(--color-border)", borderRadius: 4, animation: "pulse 1.4s ease infinite" }} />
              : <StateBarChart data={summary} />
            }
          </div>
        )}

        {/* District table */}
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            District Data {selectedDistrict && <span style={{ fontWeight: 400 }}>— click row to see breakdown</span>}
          </div>
          {districtsLoading
            ? <div style={{ height: 220, background: "var(--color-border)", borderRadius: 4, animation: "pulse 1.4s ease infinite" }} />
            : <DistrictTable rows={districtRows} selectedDistrict={selectedDistrict} onSelect={setSelectedDistrict} />
          }
        </div>
      </div>

      {/* Demographic breakdown for selected district */}
      {selectedRow && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--color-border)" }}>
          <DemographicBreakdown row={selectedRow} />
        </div>
      )}
    </div>
  );
}
