"use client";

import { useMousePosition } from "@/hooks/useMousePosition";

/** Mount once in layout — drives the spotlight-cursor CSS vars */
export function MouseTracker() {
  useMousePosition(0.08);
  return null;
}
