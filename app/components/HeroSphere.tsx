"use client";

import dynamic from "next/dynamic";

const LogoParticles = dynamic(() => import("@/components/ui/logo-particles"), { ssr: false });

interface HeroSphereProps {
    isReacting?: boolean;
}

export default function HeroSphere({ isReacting }: HeroSphereProps) {
    return (
        <div className="relative w-full h-full flex items-center justify-center" data-reacting={isReacting ? "true" : "false"}>
            {/* Static Ambient Glow — SN logo palette (coral + navy) */}
            <div
                className="absolute w-[140%] h-[140%] rounded-full opacity-20 pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(236,121,107,0.3) 0%, rgba(12,12,79,0.15) 40%, transparent 70%)",
                }}
            />

            {/* Logo Particles */}
            <div className="w-full h-full relative z-10">
                <LogoParticles />
            </div>
        </div>
    );
}
