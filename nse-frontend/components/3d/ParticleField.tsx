"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useAppStore } from "@/lib/store";

export function ParticleField() {
  const particleCount = useAppStore((s) => s.particleCount);
  const meshRef = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Track mouse for parallax (read from CSS vars)
  if (typeof window !== "undefined") {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (typeof window !== "undefined" && !meshRef.current) {
      window.addEventListener("mousemove", onMove, { passive: true });
    }
  }

  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 120;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.015;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = Math.random() * 1.5 + 0.3;
    }

    return { positions, velocities, sizes };
  }, [particleCount]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const clampedDelta = Math.min(delta, 0.1);
    const mouseX = mouseRef.current.x;
    const mouseY = mouseRef.current.y;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Drift
      arr[i3] += velocities[i3] * clampedDelta * 60;
      arr[i3 + 1] += velocities[i3 + 1] * clampedDelta * 60;
      arr[i3 + 2] += velocities[i3 + 2] * clampedDelta * 60;

      // Mouse parallax
      arr[i3] += mouseX * 0.003 * (sizes[i] / 1.5);
      arr[i3 + 1] -= mouseY * 0.003 * (sizes[i] / 1.5);

      // Wrap around
      if (arr[i3] > 60) arr[i3] = -60;
      if (arr[i3] < -60) arr[i3] = 60;
      if (arr[i3 + 1] > 40) arr[i3 + 1] = -40;
      if (arr[i3 + 1] < -40) arr[i3 + 1] = 40;
      if (arr[i3 + 2] > 30) arr[i3 + 2] = -30;
      if (arr[i3 + 2] < -30) arr[i3 + 2] = 30;
    }

    posAttr.needsUpdate = true;

    // Subtle rotation
    meshRef.current.rotation.y += clampedDelta * 0.008;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={particleCount}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.8}
        sizeAttenuation
        transparent
        opacity={0.4}
        color="#6C63FF"
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
