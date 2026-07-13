"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface AllocationRingProps {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AllocationRing({
  segments,
  size = 200,
  strokeWidth = 24,
  className,
}: AllocationRingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Intersection observer for animate-on-mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  let cumulativePercent = 0;

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {segments.map((segment, i) => {
          const percent = total > 0 ? segment.value / total : 0;
          const dashLength = percent * circumference;
          const dashOffset = -(cumulativePercent * circumference);
          const gap = segments.length > 1 ? 3 : 0; // gap between segments

          cumulativePercent += percent;

          return (
            <circle
              key={segment.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength - gap} ${circumference - dashLength + gap}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1), stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)",
                strokeDasharray: isVisible
                  ? `${dashLength - gap} ${circumference - dashLength + gap}`
                  : `0 ${circumference}`,
                strokeDashoffset: isVisible ? dashOffset : 0,
                transitionDelay: `${i * 0.08}s`,
                filter: `drop-shadow(0 0 6px ${segment.color}40)`,
              }}
            />
          );
        })}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-label mb-1">Total Value</span>
        <span
          className="font-display text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          ₹{(total / 100000).toFixed(1)}L
        </span>
      </div>
    </div>
  );
}
