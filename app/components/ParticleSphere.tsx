"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles() {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const goldColor = new THREE.Color("#f59e0b");
    const amberColor = new THREE.Color("#d97706");
    const whiteColor = new THREE.Color("#ffffff");
    const brightGold = new THREE.Color("#fbbf24");

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution for even spread
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      // Radius varies: dense core, scattered outer shell
      const baseRadius = 2.2;
      const noise = Math.random();
      // More particles near the core, fewer at edges
      const radiusVariance = noise < 0.7
        ? baseRadius * (0.85 + Math.random() * 0.2)
        : baseRadius * (1.0 + Math.random() * 0.4);

      positions[i * 3] = radiusVariance * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radiusVariance * Math.cos(phi);
      positions[i * 3 + 2] = radiusVariance * Math.sin(phi) * Math.sin(theta);

      // Color gradient: white/bright at core, amber/gold at edges
      const distFromCenter = radiusVariance / (baseRadius * 1.4);
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

    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) {
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

export default function ParticleSphere() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <Particles />
    </Canvas>
  );
}
