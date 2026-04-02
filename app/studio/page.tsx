"use client";

import { motion } from "framer-motion";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import {
  Zap,
  Play,
  Eye,
  FlaskConical,
  Bot,
  Terminal,
  BookOpen,
} from "lucide-react";
import { StudioBentoGrid, type BentoItem } from "@/app/components/StudioBentoGrid";
import HeroSphere from "@/app/components/HeroSphere";

const features: BentoItem[] = [
  {
    title: "Playground",
    description: "Live execution environment for Starknet. Test and experiment with smart contracts in real-time without any setup.",
    href: "/studio/playground",
    icon: Play,
    featured: true,
    className: "md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[400px]",
  },
  {
    title: "Contract Lab",
    description: "The ultimate command center for Cairo. Write, compile, and deploy contracts with an integrated file system.",
    href: "/studio/contract-lab",
    icon: FlaskConical,
    featured: true,
    className: "min-h-[250px]",
  },
  {
    title: "Guided Mode",
    description: "Step-by-step interactive flows to learn Starknet concepts from basics to advanced topics.",
    href: "/studio/guided",
    icon: Zap,
    className: "min-h-[250px]",
  },
  {
    title: "AI Chat",
    description: "Your personalized assistant for Starknet and Cairo. Get instant answers and code suggestions.",
    href: "/studio/ai",
    icon: Bot,
    className: "min-h-[250px]",
  },
  {
    title: "Visualizer",
    description: "See the unseen. Break down transaction lifecycles and understand complex state changes visually.",
    href: "/studio/visualizer",
    icon: Eye,
    className: "min-h-[250px]",
  },
];

export default function StudioDashboard() {
  const { network } = useNetwork();
  const netConfig = getNetworkConfig(network);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-amber-500/30 overflow-hidden">
      {/* Background Sphere Effect */}
      <div className="absolute top-0 right-0 w-[60%] h-[100%] opacity-40 pointer-events-none translate-x-[20%] -translate-y-[10%]">
        <HeroSphere />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-16 md:py-24 relative z-10 space-y-20">
        {/* Header Section */}
        <section className="space-y-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-amber-500 uppercase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse" />
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
              <span className="text-amber-400">Cairo Studio.</span>
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
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]" />
              </div>
            </div>
            <div className="w-px h-8 bg-neutral-800" />
            <div className="flex items-center gap-4">
              <button className="px-5 py-2.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-400 hover:text-white hover:border-neutral-700 transition-all uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Dev API
              </button>
              <button className="px-5 py-2.5 rounded-full bg-amber-500 text-[10px] font-bold text-black hover:bg-amber-400 transition-all uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                Docs
              </button>
            </div>
          </motion.div>
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
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
    </div>
  );
}
