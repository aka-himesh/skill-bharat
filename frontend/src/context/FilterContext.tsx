import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Filters } from "../types";

interface FilterContextValue {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string | boolean | undefined) => void;
  setFilters: (updates: Partial<Record<keyof Filters, string | boolean | undefined>>) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextValue>({
  filters: {},
  setFilter: () => {},
  setFilters: () => {},
  clearFilters: () => {},
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: Filters = useMemo(() => {
    const sId = searchParams.get("stateId")?.trim();
    const dId = searchParams.get("districtId")?.trim();
    const secId = searchParams.get("sectorId")?.trim();
    const nco = searchParams.get("ncoCode")?.trim();
    const nsqf = searchParams.get("nsqfLevel")?.trim();
    const hor = searchParams.get("horizon")?.trim();
    const query = searchParams.get("q")?.trim();
    const isAsp = searchParams.get("isAspirational") === "true";

    return {
      stateId: sId || undefined,
      districtId: dId || undefined,
      isAspirational: isAsp ? true : undefined,
      sectorId: secId || undefined,
      ncoCode: nco || undefined,
      nsqfLevel: nsqf || undefined,
      horizon: hor || undefined,
      q: query || undefined,
    };
  }, [searchParams]);

  const setFilters = useCallback((updates: Partial<Record<keyof Filters, string | boolean | undefined>>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === false) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFilter = useCallback((key: keyof Filters, value: string | boolean | undefined) => {
    setFilters({ [key]: value });
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return (
    <FilterContext.Provider value={{ filters, setFilter, setFilters, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilters = () => useContext(FilterContext);
