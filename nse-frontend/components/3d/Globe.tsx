"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GLOBE_RADIUS = 6;
const DOT_COUNT = 2000;

// Market exchange positions (lat, lng in degrees)
const EXCHANGES = [
  { name: "NSE", lat: 19.07, lng: 72.87, color: "#6C63FF" },
  { name: "NYSE", lat: 40.71, lng: -74.0, color: "#00D4FF" },
  { name: "LSE", lat: 51.51, lng: -0.12, color: "#F5A623" },
  { name: "TSE", lat: 35.68, lng: 139.69, color: "#FF3B6B" },
  { name: "HKEX", lat: 22.29, lng: 114.17, color: "#00E5A0" },
  { name: "SSE", lat: 31.23, lng: 121.47, color: "#00D4FF" },
];

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function Globe() {
  const globeRef = useRef<THREE.Group>(null);
  const pingsRef = useRef<THREE.Group>(null);

  // Generate dot matrix on sphere
  const dotPositions = useMemo(() => {
    const positions = new Float32Array(DOT_COUNT * 3);
    const colors = new Float32Array(DOT_COUNT * 3);

    for (let i = 0; i < DOT_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();

      const i3 = i * 3;
      positions[i3] = GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = GLOBE_RADIUS * Math.cos(phi);
      positions[i3 + 2] = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);

      // Base color: dim indigo
      colors[i3] = 0.42;
      colors[i3 + 1] = 0.39;
      colors[i3 + 2] = 1.0;
    }

    return { positions, colors };
  }, []);

  // Generate arcs between exchanges
  const arcs = useMemo(() => {
    const arcData: { curve: THREE.CatmullRomCurve3; color: string }[] = [];

    for (let i = 0; i < EXCHANGES.length; i++) {
      for (let j = i + 1; j < EXCHANGES.length; j++) {
        if (Math.random() > 0.5) continue; // Only show some arcs

        const start = latLngToVec3(EXCHANGES[i].lat, EXCHANGES[i].lng, GLOBE_RADIUS);
        const end = latLngToVec3(EXCHANGES[j].lat, EXCHANGES[j].lng, GLOBE_RADIUS);

        const mid = start.clone().add(end).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(GLOBE_RADIUS * 1.4);

        const curve = new THREE.CatmullRomCurve3([start, mid, end]);
        arcData.push({ curve, color: EXCHANGES[i].color });
      }
    }

    return arcData;
  }, []);

  useFrame((state) => {
    if (!globeRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow rotation
    globeRef.current.rotation.y = t * 0.05;

    // Ping pulse
    if (pingsRef.current) {
      pingsRef.current.children.forEach((child, i) => {
        const scale = 1 + Math.sin(t * 2 + i * 1.5) * 0.3;
        child.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group ref={globeRef} position={[0, 0, -20]} rotation={[0.3, 0, 0.1]}>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.15, 32, 32]} />
        <meshBasicMaterial
          color="#6C63FF"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Dot matrix sphere */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dotPositions.positions, 3]}
            count={DOT_COUNT}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[dotPositions.colors, 3]}
            count={DOT_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Exchange pings */}
      <group ref={pingsRef}>
        {EXCHANGES.map((exchange) => {
          const pos = latLngToVec3(exchange.lat, exchange.lng, GLOBE_RADIUS * 1.02);
          return (
            <mesh key={exchange.name} position={pos}>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshBasicMaterial
                color={exchange.color}
                transparent
                opacity={0.8}
              />
            </mesh>
          );
        })}
      </group>

      {/* Connection arcs */}
      {arcs.map((arc, i) => {
        const points = arc.curve.getPoints(40);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={i}>
            <bufferGeometry attach="geometry" {...geometry} />
            <lineBasicMaterial
              color={arc.color}
              transparent
              opacity={0.2}
              linewidth={1}
            />
          </line>
        );
      })}
    </group>
  );
}
