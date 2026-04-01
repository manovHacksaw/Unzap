"use client";

import dynamic from "next/dynamic";

const ParticleSphere = dynamic(() => import("./ParticleSphere"), { ssr: false });

interface HeroSphereProps {
    isReacting?: boolean;
}

export default function HeroSphere({ isReacting }: HeroSphereProps) {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Static Ambient Glow */}
            <div
                className="absolute w-[140%] h-[140%] rounded-full opacity-20 pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(180,100,0,0.4) 0%, rgba(140,60,0,0.1) 40%, transparent 70%)",
                }}
            />

            {/* Particle Sphere */}
            <div className="w-full h-full relative z-10">
                <ParticleSphere isReacting={isReacting} />
            </div>
        </div>
    );
}
