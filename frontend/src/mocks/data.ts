import type {
  AppConfig, GeoState, GeoDistrict, Sector, Occupation,
  SummaryData, GapRow, RankingRow, TrendForecastResponse,
  Alert, Recommendation, MethodologyStep, DataSource, StateMapData
} from "../types";

export const mockConfig: AppConfig = {
  appName: "AI-LMIS",
  appShortName: "AI-LMIS",
  appTagline: "Labour Market Intelligence & Skill Demand-Supply Forecasting Engine",
};

export const mockStates: GeoState[] = [
  { id: "MH", name: "Maharashtra", code: "MH" },
  { id: "UP", name: "Uttar Pradesh", code: "UP" },
  { id: "RJ", name: "Rajasthan", code: "RJ" },
  { id: "GJ", name: "Gujarat", code: "GJ" },
  { id: "TN", name: "Tamil Nadu", code: "TN" },
  { id: "KA", name: "Karnataka", code: "KA" },
  { id: "WB", name: "West Bengal", code: "WB" },
  { id: "MP", name: "Madhya Pradesh", code: "MP" },
  { id: "OR", name: "Odisha", code: "OR" },
  { id: "JH", name: "Jharkhand", code: "JH" },
  { id: "PB", name: "Punjab", code: "PB" },
  { id: "HR", name: "Haryana", code: "HR" },
  { id: "AP", name: "Andhra Pradesh", code: "AP" },
  { id: "TS", name: "Telangana", code: "TS" },
  { id: "KL", name: "Kerala", code: "KL" },
  { id: "CH", name: "Chhattisgarh", code: "CH" },
  { id: "AS", name: "Assam", code: "AS" },
  { id: "UK", name: "Uttarakhand", code: "UK" },
  { id: "HP", name: "Himachal Pradesh", code: "HP" },
  { id: "DL", name: "Delhi", code: "DL" },
];

export const mockDistricts: GeoDistrict[] = [
  { id: "MH-PUN", name: "Pune", stateId: "MH", stateName: "Maharashtra", isAspirational: false },
  { id: "MH-NAG", name: "Nagpur", stateId: "MH", stateName: "Maharashtra", isAspirational: false },
  { id: "MH-NAN", name: "Nandurbar", stateId: "MH", stateName: "Maharashtra", isAspirational: true },
  { id: "UP-LKO", name: "Lucknow", stateId: "UP", stateName: "Uttar Pradesh", isAspirational: false },
  { id: "UP-AGR", name: "Agra", stateId: "UP", stateName: "Uttar Pradesh", isAspirational: false },
  { id: "UP-BAH", name: "Bahraich", stateId: "UP", stateName: "Uttar Pradesh", isAspirational: true },
  { id: "RJ-JOD", name: "Jodhpur", stateId: "RJ", stateName: "Rajasthan", isAspirational: false },
  { id: "RJ-BAR", name: "Baran", stateId: "RJ", stateName: "Rajasthan", isAspirational: true },
  { id: "KA-BNG", name: "Bengaluru Urban", stateId: "KA", stateName: "Karnataka", isAspirational: false },
  { id: "TN-CHE", name: "Chennai", stateId: "TN", stateName: "Tamil Nadu", isAspirational: false },
  { id: "GJ-AHM", name: "Ahmedabad", stateId: "GJ", stateName: "Gujarat", isAspirational: false },
  { id: "OR-MYB", name: "Mayurbhanj", stateId: "OR", stateName: "Odisha", isAspirational: true },
  { id: "JH-RAM", name: "Ramgarh", stateId: "JH", stateName: "Jharkhand", isAspirational: false },
];

export const mockSectors: Sector[] = [
  { id: "IT", name: "IT & ITeS", sscCode: "SSC/Q2601" },
  { id: "CONST", name: "Construction", sscCode: "CSDCI" },
  { id: "HEALTH", name: "Healthcare", sscCode: "HSSC" },
  { id: "RETAIL", name: "Retail", sscCode: "RASCI" },
  { id: "AGRI", name: "Agriculture", sscCode: "ASCI" },
  { id: "AUTO", name: "Automotive", sscCode: "ASDC" },
  { id: "SOLAR", name: "Green Jobs / Solar", sscCode: "GISSC" },
  { id: "TEXTILE", name: "Textile & Apparel", sscCode: "TASC" },
  { id: "FOOD", name: "Food Processing", sscCode: "FICSI" },
  { id: "ELEC", name: "Electronics", sscCode: "ELCINA" },
];

export const mockOccupations: Occupation[] = [
  { ncoCode: "7412.0200", name: "Solar Panel Installation Technician", sectorId: "SOLAR", nsqfLevel: 4 },
  { ncoCode: "7421.0100", name: "Smartphone Repair Technician", sectorId: "ELEC", nsqfLevel: 3 },
  { ncoCode: "7433.0100", name: "Tailor", sectorId: "TEXTILE", nsqfLevel: 3 },
  { ncoCode: "4132.0100", name: "Data Entry Operator", sectorId: "IT", nsqfLevel: 2 },
  { ncoCode: "5221.0100", name: "Retail Salesman", sectorId: "RETAIL", nsqfLevel: 2 },
  { ncoCode: "3258.0100", name: "Community Health Worker", sectorId: "HEALTH", nsqfLevel: 4 },
  { ncoCode: "7115.0300", name: "Bar Bending & Steel Fixer", sectorId: "CONST", nsqfLevel: 3 },
  { ncoCode: "6111.0100", name: "Precision Farming Technician", sectorId: "AGRI", nsqfLevel: 4 },
  { ncoCode: "7231.0100", name: "EV Battery Technician", sectorId: "AUTO", nsqfLevel: 5 },
  { ncoCode: "7514.0100", name: "Food Processing Operator", sectorId: "FOOD", nsqfLevel: 3 },
];

export const mockSummary: SummaryData = {
  totalDemand: 1185967,
  totalSupply: 904608,
  totalGap: 281359,
  gapPercent: 23.7,
  criticalShortages: 47,
  criticalOversupply: 31,
  statesCovered: 20,
  districtsCovered: 720,
  sectorsAnalysed: 10,
  tradesAnalysed: 86,
  lastUpdated: "2026-10-17",
};

export const mockGapRows: GapRow[] = [
  { id: "1", ncoCode: "7412.0200", tradeName: "Solar Panel Installation Technician", sectorName: "Green Jobs / Solar", stateId: "RJ", stateName: "Rajasthan", districtId: "RJ-JOD", districtName: "Jodhpur", demand: 12400, supply: 3200, gap: 9200, gapPercent: 74.2, severity: "Critical Shortage", nsqfLevel: 4, isAspirational: false },
  { id: "2", ncoCode: "7421.0100", tradeName: "Smartphone Repair Technician", sectorName: "Electronics", stateId: "UP", stateName: "Uttar Pradesh", districtId: "UP-LKO", districtName: "Lucknow", demand: 8900, supply: 2800, gap: 6100, gapPercent: 68.5, severity: "Critical Shortage", nsqfLevel: 3, isAspirational: false },
  { id: "3", ncoCode: "7231.0100", tradeName: "EV Battery Technician", sectorName: "Automotive", stateId: "MH", stateName: "Maharashtra", districtId: "MH-PUN", districtName: "Pune", demand: 7600, supply: 2900, gap: 4700, gapPercent: 61.8, severity: "Critical Shortage", nsqfLevel: 5, isAspirational: false },
  { id: "4", ncoCode: "6111.0100", tradeName: "Precision Farming Technician", sectorName: "Agriculture", stateId: "MP", stateName: "Madhya Pradesh", districtId: "MP-BPL", districtName: "Bhopal", demand: 5400, supply: 2200, gap: 3200, gapPercent: 59.3, severity: "Shortage", nsqfLevel: 4, isAspirational: false },
  { id: "5", ncoCode: "3258.0100", tradeName: "Community Health Worker", sectorName: "Healthcare", stateId: "OR", stateName: "Odisha", districtId: "OR-MYB", districtName: "Mayurbhanj", demand: 4800, supply: 2100, gap: 2700, gapPercent: 56.3, severity: "Shortage", nsqfLevel: 4, isAspirational: true },
  { id: "6", ncoCode: "7115.0300", tradeName: "Bar Bending & Steel Fixer", sectorName: "Construction", stateId: "MH", stateName: "Maharashtra", districtId: "MH-NAG", districtName: "Nagpur", demand: 6200, supply: 3500, gap: 2700, gapPercent: 43.5, severity: "Shortage", nsqfLevel: 3, isAspirational: false },
  { id: "7", ncoCode: "7514.0100", tradeName: "Food Processing Operator", sectorName: "Food Processing", stateId: "GJ", stateName: "Gujarat", districtId: "GJ-AHM", districtName: "Ahmedabad", demand: 3400, supply: 2600, gap: 800, gapPercent: 23.5, severity: "Balanced", nsqfLevel: 3, isAspirational: false },
  { id: "8", ncoCode: "5221.0100", tradeName: "Retail Salesman", sectorName: "Retail", stateId: "UP", stateName: "Uttar Pradesh", districtId: "UP-AGR", districtName: "Agra", demand: 3200, supply: 5800, gap: -2600, gapPercent: -81.3, severity: "Oversupply", nsqfLevel: 2, isAspirational: false },
  { id: "9", ncoCode: "4132.0100", tradeName: "Data Entry Operator", sectorName: "IT & ITeS", stateId: "WB", stateName: "West Bengal", districtId: "WB-KOL", districtName: "Kolkata", demand: 4100, supply: 9200, gap: -5100, gapPercent: -124.4, severity: "Critical Oversupply", nsqfLevel: 2, isAspirational: false },
  { id: "10", ncoCode: "7433.0100", tradeName: "Tailor", sectorName: "Textile & Apparel", stateId: "TN", stateName: "Tamil Nadu", districtId: "TN-CHE", districtName: "Chennai", demand: 5600, supply: 12400, gap: -6800, gapPercent: -121.4, severity: "Critical Oversupply", nsqfLevel: 3, isAspirational: false },
];

export const mockRanking: RankingRow[] = [
  { rank: 1, tradeName: "Solar Panel Installation Technician", ncoCode: "7412.0200", sectorName: "Green Jobs / Solar", stateCount: 12, avgGapPercent: 74.2, severity: "Critical Shortage", trend: "rising" },
  { rank: 2, tradeName: "EV Battery Technician", ncoCode: "7231.0100", sectorName: "Automotive", stateCount: 8, avgGapPercent: 61.8, severity: "Critical Shortage", trend: "rising" },
  { rank: 3, tradeName: "Smartphone Repair Technician", ncoCode: "7421.0100", sectorName: "Electronics", stateCount: 15, avgGapPercent: 58.5, severity: "Critical Shortage", trend: "rising" },
  { rank: 4, tradeName: "Community Health Worker", ncoCode: "3258.0100", sectorName: "Healthcare", stateCount: 18, avgGapPercent: 56.3, severity: "Shortage", trend: "stable" },
  { rank: 5, tradeName: "Precision Farming Technician", ncoCode: "6111.0100", sectorName: "Agriculture", stateCount: 7, avgGapPercent: 49.1, severity: "Shortage", trend: "rising" },
  { rank: 6, tradeName: "Bar Bending & Steel Fixer", ncoCode: "7115.0300", sectorName: "Construction", stateCount: 20, avgGapPercent: 43.5, severity: "Shortage", trend: "stable" },
  { rank: 7, tradeName: "Data Entry Operator", ncoCode: "4132.0100", sectorName: "IT & ITeS", stateCount: 20, avgGapPercent: -124.4, severity: "Critical Oversupply", trend: "falling" },
  { rank: 8, tradeName: "Tailor", ncoCode: "7433.0100", sectorName: "Textile & Apparel", stateCount: 17, avgGapPercent: -121.4, severity: "Critical Oversupply", trend: "falling" },
  { rank: 9, tradeName: "Retail Salesman", ncoCode: "5221.0100", sectorName: "Retail", stateCount: 19, avgGapPercent: -81.3, severity: "Oversupply", trend: "falling" },
];

export const mockForecast: TrendForecastResponse = {
  ncoCode: "7412.0200",
  tradeName: "Solar Panel Installation Technician",
  history: [
    { period: "FY-18-19", demand: 1200, supply: 900, gap: 300 },
    { period: "FY-19-20", demand: 1800, supply: 1100, gap: 700 },
    { period: "FY-20-21", demand: 2400, supply: 1400, gap: 1000 },
    { period: "FY-21-22", demand: 3900, supply: 1900, gap: 2000 },
    { period: "FY-22-23", demand: 6200, supply: 2400, gap: 3800 },
    { period: "FY-23-24", demand: 9100, supply: 2900, gap: 6200 },
    { period: "FY-24-25", demand: 12400, supply: 3200, gap: 9200 },
  ],
  forecast: [
    { period: "FY-25-26", forecastDemand: 16800, forecastSupply: 5200, forecastGap: 11600, demandLower: 14200, demandUpper: 19400, supplyLower: 4800, supplyUpper: 5600, isActual: false },
    { period: "FY-26-27", forecastDemand: 22100, forecastSupply: 8400, forecastGap: 13700, demandLower: 18000, demandUpper: 26200, supplyLower: 7200, supplyUpper: 9600, isActual: false },
    { period: "FY-27-28", forecastDemand: 28900, forecastSupply: 12800, forecastGap: 16100, demandLower: 22000, demandUpper: 35800, supplyLower: 10200, supplyUpper: 15400, isActual: false },
  ],
};

export const mockAlerts: Alert[] = [
  { id: "a1", type: "shortage", severity: "Critical Shortage", tradeName: "Solar Panel Installation Technician", ncoCode: "7412.0200", sectorName: "Green Jobs / Solar", stateId: "RJ", stateName: "Rajasthan", districtId: "RJ-JOD", districtName: "Jodhpur", message: "Demand has surged 78% YoY while training capacity remains static. Immediate intervention required.", deltaPercent: 78, flaggedAt: "2026-10-15", isAspirational: false },
  { id: "a2", type: "emerging", severity: "Shortage", tradeName: "EV Battery Technician", ncoCode: "7231.0100", sectorName: "Automotive", stateId: "MH", stateName: "Maharashtra", districtId: "MH-PUN", districtName: "Pune", message: "Emerging trade with no current NSQF course. 8 OEMs reported hiring difficulties for this role.", deltaPercent: 61, flaggedAt: "2026-10-14", isAspirational: false },
  { id: "a3", type: "saturation", severity: "Critical Oversupply", tradeName: "Data Entry Operator", ncoCode: "4132.0100", sectorName: "IT & ITeS", stateId: "WB", stateName: "West Bengal", districtId: "WB-KOL", districtName: "Kolkata", message: "Supply exceeds demand by 124%. Placement rate below 28%. Recommend suspension of new training targets.", deltaPercent: -124, flaggedAt: "2026-10-13", isAspirational: false },
  { id: "a4", type: "saturation", severity: "Critical Oversupply", tradeName: "Tailor", ncoCode: "7433.0100", sectorName: "Textile & Apparel", stateId: "TN", stateName: "Tamil Nadu", districtId: "TN-CHE", districtName: "Chennai", message: "12,400 certified tailors placed against 5,600 openings. Saturation evident across South India cluster.", deltaPercent: -121, flaggedAt: "2026-10-12", isAspirational: false },
  { id: "a5", type: "shortage", severity: "Shortage", tradeName: "Community Health Worker", ncoCode: "3258.0100", sectorName: "Healthcare", stateId: "OR", stateName: "Odisha", districtId: "OR-MYB", districtName: "Mayurbhanj", message: "Aspirational district. NHM reported 2,700 unfilled vacancies. NSQF L4 course capacity insufficient.", deltaPercent: 56, flaggedAt: "2026-10-11", isAspirational: true },
  { id: "a6", type: "oversupply", severity: "Oversupply", tradeName: "Retail Salesman", ncoCode: "5221.0100", sectorName: "Retail", stateId: "UP", stateName: "Uttar Pradesh", districtId: "UP-AGR", districtName: "Agra", message: "Organised retail footprint in district is stagnant. Certified candidates (5,800) far exceed openings (3,200).", deltaPercent: -81, flaggedAt: "2026-10-10", isAspirational: false },
];

export const mockRecommendations: Recommendation[] = [
  { id: "r1", type: "increase_seats", priority: "High", tradeName: "Solar Panel Installation Technician", ncoCode: "7412.0200", sectorName: "Green Jobs / Solar", stateId: "RJ", stateName: "Rajasthan", districtId: "RJ-JOD", districtName: "Jodhpur", currentSeats: 320, recommendedSeats: 1200, seatDelta: 880, rationale: "Demand-supply gap of 74%. PM-Surya Ghar scheme will create 30L+ rooftop solar installations in next 3 years.", evidence: "MNRE targets, 12 installer companies with open positions on NCS portal, PLFS hiring signal +78% YoY.", estimatedImpact: "880 additional placements per cycle; reduces gap to ~40% by FY-26" },
  { id: "r2", type: "new_course", priority: "High", tradeName: "EV Battery Technician", ncoCode: "7231.0100", sectorName: "Automotive", stateId: "MH", stateName: "Maharashtra", districtId: "MH-PUN", districtName: "Pune", currentSeats: 0, recommendedSeats: 600, seatDelta: 600, rationale: "No NSQF-aligned course exists. 8 OEMs and 23 EV service centres reported acute shortage.", evidence: "Industry consultation data, SIAM EV sales projections, NCS job postings NCO 7231.0100.", estimatedImpact: "New NSQF L5 qualification; 600 industry-ready technicians per year from 2026" },
  { id: "r3", type: "decrease_seats", priority: "Medium", tradeName: "Data Entry Operator", ncoCode: "4132.0100", sectorName: "IT & ITeS", stateId: "WB", stateName: "West Bengal", districtId: "WB-KOL", districtName: "Kolkata", currentSeats: 4200, recommendedSeats: 1800, seatDelta: -2400, rationale: "Supply exceeds demand by 124%. Placement rate at 28%. Continuing to train causes candidate underemployment.", evidence: "PLFS employment data, NCS job matching data, e-Shram worker livelihood survey.", estimatedImpact: "Frees ₹8.4 Cr in training budget for reallocation to shortage trades" },
  { id: "r4", type: "revise_curriculum", priority: "Medium", tradeName: "Tailor", ncoCode: "7433.0100", sectorName: "Textile & Apparel", stateId: "TN", stateName: "Tamil Nadu", districtId: "TN-CHE", districtName: "Chennai", currentSeats: 6800, recommendedSeats: 3000, seatDelta: -3800, rationale: "Basic tailoring oversupplied. Demand exists for garment finishing, embroidery, and export-quality sewing.", evidence: "AEPC export unit hiring data, TASC industry survey, NCS postings.", estimatedImpact: "Curriculum pivot to export-quality segment; 40% demand recovery projected" },
];

export const mockMethodology: MethodologyStep[] = [
  { id: "m1", title: "Data Ingestion & Normalisation", description: "Labour market signals are ingested from NCS job postings, e-Shram worker registrations, PLFS quarterly estimates, and industry hiring surveys. All occupation codes are mapped to the 4-digit NCO-2015 classification.", formula: "DemandIndex_t = w1·NCS_t + w2·eSHRAM_t + w3·PLFS_t + w4·Industry_t", references: ["NCO-2015, MoSPI", "NCS API v2, NIC", "PLFS Annual Report 2024-25"] },
  { id: "m2", title: "Supply Estimation", description: "Training supply is estimated from MSDE's training management systems (SMART portal), NSDC partner centre data, and state skill mission enrolment figures.", formula: "Supply_t = Enrolments_t × CompletionRate_t × PlacementRate_t", references: ["SMART Portal, MSDE", "NSDC Partner Data"] },
  { id: "m3", title: "Gap Calculation & Severity Banding", description: "The demand-supply gap is computed for each (Trade × District × Quarter) combination. Gap severity is banded based on gap percentage thresholds.", formula: "Gap% = (Demand - Supply) / Demand × 100\nCritical Shortage: Gap% > 50%\nShortage: 20% < Gap% ≤ 50%\nBalanced: -20% ≤ Gap% ≤ 20%\nOversupply: -50% ≤ Gap% < -20%\nCritical Oversupply: Gap% < -50%", references: ["World Bank STEP methodology", "ILO Labour Market Information Guide"] },
  { id: "m4", title: "Forecasting Model", description: "A SARIMA-XGBoost ensemble model generates 3-year forward forecasts with 80% confidence intervals, using GDP growth projections, sector-level investment plans, and demographic factors as exogenous regressors.", formula: "Forecast = 0.6·SARIMA + 0.4·XGBoost\nCI_80 = ±1.28σ_residuals", references: ["Box-Jenkins ARIMA methodology", "Chen & Guestrin (2016) XGBoost"] },
];

export const mockSources: DataSource[] = [
  { id: "ncs", name: "National Career Service (NCS) Portal", description: "Job postings mapped to NCO codes, employer data, jobseeker registrations", lastIngested: "2026-10-17", status: "demo", recordCount: 2845000, coverageNote: "Synthetic data. Production will use NCS API v2." },
  { id: "eshram", name: "e-Shram Portal", description: "Unorganised sector worker registrations by occupation and district", lastIngested: "2026-10-17", status: "demo", recordCount: 41200000, coverageNote: "Synthetic data. Production will use e-Shram batch export." },
  { id: "plfs", name: "PLFS (Periodic Labour Force Survey)", description: "Quarterly employment and unemployment estimates by occupation", lastIngested: "2026-10-01", status: "demo", recordCount: 152000, coverageNote: "Based on PLFS Q1 2026-27 public report." },
  { id: "smart", name: "SMART Portal (MSDE)", description: "Training centre registrations, batch enrolments, assessment outcomes", lastIngested: "2026-10-17", status: "demo", recordCount: 3400000, coverageNote: "Synthetic data mirroring SMART schema." },
  { id: "nsdc", name: "NSDC Partner Data", description: "Training partner seat allocations by trade and state", lastIngested: "2026-10-15", status: "demo", recordCount: 890000, coverageNote: "Anonymised synthetic data." },
];

export const mockStateMapData: StateMapData[] = [
  { stateId: "MH", stateName: "Maharashtra", gapScore: 38, severity: "Shortage", totalDemand: 148000, totalSupply: 91760 },
  { stateId: "UP", stateName: "Uttar Pradesh", gapScore: 42, severity: "Shortage", totalDemand: 210000, totalSupply: 121800 },
  { stateId: "RJ", stateName: "Rajasthan", gapScore: 55, severity: "Critical Shortage", totalDemand: 98000, totalSupply: 44100 },
  { stateId: "GJ", stateName: "Gujarat", gapScore: 12, severity: "Balanced", totalDemand: 88000, totalSupply: 77440 },
  { stateId: "TN", stateName: "Tamil Nadu", gapScore: -28, severity: "Oversupply", totalDemand: 95000, totalSupply: 121600 },
  { stateId: "KA", stateName: "Karnataka", gapScore: 15, severity: "Balanced", totalDemand: 102000, totalSupply: 86700 },
  { stateId: "WB", stateName: "West Bengal", gapScore: -52, severity: "Critical Oversupply", totalDemand: 76000, totalSupply: 115520 },
  { stateId: "MP", stateName: "Madhya Pradesh", gapScore: 44, severity: "Shortage", totalDemand: 92000, totalSupply: 51520 },
  { stateId: "OR", stateName: "Odisha", gapScore: 48, severity: "Shortage", totalDemand: 58000, totalSupply: 30160 },
  { stateId: "JH", stateName: "Jharkhand", gapScore: 51, severity: "Critical Shortage", totalDemand: 41000, totalSupply: 20090 },
  { stateId: "PB", stateName: "Punjab", gapScore: -18, severity: "Balanced", totalDemand: 62000, totalSupply: 73160 },
  { stateId: "HR", stateName: "Haryana", gapScore: 22, severity: "Shortage", totalDemand: 68000, totalSupply: 52920 },
  { stateId: "AP", stateName: "Andhra Pradesh", gapScore: 30, severity: "Shortage", totalDemand: 84000, totalSupply: 58800 },
  { stateId: "TS", stateName: "Telangana", gapScore: 8, severity: "Balanced", totalDemand: 79000, totalSupply: 72680 },
  { stateId: "KL", stateName: "Kerala", gapScore: -35, severity: "Oversupply", totalDemand: 54000, totalSupply: 72900 },
  { stateId: "CH", stateName: "Chhattisgarh", gapScore: 46, severity: "Shortage", totalDemand: 47000, totalSupply: 25380 },
  { stateId: "AS", stateName: "Assam", gapScore: 38, severity: "Shortage", totalDemand: 52000, totalSupply: 32240 },
  { stateId: "UK", stateName: "Uttarakhand", gapScore: 25, severity: "Shortage", totalDemand: 28000, totalSupply: 20930 },
  { stateId: "HP", stateName: "Himachal Pradesh", gapScore: 18, severity: "Balanced", totalDemand: 22000, totalSupply: 18040 },
  { stateId: "DL", stateName: "Delhi", gapScore: -10, severity: "Balanced", totalDemand: 114000, totalSupply: 125400 },
];

// ── Phase 2 mock data ─────────────────────────────────────────────────────────

import type { NewsItem, NewsResponse, EshramSummaryResponse } from "../types";

export const mockNews: NewsResponse = {
  source: "synthetic",
  provider: "seed",
  fetched_at: new Date().toISOString(),
  items: [
    { id: "m1", title: "PMKVY 4.0 targets 40 lakh youth in emerging tech sectors", summary: "MSDE announced Pradhan Mantri Kaushal Vikas Yojana 4.0 focusing on drone, AI, green jobs.", url: "#", source_name: "PIB India", published_at: new Date(Date.now() - 1 * 3600000).toISOString(), image_url: null, tags: ["PMKVY", "skill development"], relevance: 9 },
    { id: "m2", title: "e-Shram portal crosses 30 crore registrations of unorganised workers", summary: "The Ministry of Labour's e-Shram portal has registered over 30 crore unorganised workers for social security.", url: "#", source_name: "PIB India", published_at: new Date(Date.now() - 5 * 3600000).toISOString(), image_url: null, tags: ["e-Shram", "unorganised workers"], relevance: 10 },
    { id: "m3", title: "NCS centres to expand to 500 new employment exchange points", summary: "National Career Service centres will reach tier-2 and tier-3 cities to improve job matching.", url: "#", source_name: "PIB India", published_at: new Date(Date.now() - 12 * 3600000).toISOString(), image_url: null, tags: ["NCS", "employment"], relevance: 8 },
    { id: "m4", title: "PLFS 2025-26: Urban unemployment falls to 7.2%", summary: "Periodic Labour Force Survey shows improved labour market conditions with higher female participation.", url: "#", source_name: "MoSPI", published_at: new Date(Date.now() - 24 * 3600000).toISOString(), image_url: null, tags: ["PLFS", "unemployment", "labour market"], relevance: 8 },
    { id: "m5", title: "Apprenticeship Act amendment to create 10 lakh new seats", summary: "Mandatory apprenticeship for establishments above 100 workers to generate new training opportunities.", url: "#", source_name: "Business Standard", published_at: new Date(Date.now() - 36 * 3600000).toISOString(), image_url: null, tags: ["apprenticeship", "skill development"], relevance: 7 },
    { id: "m6", title: "Gig workers to get social security under new labour code rules", summary: "Code on Social Security, 2020 rules will extend ESIC and EPFO coverage to platform workers.", url: "#", source_name: "Economic Times", published_at: new Date(Date.now() - 48 * 3600000).toISOString(), image_url: null, tags: ["gig workers", "labour code"], relevance: 7 },
  ] as NewsItem[],
};

export const mockEshramSummary: EshramSummaryResponse = {
  national_total: 28_54_12_000,
  source: "synthetic",
  snapshot_date: new Date().toISOString().slice(0, 10),
  fetched_at: new Date().toISOString(),
  record_count: 728,
  state_totals: [
    { state: "Uttar Pradesh", total: 7_82_34_000 },
    { state: "Bihar", total: 3_45_67_000 },
    { state: "West Bengal", total: 2_98_11_000 },
    { state: "Madhya Pradesh", total: 2_14_55_000 },
    { state: "Maharashtra", total: 1_87_23_000 },
    { state: "Rajasthan", total: 1_65_44_000 },
    { state: "Tamil Nadu", total: 1_23_88_000 },
    { state: "Gujarat", total: 1_10_32_000 },
  ],
  top_districts: [
    { state: "Uttar Pradesh", district: "Lucknow", registered_workers_total: 3_45_000, male: 2_10_000, female: 1_35_000, age_18_40: 2_00_000, age_40_plus: 1_45_000, sc: 80_000, st: 12_000, obc: 1_80_000, general: 73_000, snapshot_date: new Date().toISOString().slice(0, 10), source: "synthetic", fetched_at: new Date().toISOString() },
    { state: "Uttar Pradesh", district: "Varanasi", registered_workers_total: 2_89_000, male: 1_78_000, female: 1_11_000, age_18_40: 1_65_000, age_40_plus: 1_24_000, sc: 67_000, st: 8_000, obc: 1_54_000, general: 60_000, snapshot_date: new Date().toISOString().slice(0, 10), source: "synthetic", fetched_at: new Date().toISOString() },
    { state: "Maharashtra", district: "Mumbai", registered_workers_total: 2_67_000, male: 1_65_000, female: 1_02_000, age_18_40: 1_55_000, age_40_plus: 1_12_000, sc: 45_000, st: 23_000, obc: 1_35_000, general: 64_000, snapshot_date: new Date().toISOString().slice(0, 10), source: "synthetic", fetched_at: new Date().toISOString() },
    { state: "Bihar", district: "Patna", registered_workers_total: 2_45_000, male: 1_55_000, female: 90_000, age_18_40: 1_40_000, age_40_plus: 1_05_000, sc: 56_000, st: 9_000, obc: 1_30_000, general: 50_000, snapshot_date: new Date().toISOString().slice(0, 10), source: "synthetic", fetched_at: new Date().toISOString() },
    { state: "Tamil Nadu", district: "Chennai", registered_workers_total: 2_12_000, male: 1_30_000, female: 82_000, age_18_40: 1_22_000, age_40_plus: 90_000, sc: 48_000, st: 6_000, obc: 1_10_000, general: 48_000, snapshot_date: new Date().toISOString().slice(0, 10), source: "synthetic", fetched_at: new Date().toISOString() },
  ],
};

