import React, { createContext, useContext, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { Filters } from "../types";

interface FilterContextValue {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string | boolean | undefined) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextValue>({
  filters: {},
  setFilter: () => {},
  clearFilters: () => {},
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: Filters = {
    stateId: searchParams.get("stateId") ?? undefined,
    districtId: searchParams.get("districtId") ?? undefined,
    isAspirational: searchParams.get("isAspirational") === "true" ? true : undefined,
    sectorId: searchParams.get("sectorId") ?? undefined,
    ncoCode: searchParams.get("ncoCode") ?? undefined,
    nsqfLevel: searchParams.get("nsqfLevel") ?? undefined,
    horizon: searchParams.get("horizon") ?? undefined,
  };

  const setFilter = useCallback((key: keyof Filters, value: string | boolean | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return (
    <FilterContext.Provider value={{ filters, setFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilters = () => useContext(FilterContext);
