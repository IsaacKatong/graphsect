import { useState, useCallback } from "react";
import { FilterState, EMPTY_FILTER_STATE } from "./types";

export function useFilterState() {
  const [filterState, setFilterState] =
    useState<FilterState>(EMPTY_FILTER_STATE);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilterState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilter = useCallback((key: keyof FilterState) => {
    setFilterState((prev) => ({ ...prev, [key]: null }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState(EMPTY_FILTER_STATE);
  }, []);

  return { filterState, setFilter, clearFilter, clearAllFilters };
}
