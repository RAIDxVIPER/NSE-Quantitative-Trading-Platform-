"use client";

import { useState, useEffect, useCallback } from "react";

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const currentProgress = maxScroll > 0 ? currentY / maxScroll : 0;

    setScrollY(currentY);
    setProgress(currentProgress);
    setIsScrolled(currentY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return { progress, scrollY, isScrolled };
}
