"use client";
import { cn } from "../../lib/utils";
import createGlobe from "cobe";
import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { IconTerminal2, IconBrandGithub } from "@tabler/icons-react";

export function FeaturesSection() {
    const features = [
        {
            title: "Guided Transaction Flows",
            description:
                "Remove the black box. Step-by-step guidance through complex Starknet interactions.",
            skeleton: <SkeletonOne />,
            className:
                "col-span-1 lg:col-span-4 border-b lg:border-r border-neutral-800",
        },
        {
            title: "Real-time Visualization",
            description:
                "Watch every step of your transaction from Cairo execution to L1/L2 confirmation.",
            skeleton: <SkeletonTwo />,
            className: "border-b col-span-1 lg:col-span-2 border-neutral-800",
        },
        {
            title: "Developer Studio IDE",
            description:
                "A premium environment to build, debug and iterate on your Cairo contracts.",
            skeleton: <SkeletonThree />,
            className:
                "col-span-1 lg:col-span-3 lg:border-r border-neutral-800",
        },
        {
            title: "One-Click Deployments",
            description:
                "Powered by Starkzap SDK. Blazing fast, reliable, and production-ready execution.",
            skeleton: <SkeletonFour />,
            className: "col-span-1 lg:col-span-3 border-b lg:border-none border-neutral-800",
        },
    ];
    return (
        <div className="relative z-20 mx-auto max-w-7xl py-10 lg:py-24">
            <div className="px-8">
                <h4 className="mx-auto max-w-5xl text-center text-3xl font-medium tracking-tight text-white lg:text-5xl lg:leading-tight">
                    Tools for the next generation of Starknet builders
                </h4>

                <p className="mx-auto my-4 max-w-2xl text-center text-sm font-normal text-neutral-400 lg:text-base">
                    Unzap provides the missing infrastructure for developer experience on Starknet.
                    Everything you need to build at scale, right at your fingertips.
                </p>
            </div>

            <div className="relative">
                <div className="mt-12 grid grid-cols-1 rounded-md lg:grid-cols-6 border border-neutral-800 bg-[#0a0a0a]">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} className={feature.className}>
                            <FeatureTitle>{feature.title}</FeatureTitle>
                            <FeatureDescription>{feature.description}</FeatureDescription>
                            <div className="h-full w-full">{feature.skeleton}</div>
                        </FeatureCard>
                    ))}
                </div>
            </div>
        </div>
    );
}

const FeatureCard = ({
    children,
    className,
}: {
    children?: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn(`relative overflow-hidden p-4 sm:p-8`, className)}>
            {children}
        </div>
    );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
    return (
        <p className="mx-auto max-w-5xl text-left text-xl tracking-tight text-white md:text-2xl md:leading-snug">
            {children}
        </p>
    );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
    return (
        <p
            className={cn(
                "mx-auto max-w-4xl text-left text-sm md:text-base font-normal text-neutral-400",
                "mx-0 my-2 max-w-sm text-left md:text-sm",
            )}
        >
            {children}
        </p>
    );
};

export const SkeletonOne = () => {
    return (
        <div className="relative flex h-full gap-10 px-2 py-8">
            <div className="group mx-auto h-full w-full bg-neutral-900 border border-neutral-800 p-5 shadow-2xl">
                <div className="flex h-full w-full flex-1 flex-col space-y-2 opacity-50">
                    <div className="flex items-center gap-2 mb-4">
                        <IconTerminal2 className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Execution-v1.log</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-800 rounded animate-pulse" />
                    <div className="h-2 w-3/4 bg-neutral-800 rounded animate-pulse" />
                    <div className="h-2 w-full bg-neutral-800 rounded animate-pulse" />
                    <div className="h-2 w-1/2 bg-neutral-800 rounded animate-pulse" />
                    <div className="h-2 w-full bg-neutral-800 rounded animate-pulse" />
                    <div className="h-2 w-2/3 bg-neutral-800 rounded animate-pulse" />
                </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-60 w-full bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-60 w-full bg-gradient-to-b from-[#0a0a0a] via-transparent to-transparent" />
        </div>
    );
};

export const SkeletonThree = () => {
    return (
        <div className="group/image relative flex h-full gap-10 overflow-hidden pt-8">
            <div className="w-full h-[200px] bg-neutral-900 border border-neutral-800 rounded-t-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                        <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                    </div>
                    <IconBrandGithub className="w-4 h-4 text-neutral-600" />
                </div>
                <div className="space-y-3 pt-2">
                    <div className="h-1.5 w-1/3 bg-neutral-700 rounded" />
                    <div className="h-1.5 w-full bg-neutral-800 rounded" />
                    <div className="h-1.5 w-2/3 bg-neutral-800 rounded" />
                    <div className="h-1.5 w-4/5 bg-neutral-800 rounded" />
                </div>
            </div>
        </div>
    );
};

const FEATURE_IMAGES = [
    "https://images.unsplash.com/photo-1517322048670-4fba75cbbb62?q=80&w=3000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1573790387438-4da905039392?q=80&w=3425&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=3540&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554931670-4ebfabf6e7a9?q=80&w=3387&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1546484475-7f7bd55792da?q=80&w=2581&auto=format&fit=crop",
];

// Seeded random for purity
const getSeededRotations = (seed: number, count: number) => {
    let s = seed;
    return Array.from({ length: count }, () => {
        s = (s * 16807) % 2147483647;
        return ((s - 1) / 2147483646) * 20 - 10;
    });
};

const ROTATIONS1 = getSeededRotations(42, FEATURE_IMAGES.length);
const ROTATIONS2 = getSeededRotations(1337, FEATURE_IMAGES.length);

export const SkeletonTwo = () => {
    const images = FEATURE_IMAGES;
    const rotations1 = ROTATIONS1;
    const rotations2 = ROTATIONS2;

    const imageVariants = {
        whileHover: {
            scale: 1.1,
            rotate: 0,
            zIndex: 100,
        },
        whileTap: {
            scale: 1.1,
            rotate: 0,
            zIndex: 100,
        },
    };
    return (
        <div className="relative flex h-full flex-col items-start gap-10 overflow-hidden p-8">
            <div className="-ml-20 flex flex-row">
                {images.map((image, idx) => (
                    <motion.div
                        variants={imageVariants}
                        key={"images-first" + idx}
                        style={{
                            rotate: rotations1[idx],
                        }}
                        whileHover="whileHover"
                        whileTap="whileTap"
                        className="mt-4 -mr-4 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-1"
                    >
                        <Image
                            src={image}
                            alt="starknet visualization"
                            width={160}
                            height={160}
                            className="h-20 w-20 shrink-0 rounded-lg object-cover md:h-40 md:w-40 grayscale opacity-50"
                        />
                    </motion.div>
                ))}
            </div>
            <div className="flex flex-row">
                {images.map((image, idx) => (
                    <motion.div
                        key={"images-second" + idx}
                        style={{
                            rotate: rotations2[idx],
                        }}
                        variants={imageVariants}
                        whileHover="whileHover"
                        whileTap="whileTap"
                        className="mt-4 -mr-4 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-1"
                    >
                        <Image
                            src={image}
                            alt="starknet visualization"
                            width={160}
                            height={160}
                            className="h-20 w-20 shrink-0 rounded-lg object-cover md:h-40 md:w-40 grayscale opacity-50"
                        />
                    </motion.div>
                ))}
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 z-[100] h-full w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[100] h-full w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
        </div>
    );
};

export const SkeletonFour = () => {
    return (
        <div className="relative mt-10 flex h-60 flex-col items-center bg-transparent md:h-60">
            <Globe className="absolute -right-10 -bottom-80 md:-right-10 md:-bottom-72" />
        </div>
    );
};

export const Globe = ({ className }: { className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let phi = 0;

        if (!canvasRef.current) return;

        const globe = createGlobe(canvasRef.current, {
            devicePixelRatio: 2,
            width: 600 * 2,
            height: 600 * 2,
            phi: 0,
            theta: 0,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 4000,
            mapBrightness: 6,
            baseColor: [0.1, 0.1, 0.1],
            markerColor: [1, 0.6, 0],
            glowColor: [0.4, 0.2, 0],
            markers: [
                { location: [37.7595, -122.4367], size: 0.03 },
                { location: [40.7128, -74.006], size: 0.1 },
            ],
            onRender: (state: { phi: number }) => {
                state.phi = phi;
                phi += 0.005;
            },
        } as Parameters<typeof createGlobe>[1]);

        return () => {
            globe.destroy();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
            className={cn("opacity-60 grayscale brightness-75", className)}
        />
    );
};
