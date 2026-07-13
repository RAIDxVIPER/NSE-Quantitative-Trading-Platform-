"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { lerp } from "@/lib/utils";

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

export function useMousePosition(lerpFactor = 0.08) {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });

  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    currentRef.current.x = lerp(currentRef.current.x, targetRef.current.x, lerpFactor);
    currentRef.current.y = lerp(currentRef.current.y, targetRef.current.y, lerpFactor);

    const nx = currentRef.current.x / (typeof window !== "undefined" ? window.innerWidth : 1);
    const ny = currentRef.current.y / (typeof window !== "undefined" ? window.innerHeight : 1);

    setPosition({
      x: currentRef.current.x,
      y: currentRef.current.y,
      normalizedX: nx,
      normalizedY: ny,
    });

    // Update CSS custom properties for spotlight cursor
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--cursor-x", `${currentRef.current.x}px`);
      document.documentElement.style.setProperty("--cursor-y", `${currentRef.current.y}px`);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [lerpFactor]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return position;
}
