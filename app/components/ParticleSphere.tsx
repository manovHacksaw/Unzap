"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticlesProps {
  isReacting?: boolean;
}

function Particles({ isReacting }: ParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { positions, colors, originalRadii } = useMemo(() => {
    const count = 6000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const originalRadii = new Float32Array(count);

    const goldColor = new THREE.Color("#f59e0b");
    const amberColor = new THREE.Color("#d97706");
    const whiteColor = new THREE.Color("#ffffff");
    const brightGold = new THREE.Color("#fbbf24");

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const baseRadius = 2.2;
      const radiusVariance = baseRadius * (0.95 + Math.random() * 0.1);
      originalRadii[i] = radiusVariance;

      positions[i * 3] = radiusVariance * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radiusVariance * Math.cos(phi);
      positions[i * 3 + 2] = radiusVariance * Math.sin(phi) * Math.sin(theta);

      const distFromCenter = radiusVariance / (baseRadius * 1.1);
      let color: THREE.Color;
      if (distFromCenter < 0.7) {
        color = whiteColor.clone().lerp(brightGold, distFromCenter * 1.4);
      } else if (distFromCenter < 0.9) {
        color = brightGold.clone().lerp(goldColor, (distFromCenter - 0.7) * 5);
      } else {
        color = goldColor.clone().lerp(amberColor, (distFromCenter - 0.9) * 10);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return { positions, colors, originalRadii };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Constant rotation
      meshRef.current.rotation.y += delta * 0.18;
      meshRef.current.rotation.x += delta * 0.03;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        size={0.022}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default function ParticleSphere({ isReacting }: { isReacting?: boolean }) {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]} // Performance optimization for high-DPI screens
      >
        <ambientLight intensity={0.5} />
        <Particles isReacting={isReacting} />
      </Canvas>
    </div>
  );
}
