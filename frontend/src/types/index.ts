// --- App Config -------------------------------------------------------------
export interface AppConfig {
  appName: string;
  appShortName: string;
  appTagline: string;
  dataStatusLabel?: string;
}

export interface GeoState {
  id: string;
  name: string;
  code: string;
}

export interface GeoDistrict {
  id: string;
  name: string;
  stateId: string;
  stateName: string;
  isAspirational: boolean;
}

export interface Sector {
  id: string;
  name: string;
  sscCode: string;
}

export interface Occupation {
  ncoCode: string;
  name: string;
  sectorId: string;
  nsqfLevel: number;
}

export type SeverityBand = "Critical Shortage" | "Shortage" | "Balanced" | "Oversupply" | "Critical Oversupply";

export interface SummaryData {
  totalDemand: number;
  totalSupply: number;
  totalGap: number;
  gapPercent: number;
  criticalShortages: number;
  criticalOversupply: number;
  statesCovered: number;
  districtsCovered: number;
  sectorsAnalysed: number;
  tradesAnalysed: number;
  lastUpdated: string;
}

export interface GapRow {
  id: string;
  ncoCode: string;
  tradeName: string;
  sectorName: string;
  stateId: string;
  stateName: string;
  districtId: string;
  districtName: string;
  demand: number;
  supply: number;
  gap: number;
  gapPercent: number;
  severity: SeverityBand;
  nsqfLevel: number;
  isAspirational: boolean;
}

export interface GapsResponse {
  rows: GapRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RankingRow {
  rank: number;
  tradeName: string;
  ncoCode: string;
  sectorName: string;
  stateCount: number;
  avgGapPercent: number;
  severity: SeverityBand;
  trend: "rising" | "stable" | "falling";
}

export interface TrendPoint {
  period: string;
  demand: number;
  supply: number;
  gap: number;
}

export interface ForecastPoint {
  period: string;
  forecastDemand: number;
  forecastSupply: number;
  forecastGap: number;
  demandLower: number;
  demandUpper: number;
  supplyLower: number;
  supplyUpper: number;
  isActual: boolean;
}

export interface TrendForecastResponse {
  ncoCode: string;
  tradeName: string;
  history: TrendPoint[];
  forecast: ForecastPoint[];
}

export type AlertType = "shortage" | "oversupply" | "emerging" | "saturation";

export interface Alert {
  id: string;
  type: AlertType;
  severity: SeverityBand;
  tradeName: string;
  ncoCode: string;
  sectorName: string;
  stateId: string;
  stateName: string;
  districtId: string;
  districtName: string;
  message: string;
  deltaPercent: number;
  flaggedAt: string;
  isAspirational: boolean;
}

export type RecommendationType = "increase_seats" | "decrease_seats" | "new_course" | "revise_curriculum" | "close_centre";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: "High" | "Medium" | "Low";
  tradeName: string;
  ncoCode: string;
  sectorName: string;
  stateId: string;
  stateName: string;
  districtId: string;
  districtName: string;
  currentSeats: number;
  recommendedSeats: number;
  seatDelta: number;
  rationale: string;
  evidence: string;
  estimatedImpact: string;
}

export interface MethodologyStep {
  id: string;
  title: string;
  description: string;
  formula?: string;
  references: string[];
}

export interface DataSource {
  id: string;
  name: string;
  description: string;
  lastIngested: string;
  status: "live" | "demo" | "unavailable";
  recordCount: number;
  coverageNote: string;
}

export interface Filters {
  stateId?: string;
  districtId?: string;
  isAspirational?: boolean;
  sectorId?: string;
  ncoCode?: string;
  nsqfLevel?: string;
  horizon?: string;
  q?: string;
}

export interface StateMapData {
  stateId: string;
  stateName: string;
  gapScore: number;
  severity: SeverityBand;
  totalDemand: number;
  totalSupply: number;
}

// ── Phase 2: News & e-Shram types ─────────────────────────────────────────────

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

export interface EshramDistrictsResponse {
  rows: EshramDistrictRow[];
  count: number;
  source: "live" | "cached" | "synthetic";
  snapshot_date: string | null;
  fetched_at: string | null;
}

