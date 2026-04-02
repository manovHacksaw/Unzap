"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle, Play, Info } from "lucide-react";
import { clsx } from "clsx";

export type StepStatus = "pending" | "active" | "done" | "error";

export interface TraceStep {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
  timestamp?: number;
}

interface ExecutionTraceProps {
  steps: TraceStep[];
  error?: string | null;
}

export function ExecutionTrace({ steps, error }: ExecutionTraceProps) {
  const activeStepIndex = steps.findIndex(s => s.status === "active");
  const hasStarted = steps.some(s => s.status !== "pending");

  return (
    <div className="flex flex-col h-full bg-[#030303]/50 border border-neutral-900 rounded-xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
      <div className="px-5 py-4 border-b border-neutral-900 flex items-center justify-between bg-[#080808]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-500">
            <Play size={14} fill="currentColor" className="opacity-80" />
          </div>
          <span className="text-[11px] font-mono font-semibold tracking-wider text-neutral-300 uppercase">Execution Trace</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx(
            "w-2 h-2 rounded-full",
            activeStepIndex !== -1 ? "bg-amber-500 animate-pulse" : hasStarted ? "bg-emerald-500" : "bg-neutral-800"
          )} />
          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-tighter">
            {activeStepIndex !== -1 ? "Processing..." : hasStarted ? "Completed" : "Idle"}
          </span>
        </div>
      </div>

      <div className="p-6 relative overflow-y-auto flex-1">
        {/* Connection lines background */}
        <div className="absolute left-[33px] top-8 bottom-8 w-px bg-neutral-900" />
        
        <div className="space-y-6 relative">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const statusColors: Record<StepStatus, string> = {
              pending: "text-neutral-700 border-neutral-800",
              active: "text-amber-500 border-amber-500/30 bg-amber-500/5",
              done: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
              error: "text-red-500 border-red-500/30 bg-red-500/5",
            };

            const IconStatus = {
              pending: <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />,
              active: <Loader2 size={12} className="animate-spin" />,
              done: <Check size={12} strokeWidth={3} />,
              error: <AlertCircle size={12} />,
            }[step.status];

            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 group"
              >
                {/* Visual indicator */}
                <div className="relative flex-shrink-0 flex items-center justify-center h-4 pt-1">
                  <div className={clsx(
                    "z-10 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    step.status === "pending" ? "bg-[#030303] border-neutral-800" : 
                    step.status === "active" ? "bg-amber-500 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] text-black" :
                    step.status === "done" ? "bg-emerald-500 border-emerald-500 text-black" :
                    "bg-red-500 border-red-500 text-black"
                  )}>
                    {IconStatus}
                  </div>
                </div>

                {/* Text content */}
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-xs font-medium tracking-tight transition-colors duration-300",
                      step.status === "pending" ? "text-neutral-600" : "text-neutral-200"
                    )}>
                      {step.label}
                    </span>
                    {step.status === "active" && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror" }}
                        className="text-[9px] font-mono text-amber-500/60"
                      >
                        ANALYZING...
                      </motion.span>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {step.detail && step.status !== "pending" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className={clsx(
                          "text-[10px] mt-1 font-mono break-all line-clamp-1 group-hover:line-clamp-none transition-all",
                          step.status === "error" ? "text-red-400" : "text-neutral-500"
                        )}>
                          {step.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="p-4 bg-red-500/10 border-t border-red-500/20 text-red-400 flex items-start gap-3 mt-auto"
          >
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1">Execution halted</p>
              <p className="text-[10px] font-mono leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasStarted && !error && (
        <div className="mt-auto p-4 border-t border-neutral-900 bg-[#050505] flex items-center gap-3">
          <div className="p-1.5 rounded bg-neutral-900 text-neutral-600">
            <Info size={12} />
          </div>
          <p className="text-[10px] text-neutral-600 leading-tight">
            Trigger a scenario to see the execution trace across the SDK.
          </p>
        </div>
      )}
    </div>
  );
}
