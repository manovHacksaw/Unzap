"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../lib/utils";

const docSections = [
    {
        id: "intro",
        title: "Introduction",
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="text-xl font-medium text-white mb-2">What is Unzap Contract Lab?</h3>
                    <p className="text-neutral-400 leading-relaxed text-sm">
                        Unzap Contract Lab is a zero-setup, browser-based development studio designed specifically for Starknet. It provides a unified environment where developers can write, compile, deploy, and interact with Cairo smart contracts without installing any local tools. Built on top of the Starkzap SDK, Unzap removes the traditional friction of Starknet development, making it feel as seamless as building for the modern web.
                    </p>
                </div>
                <div>
                    <h3 className="text-xl font-medium text-white mb-2">The Problem It Solves</h3>
                    <ul className="list-disc pl-5 text-neutral-400 space-y-2 text-sm">
                        <li><strong className="text-neutral-200 font-medium">Environment Setup:</strong> No need to install Rust, Cairo, or Scarb.</li>
                        <li><strong className="text-neutral-200 font-medium">Complexity:</strong> Simplifies the Cairo → Sierra → CASM pipeline.</li>
                        <li><strong className="text-neutral-200 font-medium">Gas Friction:</strong> Gasless testnet deployments via AVNU Paymaster.</li>
                        <li><strong className="text-neutral-200 font-medium">Fragmented UI:</strong> Automatically generates an interaction frontend for deployed contracts.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "concepts",
        title: "Core Concepts",
        content: (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.02]">
                        <h4 className="text-white font-medium mb-2">1. Templates</h4>
                        <p className="text-neutral-400 text-sm">Pre-written Cairo contracts like ERC20, Counter, and Voting to skip the boilerplate.</p>
                    </div>
                    <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.02]">
                        <h4 className="text-white font-medium mb-2">2. Cairo Contracts</h4>
                        <p className="text-neutral-400 text-sm">Supports Cairo 1.0 with strong typing, Sierra IR, and CASM machine code.</p>
                    </div>
                    <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.02]">
                        <h4 className="text-white font-medium mb-2">3. Gasless Deployment</h4>
                        <p className="text-neutral-400 text-sm">Uses AVNU Paymaster to sponsor fees. Contracts deployed via Universal Deployer Contract.</p>
                    </div>
                    <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.02]">
                        <h4 className="text-white font-medium mb-2">4. Contract → Frontend</h4>
                        <p className="text-neutral-400 text-sm">Automatic ABI parsing and UI generation for real-time contract interaction.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "usage",
        title: "Usage Guide",
        content: (
            <div className="space-y-6">
                <div className="relative pl-6 border-l border-neutral-800 space-y-8">
                    <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border border-amber-500/50 bg-[#0a0a0a]" />
                        <h4 className="text-white font-medium mb-1">Create Contract</h4>
                        <p className="text-neutral-400 text-sm">Use the Template Selector and the CodeMirror 6 editor. Enjoy real-time diagnostics and auto-saving.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border border-amber-500/50 bg-[#0a0a0a]" />
                        <h4 className="text-white font-medium mb-1">Compile</h4>
                        <p className="text-neutral-400 text-sm">Your code is sent to a Dockerized Rust Sidecar that runs starknet-compile and returns Sierra/CASM artifacts.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border border-amber-500/50 bg-[#0a0a0a]" />
                        <h4 className="text-white font-medium mb-1">Deploy</h4>
                        <p className="text-neutral-400 text-sm">Input constructor parameters and select "Sponsored" to let Unzap handle deployment fees gaslessly.</p>
                    </div>
                    <div className="relative">
                        <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border border-amber-500/50 bg-[#0a0a0a]" />
                        <h4 className="text-white font-medium mb-1">Frontend Generation</h4>
                        <p className="text-neutral-400 text-sm">The Interact panel provides ABI Awareness, Input Validation, and Real-time Logs for every call.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "advanced",
        title: "Architecture & Advanced",
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="text-xl font-medium text-white mb-2">High-Level System Design</h3>
                    <p className="text-neutral-400 leading-relaxed text-sm mb-4">
                        Unzap separates concerns between the Next.js Frontend, the Dockerized Compiler Sidecar, and the Starknet Blockchain.
                    </p>
                    <div className="bg-neutral-950/70 border border-white/8 rounded-[24px] p-5">
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="text-amber-500 text-sm font-mono mt-0.5">01</span>
                                <div>
                                    <h5 className="text-neutral-200 text-sm font-medium">The IDE</h5>
                                    <p className="text-neutral-500 text-xs mt-1">Manages state in localStorage, uses Starknet.js and Starkzap SDK.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-amber-500 text-sm font-mono mt-0.5">02</span>
                                <div>
                                    <h5 className="text-neutral-200 text-sm font-medium">The Sidecar</h5>
                                    <p className="text-neutral-500 text-xs mt-1">Cloud-based Cairo compilation for consistent environments.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-amber-500 text-sm font-mono mt-0.5">03</span>
                                <div>
                                    <h5 className="text-neutral-200 text-sm font-medium">Starknet Layer</h5>
                                    <p className="text-neutral-500 text-xs mt-1">Uses UDC for deployment and AVNU for gasless sponsorship.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        )
    }
];

export function DocumentationSection() {
    const [activeSection, setActiveSection] = useState(docSections[0].id);

    return (
        <section id="documentation" className="relative z-20 mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-24">
            <div className="px-1 mb-12">
                <p
                    className="mx-auto mb-4 text-center text-[11px] uppercase tracking-[0.24em] text-neutral-500"
                    style={{ fontFamily: "monospace" }}
                >
                    Developer Documentation
                </p>
                <h4 className="mx-auto max-w-5xl text-center text-3xl font-medium tracking-tight text-white lg:text-5xl lg:leading-tight">
                    Everything you need to know
                </h4>
            </div>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mt-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                    {docSections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                                "text-left px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium border",
                                activeSection === section.id
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
                            )}
                        >
                            {section.title}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 relative min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {docSections.map(
                            (section) =>
                                activeSection === section.id && (
                                    <motion.div
                                        key={section.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0"
                                    >
                                        <div className="rounded-[28px] border border-neutral-800 bg-[#0a0a0a] p-6 lg:p-10 shadow-2xl">
                                            {section.content}
                                        </div>
                                    </motion.div>
                                )
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
