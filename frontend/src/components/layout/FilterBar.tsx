import { useTranslation } from "react-i18next";
import { useFilters } from "../../context/FilterContext";
import { mockStates, mockDistricts, mockSectors } from "../../mocks/data";
import { X } from "lucide-react";

const NSQF_LEVELS = ["1", "2", "3", "4", "5", "6", "7"];
const HORIZONS = [
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" },
];

function Sel({ label, value, onChange, children }: { label: string; value?: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 130 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "5px 8px",
          fontSize: 12, color: "var(--color-text-primary)", background: "var(--color-surface)",
          cursor: "pointer", outline: "none", height: 30,
        }}
      >
        {children}
      </select>
    </div>
  );
}

export default function FilterBar() {
  const { t } = useTranslation();
  const { filters, setFilter, clearFilters } = useFilters();
  const districts = filters.stateId ? mockDistricts.filter((d) => d.stateId === filters.stateId) : mockDistricts;
  const hasFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div style={{
      background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)",
      padding: "10px 0", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <Sel label={t("filter.state")} value={filters.stateId} onChange={(v) => { setFilter("stateId", v || undefined); setFilter("districtId", undefined); }}>
          <option value="">All States</option>
          {mockStates.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Sel>

        <Sel label={t("filter.district")} value={filters.districtId} onChange={(v) => setFilter("districtId", v || undefined)}>
          <option value="">All Districts</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Sel>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("filter.aspirational")}</label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, height: 30, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={filters.isAspirational === true} onChange={(e) => setFilter("isAspirational", e.target.checked ? true : undefined)} />
            Aspirational Only
          </label>
        </div>

        <Sel label={t("filter.sector")} value={filters.sectorId} onChange={(v) => setFilter("sectorId", v || undefined)}>
          <option value="">All Sectors</option>
          {mockSectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Sel>

        <Sel label={t("filter.nsqf")} value={filters.nsqfLevel} onChange={(v) => setFilter("nsqfLevel", v || undefined)}>
          <option value="">All Levels</option>
          {NSQF_LEVELS.map((l) => <option key={l} value={l}>NSQF L{l}</option>)}
        </Sel>

        <Sel label={t("filter.horizon")} value={filters.horizon} onChange={(v) => setFilter("horizon", v || undefined)}>
          <option value="">Select Horizon</option>
          {HORIZONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </Sel>

        {hasFilters && (
          <button
            onClick={clearFilters}
            aria-label={t("filter.clear")}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "var(--color-critical-shortage)", color: "#fff",
              border: "none", borderRadius: "var(--radius-sm)",
              padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600,
              height: 30, alignSelf: "flex-end",
            }}
          >
            <X size={12} />{t("filter.clear")}
          </button>
        )}
      </div>
    </div>
  );
}
