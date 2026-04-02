"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Info,
  Server,
  Package,
  Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: any;
  command?: string;
  link?: string;
  linkLabel?: string;
}

const SETUP_STEPS: Step[] = [
  {
    id: "node",
    title: "Node.js v18+",
    description: "Starknet.js requires a modern Node.js environment. We recommend using NVM for version management.",
    icon: Server,
    command: "node --version",
    link: "https://nodejs.org/",
    linkLabel: "Download Node.js"
  },
  {
    id: "starknet",
    title: "Install Starknet.js",
    description: "The core SDK for interacting with the Starknet network. Includes providers, signers, and contract abstractions.",
    icon: Package,
    command: "npm install starknet",
    link: "https://www.starknetjs.com/",
    linkLabel: "SDK Docs"
  },
  {
    id: "scarb",
    title: "Scarb Toolchain",
    description: "The build tool and package manager for Cairo. Essential for compiling contracts and managing dependencies.",
    icon: Cpu,
    command: "scarb --version",
    link: "https://docs.starknet.io/documentation/quick_start/environment_setup/",
    linkLabel: "Installation Guide"
  }
];

export function SetupStepper() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeStep = SETUP_STEPS[activeStepIndex];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const nextStep = () => {
    if (activeStepIndex < SETUP_STEPS.length - 1) {
      setCompletedSteps(prev => [...new Set([...prev, activeStep.id])]);
      setActiveStepIndex(prev => prev + 1);
    }
  };

  const reset = () => {
    setActiveStepIndex(0);
    setCompletedSteps([]);
  };

  return (
    <div className="bg-[#080808] border border-neutral-900 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="flex h-[480px]">
        
        {/* Left: Progression Rail */}
        <div className="w-64 border-r border-neutral-900 bg-[#050505] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-black">
              <Terminal size={12} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">Environment Setup</span>
          </div>

          <div className="flex-1 space-y-6">
            {SETUP_STEPS.map((step, index) => {
              const isActive = index === activeStepIndex;
              const isCompleted = completedSteps.includes(step.id);
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="relative group cursor-pointer" onClick={() => setActiveStepIndex(index)}>
                  {/* Connector Line */}
                  {index !== SETUP_STEPS.length - 1 && (
                    <div className={clsx(
                      "absolute left-[13px] top-8 w-px h-10 transition-colors duration-500",
                      isCompleted ? "bg-emerald-500" : "bg-neutral-800"
                    )} />
                  )}

                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10",
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
                      isActive ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] font-bold" :
                      "bg-[#050505] border-neutral-800 text-neutral-600 group-hover:border-neutral-700"
                    )}>
                      {isCompleted ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px]">{index + 1}</span>}
                    </div>
                    <div className="flex flex-col">
                      <span className={clsx(
                        "text-xs font-bold transition-colors",
                        isActive || isCompleted ? "text-neutral-200" : "text-neutral-600"
                      )}>
                        {step.title}
                      </span>
                      <span className={clsx(
                        "text-[9px] uppercase tracking-widest font-mono",
                        isActive ? "text-amber-500/60" : "text-neutral-700"
                      )}>
                        {isCompleted ? "VERIFIED" : isActive ? "IN PROGRESS" : "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto">
             <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3">
                <div className="p-2 rounded bg-amber-500/10 text-amber-500">
                  <Info size={14} />
                </div>
                <p className="text-[9px] leading-relaxed text-neutral-500">
                  Complete these steps to unlock the interactive Lab modules.
                </p>
             </div>
          </div>
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 p-10 flex flex-col bg-gradient-to-br from-[#080808] to-[#040404] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStepIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                  <activeStep.icon size={24} />
                </div>
                <div>
                   <h2 className="text-2xl font-bold tracking-tight text-white">{activeStep.title}</h2>
                   <p className="text-xs text-neutral-500">{activeStep.description}</p>
                </div>
              </div>

              {activeStep.command && (
                <div className="mt-4 space-y-3">
                   <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Execute Terminal Command</span>
                   <div className="bg-black/80 border border-neutral-800 rounded-xl p-4 flex items-center justify-between group">
                      <code className="text-emerald-500 font-mono text-sm">{activeStep.command}</code>
                      <button 
                        onClick={() => handleCopy(activeStep.command!, activeStepIndex)}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-all text-neutral-500 hover:text-white"
                      >
                        {copiedIndex === activeStepIndex ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                   </div>
                </div>
              )}

              <div className="mt-auto pt-8 border-t border-neutral-900/50 flex items-center justify-between">
                {activeStep.link && (
                  <a 
                    href={activeStep.link} 
                    target="_blank" 
                    className="flex items-center gap-2 text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest"
                  >
                    <span>{activeStep.linkLabel}</span>
                    <ExternalLink size={12} />
                  </a>
                )}

                <div className="flex gap-3">
                  {activeStepIndex === SETUP_STEPS.length - 1 && completedSteps.length === SETUP_STEPS.length - 1 ? (
                    <button 
                      onClick={reset}
                      className="px-6 py-3 rounded-xl border border-neutral-800 text-xs font-bold text-neutral-400 hover:bg-neutral-900 transition-all uppercase tracking-widest"
                    >
                      Restart Prep
                    </button>
                  ) : null}
                  <button 
                    onClick={nextStep}
                    className="px-8 py-3 bg-white hover:bg-neutral-200 text-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>{activeStepIndex === SETUP_STEPS.length - 1 ? "Finish Prep" : "Next Step"}</span>
                    <ChevronRight size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Decorative Background Elements */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
