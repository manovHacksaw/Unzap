"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function generateParticleData() {
  const count = 6000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const originalRadii = new Float32Array(count);

  const goldColor = new THREE.Color("#f59e0b");
  const amberColor = new THREE.Color("#d97706");
  const whiteColor = new THREE.Color("#ffffff");
  const brightGold = new THREE.Color("#fbbf24");

  // Use a simple seeded random for purity
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const baseRadius = 2.2;
    const radiusVariance = baseRadius * (0.95 + seededRandom() * 0.1);
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
}

const PARTICLE_DATA = generateParticleData();

function Particles({ isReacting }: { isReacting?: boolean }) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  const { positions, colors } = PARTICLE_DATA;

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Constant rotation + extra when reacting
      const speed = isReacting ? 0.3 : 0.08;
      meshRef.current.rotation.y += delta * speed;
      meshRef.current.rotation.x += delta * 0.01;
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
        size={isReacting ? 0.035 : 0.022}
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
