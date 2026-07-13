"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className,
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  const roundedClass = {
    sm: "rounded",
    md: "rounded-lg",
    lg: "rounded-2xl",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={cn("skeleton", roundedClass, className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] p-6",
        className
      )}
    >
      <Skeleton width={80} height={12} className="mb-3" />
      <Skeleton width={120} height={28} className="mb-2" />
      <Skeleton width={60} height={14} />
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-fill)] p-6",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <Skeleton width={140} height={16} />
        <div className="flex gap-2">
          {[40, 40, 40, 40].map((w, i) => (
            <Skeleton key={i} width={w} height={24} rounded="full" />
          ))}
        </div>
      </div>
      <Skeleton height={300} width="100%" rounded="lg" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-4">
        {[80, 120, 60, 80, 60].map((w, i) => (
          <Skeleton key={i} width={w} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {[80, 120, 60, 80, 60].map((w, j) => (
            <Skeleton key={j} width={w} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}
