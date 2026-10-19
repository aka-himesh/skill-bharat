/**
 * api.ts — Central API service for AI-LMIS frontend.
 *
 * Strategy:
 *   - In dev mode, Vite proxies /api/* → http://localhost:8000/api/*
 *   - Requests use relative paths (e.g., "/api/config").
 *   - JWT Bearer token is attached to all protected endpoints.
 *   - Config and auth endpoints are public (no token required).
 */

// ---------------------------------------------------------------------------
// Token management (simple in-memory + localStorage)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "ai_lmis_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ---------------------------------------------------------------------------
// Base fetch wrapper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`API ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Fetch wrapper. Throws ApiError on non-2xx responses.
 * Attaches Authorization header when a token exists,
 * except for explicitly public endpoints.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  isPublic = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (!isPublic) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch { /* use statusText */ }
    throw new ApiError(res.status, detail);
  }

  // Handle no-content or non-JSON responses
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return res.text() as unknown as T;
}

// ---------------------------------------------------------------------------
// Public endpoints (no auth required)
// ---------------------------------------------------------------------------

export interface ConfigResponse {
  app_name: string;
  app_short_name: string;
  app_tagline: string;
  version: string;
  data_status: string;
  data_status_label: string;
}

export function fetchConfig(): Promise<ConfigResponse> {
  return apiFetch<ConfigResponse>("/api/config", {}, true);
}

export interface LoginPayload {
  pin: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify(payload) },
    true
  );
}

// ---------------------------------------------------------------------------
// Protected endpoints (require JWT)
// ---------------------------------------------------------------------------

// --- Summary / KPIs --------------------------------------------------------
export interface SummaryResponse {
  states: number;
  districts: number;
  sectors: number;
  occupations: number;
  training_centres: number;
  critical_shortage_count: number;
  oversupply_count: number;
  open_alerts: number;
  total_recommendations: number;
  suggested_seat_increases: number;
  suggested_seat_reductions: number;
  data_status: string;
  data_status_label: string;
  pilot_note: string;
}

export function fetchSummary(): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>("/api/summary");
}

// --- Geography -------------------------------------------------------------
export interface GeoState {
  id: number;
  name: string;
  code: string;
}

export function fetchStates(): Promise<GeoState[]> {
  return apiFetch<GeoState[]>("/api/geo/states");
}

export interface GeoDistrict {
  id: number;
  name: string;
  state_id: number;
  is_aspirational: boolean;
}

export function fetchDistricts(stateId?: number): Promise<GeoDistrict[]> {
  const qs = stateId != null ? `?state_id=${stateId}` : "";
  return apiFetch<GeoDistrict[]>(`/api/geo/districts${qs}`);
}

// --- Sectors & Occupations -------------------------------------------------
export interface SectorItem {
  id: number;
  name: string;
  code: string;
}

export function fetchSectors(): Promise<SectorItem[]> {
  return apiFetch<SectorItem[]>("/api/sectors");
}

export interface OccupationItem {
  id: number;
  nco_code: string;
  name: string;
  family: string | null;
  sector_id: number;
  nsqf_level: number | null;
  source: string;
  is_uncertain: boolean;
}

export interface OccupationsResponse {
  total: number;
  offset: number;
  limit: number;
  results: OccupationItem[];
}

export function fetchOccupations(params?: {
  q?: string;
  sector_id?: number;
  limit?: number;
  offset?: number;
}): Promise<OccupationsResponse> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.sector_id != null) qs.set("sector_id", String(params.sector_id));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return apiFetch<OccupationsResponse>(`/api/occupations${q ? `?${q}` : ""}`);
}

// --- Gap analysis ----------------------------------------------------------
export interface GapItem {
  district_id: number;
  occupation_id: number;
  month: string;
  gap_pct: number;
  gap_band: string;
  severity_score: number;
  forecast_demand: number;
  forecast_supply: number;
  is_synthetic: boolean;
  district_name: string;
  state_name: string;
  occupation_name: string;
  nco_code: string;
  sector_name: string | null;
}

export interface GapsResponse {
  count: number;
  data_status: string;
  gaps: GapItem[];
}

export function fetchGaps(params?: {
  level?: string;
  state_id?: number;
  district_id?: number;
  sector_id?: number;
  occupation_id?: number;
  horizon?: number;
}): Promise<GapsResponse> {
  const qs = new URLSearchParams();
  if (params?.level) qs.set("level", params.level);
  if (params?.state_id != null) qs.set("state_id", String(params.state_id));
  if (params?.district_id != null) qs.set("district_id", String(params.district_id));
  if (params?.sector_id != null) qs.set("sector_id", String(params.sector_id));
  if (params?.occupation_id != null) qs.set("occupation_id", String(params.occupation_id));
  if (params?.horizon != null) qs.set("horizon", String(params.horizon));
  const q = qs.toString();
  return apiFetch<GapsResponse>(`/api/gaps${q ? `?${q}` : ""}`);
}

// --- Ranking ---------------------------------------------------------------
export interface RankingItem {
  district_id: number;
  occupation_id: number;
  max_severity: number;
  avg_gap_pct: number;
  gap_band: string;
  district_name: string;
  state_name: string;
  occupation_name: string;
  nco_code: string;
  sector_name: string | null;
}

export interface RankingResponse {
  type: string;
  count: number;
  data_status: string;
  ranking: RankingItem[];
}

export function fetchRanking(params?: {
  type?: string;
  limit?: number;
  state_id?: number;
}): Promise<RankingResponse> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.state_id != null) qs.set("state_id", String(params.state_id));
  const q = qs.toString();
  return apiFetch<RankingResponse>(`/api/ranking${q ? `?${q}` : ""}`);
}

// --- Forecast --------------------------------------------------------------
export interface ForecastSeriesItem {
  month: string;
  point: number;
  lower_80: number | null;
  upper_80: number | null;
  model: string;
  notes: string | null;
}

export interface ForecastResponse {
  district_id: number;
  occupation_id: number;
  district_name: string | null;
  state_name: string | null;
  occupation_name: string | null;
  nco_code: string | null;
  history: { month: string; demand_index: number }[];
  demand_forecast: ForecastSeriesItem[];
  supply_forecast: ForecastSeriesItem[];
  run_info: {
    run_date: string | null;
    model: string | null;
    horizon_months: number;
    evaluation_mae: number | null;
    notes: string | null;
  } | null;
  data_status: string;
  limitation: string;
}

export function fetchForecast(districtId: number, occupationId: number): Promise<ForecastResponse> {
  return apiFetch<ForecastResponse>(
    `/api/forecast?district_id=${districtId}&occupation_id=${occupationId}`
  );
}

// --- Trend -----------------------------------------------------------------
export interface TrendResponse {
  district_id: number;
  occupation_id: number;
  data_status: string;
  series: {
    month: string;
    index_value: number;
    contributing_sources: string | null;
    weights_used: string | null;
  }[];
}

export function fetchTrend(districtId: number, occupationId: number): Promise<TrendResponse> {
  return apiFetch<TrendResponse>(
    `/api/trend?district_id=${districtId}&occupation_id=${occupationId}`
  );
}

// --- Alerts ----------------------------------------------------------------
export interface AlertItem {
  id: number;
  district_id: number;
  occupation_id: number;
  alert_type: string;
  severity: string;
  rule_name: string;
  rule_description: string;
  evidence: string;
  reference_period: string;
  acknowledged: boolean;
  created_at: string;
  district_name: string;
  state_name: string;
  occupation_name: string;
  nco_code: string;
}

export interface AlertsResponse {
  count: number;
  data_status: string;
  disclaimer: string;
  alerts: AlertItem[];
}

export function fetchAlerts(params?: {
  severity?: string;
  district_id?: number;
  occupation_id?: number;
  alert_type?: string;
  limit?: number;
}): Promise<AlertsResponse> {
  const qs = new URLSearchParams();
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.district_id != null) qs.set("district_id", String(params.district_id));
  if (params?.occupation_id != null) qs.set("occupation_id", String(params.occupation_id));
  if (params?.alert_type) qs.set("alert_type", params.alert_type);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch<AlertsResponse>(`/api/alerts${q ? `?${q}` : ""}`);
}

// --- Recommendations -------------------------------------------------------
export interface RecommendationItem {
  id: number;
  district_id: number;
  occupation_id: number;
  action_type: string;
  description: string;
  estimated_seat_change: number;
  evidence: string;
  assumptions: string;
  confidence_note: string;
  data_provenance: string;
  created_at: string;
  district_name: string;
  state_name: string;
  occupation_name: string;
  nco_code: string;
  sector_name: string | null;
}

export interface RecommendationsResponse {
  count: number;
  data_status: string;
  disclaimer: string;
  recommendations: RecommendationItem[];
}

export function fetchRecommendations(params?: {
  district_id?: number;
  occupation_id?: number;
  action_type?: string;
  limit?: number;
}): Promise<RecommendationsResponse> {
  const qs = new URLSearchParams();
  if (params?.district_id != null) qs.set("district_id", String(params.district_id));
  if (params?.occupation_id != null) qs.set("occupation_id", String(params.occupation_id));
  if (params?.action_type) qs.set("action_type", params.action_type);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch<RecommendationsResponse>(`/api/recommendations${q ? `?${q}` : ""}`);
}

// --- Sources ---------------------------------------------------------------
export interface SourceStatusItem {
  name: string;
  status: string;
  description: string;
  last_import: string | null;
  record_count: number | null;
  adapter: string;
  coverage: string;
  limitations: string;
}

export interface SourcesStatusResponse {
  total: number;
  sources: SourceStatusItem[];
  note: string;
}

export function fetchSourcesStatus(): Promise<SourcesStatusResponse> {
  return apiFetch<SourcesStatusResponse>("/api/sources/status");
}

export interface MethodologyResponse {
  title: string;
  version: string;
  full_doc: string;
  pipeline_steps: {
    step: number;
    name: string;
    description: string;
    file: string;
  }[];
  data_status: string;
  disclaimer: string;
}

export function fetchMethodology(): Promise<MethodologyResponse> {
  return apiFetch<MethodologyResponse>("/api/methodology");
}

// --- CSV Export URLs (returns URL string for download) ---------------------

export function getGapsExportCsvUrl(params?: {
  state_id?: number;
  district_id?: number;
  sector_id?: number;
}): string {
  const qs = new URLSearchParams();
  if (params?.state_id != null) qs.set("state_id", String(params.state_id));
  if (params?.district_id != null) qs.set("district_id", String(params.district_id));
  if (params?.sector_id != null) qs.set("sector_id", String(params.sector_id));
  const q = qs.toString();
  return `/api/gaps/export.csv${q ? `?${q}` : ""}`;
}

export function getRecommendationsExportCsvUrl(params?: {
  district_id?: number;
}): string {
  const qs = new URLSearchParams();
  if (params?.district_id != null) qs.set("district_id", String(params.district_id));
  const q = qs.toString();
  return `/api/recommendations/export.csv${q ? `?${q}` : ""}`;
}

/**
 * Download a CSV file that requires auth. Uses fetch + Blob.
 */
export async function downloadAuthenticatedCsv(url: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to download: ${res.statusText}`);
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Phase 2: News endpoints ───────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source_name: string;
  published_at: string;
  image_url: string | null;
  tags: string[];
  relevance: number;
}

export interface NewsResponse {
  source: "live" | "cached" | "synthetic";
  provider: string;
  fetched_at: string;
  items: NewsItem[];
}

export function fetchNews(params?: { limit?: number; q?: string }): Promise<NewsResponse> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.q) qs.set("q", params.q);
  const q = qs.toString();
  return apiFetch<NewsResponse>(`/api/news${q ? `?${q}` : ""}`);
}

export interface NewsKeywordsResponse {
  include_keywords: string[];
  exclude_keywords: string[];
  trusted_sources: string[];
  trusted_source_boost: number;
  min_score: number;
  scoring_formula: string;
}

export function fetchNewsKeywords(): Promise<NewsKeywordsResponse> {
  return apiFetch<NewsKeywordsResponse>("/api/news/keywords");
}

export async function refreshNews(): Promise<{ status: string; message: string }> {
  return apiFetch("/api/admin/refresh/news", { method: "POST" });
}

// ── Phase 2: e-Shram endpoints ────────────────────────────────────────────────

export interface EshramStateTotals {
  state: string;
  total: number;
}

export interface EshramDistrictRow {
  state: string;
  district: string;
  registered_workers_total: number;
  male: number;
  female: number;
  age_18_40: number;
  age_40_plus: number;
  sc: number;
  st: number;
  obc: number;
  general: number;
  snapshot_date: string;
  source: "live" | "cached" | "synthetic";
  fetched_at: string;
}

export interface EshramSummaryResponse {
  national_total: number;
  state_totals: EshramStateTotals[];
  top_districts: EshramDistrictRow[];
  record_count: number;
  source: "live" | "cached" | "synthetic";
  snapshot_date: string | null;
  fetched_at: string | null;
}

export function fetchEshramSummary(state?: string): Promise<EshramSummaryResponse> {
  const qs = state ? `?state=${encodeURIComponent(state)}` : "";
  return apiFetch<EshramSummaryResponse>(`/api/eshram/summary${qs}`);
}

export interface EshramDistrictsResponse {
  rows: EshramDistrictRow[];
  count: number;
  source: "live" | "cached" | "synthetic";
  snapshot_date: string | null;
  fetched_at: string | null;
}

export function fetchEshramDistricts(params?: {
  state?: string;
  q?: string;
}): Promise<EshramDistrictsResponse> {
  const qs = new URLSearchParams();
  if (params?.state) qs.set("state", params.state);
  if (params?.q) qs.set("q", params.q);
  const q = qs.toString();
  return apiFetch<EshramDistrictsResponse>(`/api/eshram/districts${q ? `?${q}` : ""}`);
}

export function fetchEshramDistrictDetail(district: string): Promise<EshramDistrictRow | null> {
  return apiFetch<EshramDistrictRow>(`/api/eshram/district/${encodeURIComponent(district)}`);
}

export async function refreshEshram(): Promise<{ status: string }> {
  return apiFetch("/api/admin/refresh/eshram", { method: "POST" });
}

