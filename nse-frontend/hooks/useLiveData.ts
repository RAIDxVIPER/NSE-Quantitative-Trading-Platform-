"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook to auto-refresh live market data at regular intervals.
 * Uses TanStack Query's refetch mechanism.
 */
export function useLiveData(intervalMs = 30_000) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      // Invalidate all live-data queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["market"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [queryClient, intervalMs]);
}
