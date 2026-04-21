"use client";

import { motion } from "framer-motion";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import {
  Terminal,
  BookOpen,
} from "lucide-react";
import { StudioBentoGrid, type BentoItem } from "@/app/components/StudioBentoGrid";
import HeroSphere from "@/app/components/HeroSphere";

const features: BentoItem[] = [
  {
    title: "Contract Lab",
    description: "The ultimate command center for Cairo. Write, compile, and deploy contracts with an integrated file system.",
    href: "/",
    image: "/previews/contract-lab-interact.png",
    className: "md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[400px]",
  },
  {
    title: "DeFi Hub",
    description: "The Starknet liquidity engine. Swap tokens, stake STRK, and bridge Bitcoin natively via StarkZap V2.",
    href: "/studio/defi",
    className: "min-h-[250px]",
    status: "Live",
  },
  {
    title: "Guided Mode",
    description: "Step-by-step interactive flows to learn Starknet concepts from basics to advanced topics.",
    href: "/studio/guided",
    className: "min-h-[250px]",
    comingSoon: true,
  },
  {
    title: "Hook Generator",
    description: "Paste any deployed contract ABI and get typed React hooks powered by Starkzap — ready to drop into your dapp.",
    href: "/studio/hook-gen",
    className: "min-h-[250px]",
    status: "Live",
  },
  {
    title: "Visualizer",
    description: "See the unseen. Break down transaction lifecycles and understand complex state changes visually.",
    href: "/studio/visualizer",
    className: "min-h-[250px]",
    comingSoon: true,
  },
];

export default function StudioDashboard() {
  const { network } = useNetwork();
  const netConfig = getNetworkConfig(network);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-white/20 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-16 md:py-24 relative z-10 space-y-20">
        {/* Header Section */}
        <section className="flex flex-col lg:flex-row lg:items-start justify-between gap-12 pt-8">
          <div className="space-y-8 max-w-4xl lg:pt-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-neutral-400 uppercase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              Launchpad Studio
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.95]"
              >
                The Next Gen <br />
                <span className="text-white">Cairo Studio.</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-neutral-500 text-lg sm:text-xl font-mono leading-relaxed max-w-xl"
              >
                From learning basics to production deployments, Unzap is your mission control for the Starknet ecosystem.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono text-neutral-600 uppercase font-bold tracking-wider">Network</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-300 font-mono">{netConfig.label}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="w-px h-8 bg-neutral-800" />
              <div className="flex items-center gap-4">
                <button className="px-5 py-2.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-400 hover:text-white hover:border-neutral-600 transition-all uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  Dev API
                </button>
                <button className="px-5 py-2.5 rounded-full bg-white text-[10px] font-bold text-black hover:bg-neutral-200 transition-all uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-3 h-3" />
                  Docs
                </button>
              </div>
            </motion.div>
          </div>

          {/* Particle Logo - positioned in the "empty space" beside the text */}
          <div className="hidden lg:block relative w-[450px] h-[450px] xl:w-[600px] xl:h-[600px] shrink-0 opacity-60 -translate-x-16 translate-y-20 pointer-events-none">
            <HeroSphere />
          </div>
        </section>

        {/* Feature Grid */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <StudioBentoGrid items={features} />
          </motion.div>
        </section>

        {/* Status / Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="pt-16 border-t border-neutral-900/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 text-neutral-600 font-mono text-[10px]">
            <span className="uppercase tracking-widest">System Status:</span>
            <div className="flex items-center gap-2 text-neutral-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              Stable Execution Environment
            </div>
          </div>
          <div className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest">
            Unzap v1.2.0 • Build your legacy
          </div>
        </motion.div>
      </div>

      {/* Glow Effects */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
    </div>
  );
}
