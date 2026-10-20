/**
 * useApi.ts — React Query hooks wrapping the API service.
 *
 * Each hook maps to a backend endpoint, handles auth errors (401),
 * and provides loading/error/data states to consuming components.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchSummary,
  fetchStates,
  fetchDistricts,
  fetchSectors,
  fetchOccupations,
  fetchGaps,
  fetchRanking,
  fetchForecast,
  fetchAlerts,
  fetchRecommendations,
  fetchSourcesStatus,
  fetchExternalSources,
  fetchMethodology,
} from "../services/api";

// Stale time: 5 minutes (matches QueryClient default)
const STALE = 5 * 60 * 1000;

export function useSummary(
  params?: { state_id?: number; district_id?: number; sector_id?: number },
  enabled = true
) {
  return useQuery({
    queryKey: ["summary", params],
    queryFn: () => fetchSummary(params),
    staleTime: STALE,
    enabled,
  });
}

export function useStates(enabled = true) {
  return useQuery({
    queryKey: ["states"],
    queryFn: fetchStates,
    staleTime: STALE,
    enabled,
  });
}

export function useDistricts(stateId?: number, enabled = true) {
  return useQuery({
    queryKey: ["districts", stateId],
    queryFn: () => fetchDistricts(stateId),
    staleTime: STALE,
    enabled,
  });
}

export function useSectors(enabled = true) {
  return useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: STALE,
    enabled,
  });
}

export function useOccupations(params?: { q?: string; sector_id?: number; limit?: number; offset?: number }, enabled = true) {
  return useQuery({
    queryKey: ["occupations", params],
    queryFn: () => fetchOccupations(params),
    staleTime: STALE,
    enabled,
  });
}

export function useGaps(params?: {
  level?: string;
  state_id?: number;
  district_id?: number;
  sector_id?: number;
  occupation_id?: number;
  nsqf_level?: number;
  is_aspirational?: boolean;
  horizon?: number;
}, enabled = true) {
  return useQuery({
    queryKey: ["gaps", params],
    queryFn: () => fetchGaps(params),
    staleTime: STALE,
    enabled,
  });
}

export function useRanking(params?: {
  type?: string;
  limit?: number;
  state_id?: number;
  district_id?: number;
  sector_id?: number;
}, enabled = true) {
  return useQuery({
    queryKey: ["ranking", params],
    queryFn: () => fetchRanking(params),
    staleTime: STALE,
    enabled,
  });
}

export function useForecast(districtId: number, occupationId: number, enabled = true) {
  return useQuery({
    queryKey: ["forecast", districtId, occupationId],
    queryFn: () => fetchForecast(districtId, occupationId),
    staleTime: STALE,
    enabled: enabled && districtId > 0 && occupationId > 0,
  });
}

export function useAlerts(params?: {
  severity?: string;
  state_id?: number;
  district_id?: number;
  sector_id?: number;
  occupation_id?: number;
  alert_type?: string;
  limit?: number;
}, enabled = true) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: () => fetchAlerts(params),
    staleTime: STALE,
    enabled,
  });
}

export function useRecommendations(params?: {
  state_id?: number;
  district_id?: number;
  sector_id?: number;
  occupation_id?: number;
  action_type?: string;
  limit?: number;
}, enabled = true) {
  return useQuery({
    queryKey: ["recommendations", params],
    queryFn: () => fetchRecommendations(params),
    staleTime: STALE,
    enabled,
  });
}

export function useSourcesStatus(enabled = true) {
  return useQuery({
    queryKey: ["sources-status"],
    queryFn: fetchSourcesStatus,
    staleTime: STALE,
    enabled,
  });
}

export function useExternalSources(enabled = true) {
  return useQuery({
    queryKey: ["external-sources"],
    queryFn: fetchExternalSources,
    staleTime: STALE,
    enabled,
  });
}

export function useMethodology(enabled = true) {
  return useQuery({
    queryKey: ["methodology"],
    queryFn: fetchMethodology,
    staleTime: STALE,
    enabled,
  });
}

// ── Phase 2: News & e-Shram hooks ─────────────────────────────────────────────

import {
  fetchNews,
  fetchNewsKeywords,
  fetchEshramSummary,
  fetchEshramDistricts,
  fetchEshramDistrictDetail,
} from "../services/api";

// News: stale after 15 minutes
const NEWS_STALE = 15 * 60 * 1000;
// e-Shram: stale after 6 hours (daily dataset)
const ESHRAM_STALE = 6 * 60 * 60 * 1000;

export function useNews(params?: { limit?: number; q?: string }, enabled = true) {
  return useQuery({
    queryKey: ["news", params],
    queryFn: () => fetchNews(params),
    staleTime: NEWS_STALE,
    enabled,
  });
}

export function useNewsKeywords(enabled = true) {
  return useQuery({
    queryKey: ["news-keywords"],
    queryFn: fetchNewsKeywords,
    staleTime: STALE,
    enabled,
  });
}

export function useEshramSummary(state?: string, enabled = true) {
  return useQuery({
    queryKey: ["eshram-summary", state],
    queryFn: () => fetchEshramSummary(state),
    staleTime: ESHRAM_STALE,
    enabled,
  });
}

export function useEshramDistricts(
  params?: { state?: string; q?: string },
  enabled = true
) {
  return useQuery({
    queryKey: ["eshram-districts", params],
    queryFn: () => fetchEshramDistricts(params),
    staleTime: ESHRAM_STALE,
    enabled,
  });
}

export function useEshramDistrictDetail(district: string | null, enabled = true) {
  return useQuery({
    queryKey: ["eshram-district", district],
    queryFn: () => fetchEshramDistrictDetail(district!),
    staleTime: ESHRAM_STALE,
    enabled: enabled && !!district,
  });
}

