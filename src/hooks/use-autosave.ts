"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

// Custom debounce function with proper typing
function createDebouncedFn<T>(
  fn: (data: T) => Promise<void>,
  delay: number
): (data: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (data: T) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(data), delay);
  };
}

export function useAutosave<T>({
  data,
  onSave,
  delay = 1000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const isFirstRender = useRef(true);
  const previousData = useRef<T>(data);

  // Create a memoized debounced save function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    createDebouncedFn(async (dataToSave: T) => {
      try {
        await onSave(dataToSave);
      } catch (error) {
        console.error("Autosave error:", error);
      }
    }, delay),
    [onSave, delay]
  );

  useEffect(() => {
    // Skip the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousData.current = data;
      return;
    }

    // Skip if disabled
    if (!enabled) return;

    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousData.current)) {
      return;
    }

    previousData.current = data;
    debouncedSave(data);
  }, [data, debouncedSave, enabled]);
}
