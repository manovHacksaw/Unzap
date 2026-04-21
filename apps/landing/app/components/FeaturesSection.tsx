"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const features = [
    {
        title: "Browser-first Contract Editor",
        description:
            "Author Cairo in the browser, inspect file artifacts, and view terminal output — the full write-to-compile loop in one place.",
        preview: <WorkspacePreview />,
        className: "col-span-1 lg:col-span-4 border-b lg:border-r border-neutral-800",
    },
    {
        title: "Compile & Deploy pipeline",
        description:
            "Docker-backed compilation produces Sierra artifacts on demand. Declare and deploy gaslessly to Starknet Sepolia in one flow.",
        preview: <ExecutionPreview />,
        className: "col-span-1 lg:col-span-2 border-b border-neutral-800",
    },
    {
        title: "ABI-aware interactions",
        description:
            "Load a deployed contract, pull in its ABI, and call functions directly — no hand-rolled calldata, no external tooling.",
        preview: <AbiPreview />,
        className: "col-span-1 lg:col-span-3 lg:border-r border-neutral-800",
    },
    {
        title: "Generate a Next.js Frontend",
        description:
            "One click scaffolds a typed Next.js starter pre-wired to your contract — hooks, ABI types, and wallet context included.",
        preview: <GeneratePreview />,
        className: "col-span-1 lg:col-span-3 border-neutral-800",
    },
];

export function FeaturesSection() {
    return (
        <section id="solutions" className="relative z-20 mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-24">
            <div className="px-1">
                <p
                    className="mx-auto mb-4 text-center text-[11px] uppercase tracking-[0.24em] text-neutral-500"
                    style={{ fontFamily: "monospace" }}
                >
                    Contract Lab Workflow
                </p>
                <h4 className="mx-auto max-w-5xl text-center text-3xl font-medium tracking-tight text-white lg:text-5xl lg:leading-tight">
                    Five steps from Cairo to shipped app
                </h4>

                <p className="mx-auto my-4 max-w-3xl text-center text-sm font-normal leading-relaxed text-neutral-400 lg:text-base">
                    Write a Cairo contract, compile it, deploy to Starknet, interact with it on-chain,
                    and generate a production-ready frontend — all inside one browser tab.
                </p>
            </div>

            <div className="relative mt-12 grid grid-cols-1 overflow-hidden rounded-[28px] border border-neutral-800 bg-[#0a0a0a] lg:grid-cols-6">
                {features.map((feature) => (
                    <FeatureCard key={feature.title} className={feature.className}>
                        <FeatureTitle>{feature.title}</FeatureTitle>
                        <FeatureDescription>{feature.description}</FeatureDescription>
                        <div className="h-full w-full">{feature.preview}</div>
                    </FeatureCard>
                ))}
            </div>
        </section>
    );
}

function FeatureCard({
    children,
    className,
}: {
    children?: ReactNode;
    className?: string;
}) {
    return <div className={cn("relative overflow-hidden p-5 sm:p-8", className)}>{children}</div>;
}

function FeatureTitle({ children }: { children?: ReactNode }) {
    return <p className="text-left text-xl tracking-tight text-white md:text-2xl md:leading-snug">{children}</p>;
}

function FeatureDescription({ children }: { children?: ReactNode }) {
    return (
        <p className="my-2 max-w-md text-left text-sm font-normal leading-relaxed text-neutral-400 md:text-sm">
            {children}
        </p>
    );
}

function WorkspacePreview() {
    const editorWidths = ["72%", "86%", "64%", "80%", "58%", "90%", "62%"];

    return (
        <div className="relative mt-8 min-h-[300px] overflow-hidden rounded-[24px] border border-white/8 bg-neutral-950/80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,121,107,0.12),transparent_42%)]" />
            <div className="relative flex h-full flex-col md:flex-row">
                <div className="hidden w-44 border-r border-white/8 bg-white/[0.02] md:block">
                    <div className="border-b border-white/8 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                        Explorer
                    </div>
                    <div className="space-y-2 px-4 py-4 text-sm text-neutral-400">
                        <div className="text-neutral-200">src</div>
                        <div className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-200">simple_storage.cairo</div>
                        <div className="px-2">counter.cairo</div>
                        <div className="pt-4 text-neutral-200">artifacts</div>
                        <div className="px-2 text-xs">simple_storage.abi.json</div>
                        <div className="px-2 text-xs">simple_storage.sierra.json</div>
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                        <span className="rounded-full bg-white/6 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                            simple_storage.cairo
                        </span>
                        <span className="rounded-full bg-white/6 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                            ABI
                        </span>
                    </div>

                    <div className="flex-1 space-y-3 px-4 py-5">
                        {editorWidths.map((width, index) => (
                            <div key={width} className="flex items-center gap-3">
                                <span className="w-4 text-[10px] text-neutral-600">{index + 1}</span>
                                <div className="h-2 rounded-full bg-white/7" style={{ width }} />
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-white/8 bg-black/40 px-4 py-4">
                        <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Terminal</div>
                        <div className="space-y-2 text-xs text-neutral-400">
                            <div>[system] Restored draft from local storage.</div>
                            <div>[build] Compilation successful.</div>
                            <div>[declare] Class hash ready for Starknet Sepolia.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExecutionPreview() {
    const steps = [
        { label: "Build artifacts ready", state: "done" },
        { label: "Declare transaction prepared", state: "live" },
        { label: "Sponsored deploy requested", state: "live" },
        { label: "Contract interaction unlocked", state: "queued" },
    ];

    return (
        <div className="mt-8 flex min-h-[300px] flex-col justify-between rounded-[24px] border border-white/8 bg-neutral-950/70 p-5">
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <motion.div
                        key={step.label}
                        initial={{ opacity: 0.7, x: 0 }}
                        whileHover={{ x: 4, opacity: 1 }}
                        className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3"
                    >
                        <div
                            className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                step.state === "done" && "bg-emerald-400",
                                step.state === "live" && "bg-amber-400",
                                step.state === "queued" && "bg-neutral-600",
                            )}
                        />
                        <div className="flex-1 text-sm text-neutral-200">{step.label}</div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm leading-relaxed text-neutral-300">
                StarkZap-backed sponsored execution stays visible, so you know when a step is local,
                signed, or paymaster-assisted.
            </div>
        </div>
    );
}

function AbiPreview() {
    const functions = [
        "set(value: felt252)",
        "get() -> felt252",
        "owner() -> ContractAddress",
        "transfer(new_owner: ContractAddress)",
    ];

    return (
        <div className="mt-8 min-h-[260px] rounded-[24px] border border-white/8 bg-neutral-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Contract address</div>
                    <div className="mt-2 font-mono text-sm text-neutral-200">0x04de...b06905</div>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                    ABI loaded
                </div>
            </div>

            <div className="mt-4 grid gap-2">
                {functions.map((item) => (
                    <div
                        key={item}
                        className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3 font-mono text-xs text-neutral-300"
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

function GeneratePreview() {
    const files = [
        { name: "page.tsx", tag: "entry" },
        { name: "useContract.ts", tag: "hook" },
        { name: "abi.ts", tag: "types" },
        { name: "provider.tsx", tag: "wallet" },
    ];

    return (
        <div className="mt-8 min-h-[260px] rounded-[24px] border border-white/8 bg-neutral-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Generated project</div>
                    <div className="mt-2 font-mono text-sm text-neutral-200">my-contract-app/</div>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-emerald-300">
                    Next.js ready
                </div>
            </div>

            <div className="mt-4 grid gap-2">
                {files.map((file) => (
                    <div
                        key={file.name}
                        className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3"
                    >
                        <span className="font-mono text-xs text-neutral-300">{file.name}</span>
                        <span className="rounded-full border border-white/8 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                            {file.tag}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-700/40 bg-white/[0.015] px-4 py-3 text-xs text-neutral-500">
                <span className="text-neutral-400">$ </span>npx create-next-app --example . my-contract-app
            </div>
        </div>
    );
}
