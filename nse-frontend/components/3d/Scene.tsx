"use client";

import React, { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, Preload } from "@react-three/drei";
import { useAppStore } from "@/lib/store";
import { ParticleField } from "./ParticleField";

export function Scene() {
  const setQualityLevel = useAppStore((s) => s.setQualityLevel);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.7 }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 50], fov: 60, near: 0.1, far: 200 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <PerformanceMonitor
          onIncline={() => setQualityLevel("high")}
          onDecline={() => setQualityLevel("low")}
          onChange={({ factor }) => {
            if (factor > 0.7) setQualityLevel("high");
            else if (factor > 0.4) setQualityLevel("medium");
            else setQualityLevel("low");
          }}
        >
          {/* Lighting rig */}
          <ambientLight intensity={0.15} />
          <pointLight position={[20, 20, 20]} intensity={0.4} color="#6C63FF" />
          <pointLight position={[-20, -10, 10]} intensity={0.2} color="#00D4FF" />

          <Suspense fallback={null}>
            <ParticleField />
            <Preload all />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
