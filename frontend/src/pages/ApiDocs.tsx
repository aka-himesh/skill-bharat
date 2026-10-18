import { useConfig } from "../context/ConfigContext";

const ENDPOINTS = [
  { method: "GET", path: "/api/config", desc: "Returns app name, short name, and tagline for branding.", response: '{ appName: string, appShortName: string, appTagline: string }' },
  { method: "GET", path: "/api/geo/states", desc: "List of all states with IDs and codes.", response: '[ { id, name, code } ]' },
  { method: "GET", path: "/api/geo/districts?stateId=MH", desc: "Districts for a state; omit stateId for all districts.", response: '[ { id, name, stateId, stateName, isAspirational } ]' },
  { method: "GET", path: "/api/sectors", desc: "All sector skill councils with NCO codes.", response: '[ { id, name, sscCode } ]' },
  { method: "GET", path: "/api/occupations?sectorId=SOLAR", desc: "Occupations filtered by sector.", response: '[ { ncoCode, name, sectorId, nsqfLevel } ]' },
  { method: "GET", path: "/api/summary?stateId=&sectorId=", desc: "National/filtered KPI summary.", response: '{ totalDemand, totalSupply, totalGap, gapPercent, ... }' },
  { method: "GET", path: "/api/gaps?stateId=&sectorId=&page=1&pageSize=15", desc: "Paginated demand-supply gap rows, filterable.", response: '{ rows: GapRow[], total, page, pageSize }' },
  { method: "GET", path: "/api/ranking?type=shortage", desc: "Ranked list of trades by gap severity.", response: '[ { rank, tradeName, ncoCode, avgGapPercent, severity, trend } ]' },
  { method: "GET", path: "/api/trend?ncoCode=7412.0200&districtId=RJ-JOD", desc: "Historical trend data for a trade-district.", response: '{ history: TrendPoint[], ... }' },
  { method: "GET", path: "/api/forecast?ncoCode=7412.0200&horizon=3y", desc: "3-year demand-supply forecast with 80% CI.", response: '{ forecast: ForecastPoint[], ... }' },
  { method: "GET", path: "/api/alerts?type=shortage&stateId=", desc: "Early warning alerts, filterable by type and state.", response: '[ Alert ]' },
  { method: "GET", path: "/api/recommendations?priority=High", desc: "AI recommendations for seat reallocation and course changes.", response: '[ Recommendation ]' },
  { method: "GET", path: "/api/methodology", desc: "Documented methodology steps with formulas.", response: '[ MethodologyStep ]' },
  { method: "GET", path: "/api/sources/status", desc: "Status of all integrated data sources.", response: '[ DataSource ]' },
  { method: "GET", path: "/api/export/gaps.csv?stateId=", desc: "Download gap analysis as CSV.", response: 'text/csv' },
  { method: "GET", path: "/api/export/targets.csv?stateId=", desc: "Download seat allocation recommendations as CSV.", response: 'text/csv' },
];

const METHOD_COLOR: Record<string, string> = { GET: "#138808", POST: "#1a3a6b", DELETE: "#c0392b" };

export default function ApiDocs() {
  const { config } = useConfig();
  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>API Documentation — {config.appName}</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>RESTful API endpoints for integration with external planning systems. Base URL: <code style={{ background: "#f0f3f8", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>{"{VITE_API_URL}"}</code></p>
        </div>
      </div>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: 16, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          <strong>Authentication:</strong> Production API will use Bearer token (OAuth 2.0, NIC SSO). Demo mode requires no auth.<br />
          <strong>Response format:</strong> JSON (application/json). All dates in ISO 8601. Numbers use Indian locale where applicable.<br />
          <strong>Rate limiting:</strong> 1,000 requests/hour per API key in production.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ENDPOINTS.map((ep, i) => (
            <div key={i} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 16px" }}>
                <span style={{ background: METHOD_COLOR[ep.method] ?? "#1a3a6b", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, flexShrink: 0, marginTop: 2 }}>{ep.method}</span>
                <div style={{ flex: 1 }}>
                  <code style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)", fontFamily: "monospace" }}>{ep.path}</code>
                  <p style={{ margin: "4px 0 6px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{ep.desc}</p>
                  <div style={{ background: "#f0f3f8", borderRadius: 4, padding: "6px 10px", fontSize: 11, fontFamily: "monospace", color: "#4a5a72" }}>
                    Response: {ep.response}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
