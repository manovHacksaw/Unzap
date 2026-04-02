"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  ShieldCheck, 
  Zap, 
  Server, 
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle
} from "lucide-react";
import { clsx } from "clsx";

export type PipelineStatus = "pending" | "active" | "done" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  status: PipelineStatus;
  icon: any;
}

interface VisualPipelineProps {
  steps: PipelineStep[];
  className?: string;
}

export function VisualPipeline({ steps, className }: VisualPipelineProps) {
  return (
    <div className={clsx("w-full bg-[#030303] border border-neutral-900 rounded-3xl p-8 relative overflow-hidden", className)}>
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-24 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.status === "active";
          const isDone = step.status === "done";
          const isError = step.status === "error";
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              {/* Connector between steps */}
              {index !== 0 && (
                <div className="flex-1 h-px bg-neutral-900 mx-4 relative overflow-hidden">
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: isDone ? "0%" : isActive ? "0%" : "-100%" }}
                    transition={{ duration: 1 }}
                    className={clsx(
                      "absolute inset-0 transition-colors",
                      isDone ? "bg-emerald-500/50" : isActive ? "bg-amber-500/50 animate-pulse" : "bg-neutral-800"
                    )}
                  />
                  {isActive && (
                    <motion.div 
                      animate={{ x: ["0%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 h-full w-12 bg-gradient-to-r from-transparent via-amber-500 to-transparent"
                    />
                  )}
                </div>
              )}

              {/* Step Node */}
              <div className="flex flex-col items-center gap-4 group">
                <div className={clsx(
                  "w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 relative",
                  isDone ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]" :
                  isActive ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse" :
                  isError ? "bg-red-500 border-red-500 text-white" :
                  "bg-[#050505] border-neutral-800 text-neutral-600 group-hover:border-neutral-700"
                )}>
                   <StepIcon size={24} />
                   
                   {/* Status Indicator Badge */}
                   <div className="absolute -top-2 -right-2">
                     <AnimatePresence mode="wait">
                       {isDone && (
                         <motion.div 
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           className="bg-emerald-500 text-black rounded-full p-0.5 border-2 border-black"
                         >
                           <CheckCircle2 size={12} strokeWidth={3} />
                         </motion.div>
                       )}
                       {isActive && (
                         <motion.div 
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           className="bg-amber-500 text-black rounded-full p-0.5 border-2 border-black"
                         >
                           <Loader2 size={12} strokeWidth={3} className="animate-spin" />
                         </motion.div>
                       )}
                        {isError && (
                         <motion.div 
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           className="bg-red-500 text-white rounded-full p-0.5 border-2 border-black"
                         >
                           <AlertCircle size={12} strokeWidth={3} />
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                </div>
                
                <div className="text-center min-w-[80px]">
                  <p className={clsx(
                     "text-[10px] font-bold uppercase tracking-widest transition-colors mb-0.5",
                     isActive || isDone ? "text-white" : "text-neutral-600"
                  )}>
                    {step.label}
                  </p>
                  <p className={clsx(
                    "text-[8px] font-mono leading-none transition-colors",
                    isDone ? "text-emerald-500" : isActive ? "text-amber-500" : isError ? "text-red-500" : "text-neutral-700"
                  )}>
                    {isDone ? "VERIFIED" : isActive ? "PROCESSING" : isError ? "FAILED" : "PENDING"}
                  </p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
