"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import {
  Zap,
  Play,
  Eye,
  FlaskConical,
  Bot,
  ArrowRight,
  Code,
  Layers,
  Sparkles,
  Terminal,
} from "lucide-react";

const features = [
  {
    title: "Playground",
    desc: "Live execution environment for Starknet. Write, deploy, and interact with Cairo contracts instantly.",
    href: "/studio/playground",
    icon: Play,
    color: "amber",
    tag: "LIVE",
  },
  {
    title: "Guided Mode",
    desc: "Step-by-step interactive flows to learn Starknet development. Master concepts through hands-on exercises.",
    href: "/studio/guided",
    icon: Zap,
    color: "amber",
    tag: "LEARN",
  },
  {
    title: "Visualizer",
    desc: "Demystify complex operations. See transaction lifecycles and state changes broken down visually.",
    href: "/studio/visualizer",
    icon: Eye,
    color: "amber",
    tag: "NEW",
  },
  {
    title: "Contract Lab",
    desc: "A powerful IDE for Cairo. Compile, build, and test your contracts with real-time feedback and diagnostic tools.",
    href: "/studio/contract-lab",
    icon: FlaskConical,
    color: "amber",
    tag: "IDE",
  },
  {
    title: "AI Chat",
    desc: "Ask anything about Starknet, Cairo, or Starkzap. Your personalized assistant for all things blockchain development.",
    href: "/studio/ai",
    icon: Bot,
    color: "amber",
    tag: "AI",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function StudioDashboard() {
  const { network } = useNetwork();
  const netConfig = getNetworkConfig(network);
  return (
    <div className="min-h-full bg-[#0a0a0a] p-8 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="space-y-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            UNZAP STUDIO
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
          >
            Dev <span className="text-amber-400">Launchpad.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-neutral-500 text-lg leading-relaxed font-mono"
          >
            Everything you need to master Cairo and Starknet, all in one place. Choose a tool to begin your journey.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href} className="group h-full">
              <motion.div
                variants={item}
                whileHover={{ y: -4 }}
                className="h-full relative overflow-hidden rounded-2xl border border-neutral-900 bg-[#0d0d0d] p-8 transition-all hover:border-amber-500/30 hover:shadow-[0_0_30px_-10px_rgba(251,191,36,0.1)] group-hover:bg-[#0f0f0f]"
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-amber-400/5 blur-[80px] rounded-full group-hover:bg-amber-400/10 transition-colors" />

                <div className="flex flex-col h-full justify-between gap-8 relative z-10">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-all">
                        <feature.icon className="w-6 h-6 text-neutral-600 group-hover:text-amber-400 transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono text-neutral-700 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 group-hover:text-amber-500 group-hover:border-amber-500/20">
                        {feature.tag}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-neutral-500 leading-relaxed font-mono">
                        {feature.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 group-hover:text-white transition-colors uppercase tracking-widest mt-auto">
                    Launch Module
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}

          {/* Coming Soon Card */}
          <motion.div
            variants={item}
            className="relative overflow-hidden rounded-2xl border border-neutral-900 bg-black/40 p-8 flex flex-col items-center justify-center text-center opacity-60 border-dashed"
          >
            <div className="w-12 h-12 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-neutral-700" />
            </div>
            <h3 className="text-lg font-bold text-neutral-500 mb-2 font-mono">More Modules</h3>
            <p className="text-xs text-neutral-700 font-mono italic">
              New features are currently in development.
            </p>
          </motion.div>
        </motion.div>

        {/* Quick Stats/Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-12 border-t border-neutral-900 flex flex-col sm:flex-row gap-8 sm:items-center justify-between"
        >
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-neutral-700 uppercase">Network</span>
              <span className="text-xs text-neutral-400 font-mono">{netConfig.label}</span>
            </div>
            <div className="w-[1px] h-8 bg-neutral-900 hidden sm:block" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-neutral-700 uppercase">Status</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-xs text-neutral-400 font-mono">Operational</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-wider">
               <Terminal className="w-3 h-3" />
               Developer API
             </button>
             <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[10px] font-bold text-black hover:bg-amber-400 transition-colors uppercase tracking-wider">
               Documentation
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
