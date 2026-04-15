import { useState, useCallback } from "react";

const MAX_DIMENSIONS = 3;

export function useDimensionSelection() {
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);

  const setDimensions = useCallback((dimensions: string[]) => {
    setSelectedDimensions(dimensions.slice(0, MAX_DIMENSIONS));
  }, []);

  const toggleDimension = useCallback((dimension: string) => {
    setSelectedDimensions((prev) => {
      if (prev.includes(dimension)) {
        return prev.filter((d) => d !== dimension);
      }
      if (prev.length >= MAX_DIMENSIONS) {
        return prev;
      }
      return [...prev, dimension];
    });
  }, []);

  const clearDimensions = useCallback(() => {
    setSelectedDimensions([]);
  }, []);

  return { selectedDimensions, setDimensions, toggleDimension, clearDimensions };
}
