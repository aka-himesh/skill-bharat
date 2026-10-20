import React, { useId, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFilters } from "../../context/FilterContext";
import { useAuth } from "../../context/AuthContext";
import { useDistricts, useSectors, useStates } from "../../hooks/useApi";
import { DEFAULT_PILOT_STATES } from "../../services/api";
import { X, Filter, Search, RotateCcw, Award } from "lucide-react";

const NSQF_LEVELS = ["1", "2", "3", "4", "5", "6", "7"];
const HORIZONS = [
  { value: "1y", label: "1 Year (FY25-26)" },
  { value: "2y", label: "2 Years (FY26-27)" },
  { value: "5y", label: "5 Years (FY29-30)" },
];

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--color-primary-dark, #0f2447)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 3,
  display: "flex",
  alignItems: "center",
  gap: 4,
  userSelect: "none",
};

function getSelectStyle(disabled: boolean): React.CSSProperties {
  return {
    height: 34,
    minWidth: 140,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "var(--font-family)",
    color: disabled ? "var(--color-text-muted)" : "var(--color-text-primary)",
    background: disabled ? "var(--color-surface-alt, #f4f6f9)" : "#ffffff",
    border: disabled ? "1px solid #d1d5db" : "1px solid #94a3b8",
    borderRadius: "var(--radius-sm, 4px)",
    cursor: disabled ? "not-allowed" : "pointer",
    outline: "none",
    boxShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  };
}

interface SelProps {
  id: string;
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function Sel({ id, label, value, onChange, disabled = false, title, children }: SelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label htmlFor={id} style={LABEL_STYLE} title={title}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={getSelectStyle(disabled)}
        aria-label={label}
        title={title}
      >
        {children}
      </select>
    </div>
  );
}

export default function FilterBar() {
  const { t } = useTranslation();
  const uid = useId();
  const { filters, setFilters, clearFilters } = useFilters();
  const { isLoggedIn } = useAuth();

  // Load states: use API query, fallback to DEFAULT_PILOT_STATES
  const { data: apiStates = [] } = useStates(true);
  const states = apiStates.length > 0 ? apiStates : DEFAULT_PILOT_STATES;

  // Numeric state ID if present
  const numericStateId = filters.stateId && /^\d+$/.test(filters.stateId)
    ? Number(filters.stateId)
    : undefined;

  // Districts cascade from selected state
  const { data: apiDistricts = [], isLoading: districtsLoading } = useDistricts(
    numericStateId,
    Boolean(numericStateId)
  );

  // Sectors
  const { data: sectors = [] } = useSectors(true);

  // Local state for search keyword input
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  useEffect(() => {
    setSearchInput(filters.q ?? "");
  }, [filters.q]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ q: searchInput.trim() || undefined });
  };

  const handleStateChange = (newVal: string) => {
    // Atomically set new state and clear district selection
    setFilters({
      stateId: newVal || undefined,
      districtId: undefined,
    });
  };

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && v !== false && v !== ""
  ).length;

  const hasFilters = activeCount > 0;

  // Selected names for chips
  const activeStateObj = states.find(
    (s) => String(s.id) === filters.stateId || s.code.toLowerCase() === (filters.stateId ?? "").toLowerCase()
  );
  const activeDistrictObj = apiDistricts.find((d) => String(d.id) === filters.districtId);
  const activeSectorObj = sectors.find(
    (s) => String(s.id) === filters.sectorId || s.code.toLowerCase() === (filters.sectorId ?? "").toLowerCase()
  );

  return (
    <div
      role="search"
      aria-label="National Labour Market Query Filters"
      style={{
        background: "#ffffff",
        borderBottom: "2px solid #0f2447",
        boxShadow: "0 2px 8px rgba(15, 36, 71, 0.08)",
      }}
    >
      {/* ── Main Filter Controls ── */}
      <div
        style={{
          maxWidth: "var(--container-max, 1280px)",
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Portal Filter Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            paddingBottom: 6,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: "4px",
              background: "#0f2447",
              color: "#ffffff",
            }}
          >
            <Filter size={14} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#0f2447",
                letterSpacing: "0.5px",
                lineHeight: 1.1,
              }}
            >
              FILTER DATA
            </div>
            <div style={{ fontSize: 9, color: "var(--color-text-secondary, #64748b)" }}>
              Official Pilot Scope
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 32,
            background: "#cbd5e1",
            flexShrink: 0,
            alignSelf: "center",
          }}
        />

        {/* SEARCH TRADE / OCCUPATION */}
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", flexDirection: "column", minWidth: 160, flex: "1 1 180px" }}
        >
          <label htmlFor={`${uid}-search`} style={LABEL_STYLE}>
            <Search size={11} /> Trade / Keyword
          </label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              id={`${uid}-search`}
              type="text"
              placeholder="e.g. Welder, Electrician..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onBlur={() => setFilters({ q: searchInput.trim() || undefined })}
              style={{
                height: 34,
                width: "100%",
                padding: "0 28px 0 10px",
                fontSize: 12,
                fontFamily: "var(--font-family)",
                border: "1px solid #94a3b8",
                borderRadius: "var(--radius-sm, 4px)",
                outline: "none",
                background: "#ffffff",
              }}
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setFilters({ q: undefined });
                }}
                style={{
                  position: "absolute",
                  right: 6,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 2,
                  display: "flex",
                }}
                aria-label="Clear keyword search"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        </form>

        {/* STATE SELECT */}
        <Sel
          id={`${uid}-state`}
          label={t("filter.state", "State / UT")}
          value={filters.stateId}
          onChange={handleStateChange}
          title="Select a pilot state to filter district and gap data"
        >
          <option value="">All Pilot States (4)</option>
          {states.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name} ({s.code})
            </option>
          ))}
        </Sel>

        {/* DISTRICT SELECT (Cascades from state) */}
        <Sel
          id={`${uid}-district`}
          label={t("filter.district", "District")}
          value={filters.districtId}
          onChange={(v) => setFilters({ districtId: v || undefined })}
          disabled={!filters.stateId}
          title={!filters.stateId ? "Please choose a state first" : "Select district"}
        >
          <option value="">
            {!filters.stateId
              ? "— Choose State First —"
              : districtsLoading
              ? "Loading districts…"
              : `All Districts (${apiDistricts.length})`}
          </option>
          {apiDistricts.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name} {d.is_aspirational ? "★ [Aspirational]" : ""}
            </option>
          ))}
        </Sel>

        {/* SECTOR SELECT */}
        <Sel
          id={`${uid}-sector`}
          label={t("filter.sector", "Sector")}
          value={filters.sectorId}
          onChange={(v) => setFilters({ sectorId: v || undefined })}
          title="Filter by industrial / vocational sector"
        >
          <option value="">All Sectors ({sectors.length || 10})</option>
          {sectors.map((sec) => (
            <option key={sec.id} value={String(sec.id)}>
              {sec.name}
            </option>
          ))}
        </Sel>

        {/* NSQF LEVEL */}
        <Sel
          id={`${uid}-nsqf`}
          label={t("filter.nsqf", "NSQF Level")}
          value={filters.nsqfLevel}
          onChange={(v) => setFilters({ nsqfLevel: v || undefined })}
          title="National Skills Qualifications Framework level"
        >
          <option value="">All NSQF Levels</option>
          {NSQF_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              Level {lvl}
            </option>
          ))}
        </Sel>

        {/* HORIZON SELECT */}
        <Sel
          id={`${uid}-horizon`}
          label={t("filter.horizon", "Forecast Horizon")}
          value={filters.horizon}
          onChange={(v) => setFilters({ horizon: v || undefined })}
          title="SARIMA-XGBoost econometric forecasting time window"
        >
          <option value="">Standard (Current FY)</option>
          {HORIZONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </Sel>

        {/* ASPIRATIONAL ONLY CHECKBOX */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 50 }}>
          <label
            htmlFor={`${uid}-asp`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: "0 10px",
              background: filters.isAspirational ? "#fef3c7" : "#f8fafc",
              border: filters.isAspirational ? "1px solid #d97706" : "1px solid #cbd5e1",
              borderRadius: "var(--radius-sm, 4px)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              color: filters.isAspirational ? "#92400e" : "#475569",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
            title="NITI Aayog Aspirational Districts Initiative filter"
          >
            <input
              id={`${uid}-asp`}
              type="checkbox"
              checked={filters.isAspirational === true}
              onChange={(e) => setFilters({ isAspirational: e.target.checked ? true : undefined })}
              style={{ accentColor: "#d97706", cursor: "pointer" }}
            />
            <Award size={13} color={filters.isAspirational ? "#d97706" : "#64748b"} />
            Aspirational Only
          </label>
        </div>

        {/* CLEAR FILTERS BUTTON */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 50 }}>
          <button
            onClick={clearFilters}
            disabled={!hasFilters}
            aria-label="Clear all applied filters"
            title={hasFilters ? "Clear all applied filters" : "No filters currently active"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: "0 12px",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-family)",
              borderRadius: "var(--radius-sm, 4px)",
              border: hasFilters ? "1px solid #dc2626" : "1px solid #cbd5e1",
              background: hasFilters ? "#dc2626" : "#f1f5f9",
              color: hasFilters ? "#ffffff" : "#94a3b8",
              cursor: hasFilters ? "pointer" : "not-allowed",
              boxShadow: hasFilters ? "0 1px 3px rgba(220, 38, 38, 0.2)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            <RotateCcw size={12} />
            Reset ({activeCount})
          </button>
        </div>
      </div>

      {/* ── Active Filter Chips Row ── */}
      {hasFilters && (
        <div
          role="status"
          aria-live="polite"
          style={{
            maxWidth: "var(--container-max, 1280px)",
            margin: "0 auto",
            padding: "4px 24px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            borderTop: "1px dashed #e2e8f0",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Active Filters ({activeCount}):
          </span>

          {filters.q && (
            <Chip
              label={`Keyword: "${filters.q}"`}
              onRemove={() => setFilters({ q: undefined })}
            />
          )}

          {filters.stateId && (
            <Chip
              label={`State: ${activeStateObj?.name ?? filters.stateId}`}
              onRemove={() => setFilters({ stateId: undefined, districtId: undefined })}
            />
          )}

          {filters.districtId && (
            <Chip
              label={`District: ${activeDistrictObj?.name ?? filters.districtId}`}
              onRemove={() => setFilters({ districtId: undefined })}
            />
          )}

          {filters.sectorId && (
            <Chip
              label={`Sector: ${activeSectorObj?.name ?? filters.sectorId}`}
              onRemove={() => setFilters({ sectorId: undefined })}
            />
          )}

          {filters.nsqfLevel && (
            <Chip
              label={`NSQF Level ${filters.nsqfLevel}`}
              onRemove={() => setFilters({ nsqfLevel: undefined })}
            />
          )}

          {filters.horizon && (
            <Chip
              label={`Horizon: ${HORIZONS.find((h) => h.value === filters.horizon)?.label ?? filters.horizon}`}
              onRemove={() => setFilters({ horizon: undefined })}
            />
          )}

          {filters.isAspirational && (
            <Chip
              label="★ Aspirational Districts Only"
              onRemove={() => setFilters({ isAspirational: undefined })}
              accent
            />
          )}

          <button
            onClick={clearFilters}
            style={{
              background: "transparent",
              border: "none",
              color: "#dc2626",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              padding: "2px 6px",
              textDecoration: "underline",
            }}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reusable Filter Chip ──
function Chip({
  label,
  onRemove,
  accent = false,
}: {
  label: string;
  onRemove: () => void;
  accent?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: accent ? "#b45309" : "#0f2447",
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px 3px 10px",
        borderRadius: "16px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.25)",
          border: "none",
          borderRadius: "50%",
          width: 15,
          height: 15,
          color: "#ffffff",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <X size={10} />
      </button>
    </span>
  );
}
