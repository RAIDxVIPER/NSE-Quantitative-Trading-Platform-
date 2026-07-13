"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface HolographicCardProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
}

export function HolographicCard({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  title,
  value,
  subtitle,
  accentColor = "#6C63FF",
}: HolographicCardProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.15;
    meshRef.current.rotation.y = rotation[1] + Math.sin(t * 0.3) * 0.05;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      {/* Transparent card plane with edge glow */}
      <planeGeometry args={[3.2, 2]} />
      <meshBasicMaterial transparent opacity={0} />

      <Html
        transform
        distanceFactor={8}
        style={{
          width: "200px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(10,10,18,0.6)",
            backdropFilter: "blur(16px)",
            border: `1px solid rgba(${parseInt(accentColor.slice(1, 3), 16)},${parseInt(accentColor.slice(3, 5), 16)},${parseInt(accentColor.slice(5, 7), 16)},0.25)`,
            borderRadius: "12px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Shine edge */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
            }}
          />
          {/* Holographic edge glow */}
          <div
            style={{
              position: "absolute",
              inset: "-1px",
              borderRadius: "12px",
              background: `linear-gradient(135deg, ${accentColor}20, transparent 40%, transparent 60%, ${accentColor}10)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(120,120,160,1)",
              marginBottom: "6px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: "'Clash Display', 'Space Grotesk', sans-serif",
              fontSize: "22px",
              fontWeight: 600,
              color: "#F0F0FF",
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "10px",
                color: accentColor,
                marginTop: "4px",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </Html>
    </mesh>
  );
}
