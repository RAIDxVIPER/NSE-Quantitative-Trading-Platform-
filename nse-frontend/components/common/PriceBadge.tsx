"use client";

import React from "react";
import { cn, formatPercent, getDeltaSymbol } from "@/lib/utils";

interface PriceBadgeProps {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PriceBadge({ value, className, size = "md" }: PriceBadgeProps) {
  const isPositive = value >= 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-mono font-medium",
        sizeClasses[size],
        isNeutral
          ? "pill-neutral"
          : isPositive
            ? "pill-positive"
            : "pill-negative",
        className
      )}
    >
      {getDeltaSymbol(value)} {formatPercent(value)}
    </span>
  );
}
