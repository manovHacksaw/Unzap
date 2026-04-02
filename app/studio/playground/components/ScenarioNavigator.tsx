"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Wallet, 
  MessageSquare, 
  Box, 
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { clsx } from "clsx";

export type ScenarioId = "connect" | "pay" | "sign" | "execute" | "deploy";

interface Scenario {
  id: ScenarioId;
  label: string;
  description: string;
  icon: typeof Zap;
}

const SCENARIOS: Scenario[] = [
  { 
    id: "connect", 
    label: "Onboarding", 
    description: "Strategies for wallet connection",
    icon: Wallet 
  },
  { 
    id: "pay", 
    label: "Gasless Pay", 
    description: "Sponsored STRK/ETH transfers",
    icon: Zap 
  },
  { 
    id: "sign", 
    label: "Message Signing", 
    description: "Typed data signatures (EIP-712)",
    icon: MessageSquare 
  },
  { 
    id: "execute", 
    label: "Contract Call", 
    description: "Generic contract interactions",
    icon: Box 
  },
];

interface ScenarioNavigatorProps {
  activeId: ScenarioId;
  onSelect: (id: ScenarioId) => void;
}

export function ScenarioNavigator({ activeId, onSelect }: ScenarioNavigatorProps) {
  return (
    <div className="flex flex-col h-full border-r border-neutral-900 bg-[#050505] w-64 flex-shrink-0">
      <div className="p-6 border-b border-neutral-900">
        <h2 className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-1">Explore</h2>
        <h1 className="text-white font-bold text-lg tracking-tight">SDK Scenarios</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {SCENARIOS.map((s) => {
          const isActive = activeId === s.id;
          const Icon = s.icon;

          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={clsx(
                "w-full group relative flex flex-col items-start p-3 transition-all duration-200 rounded-lg",
                isActive 
                  ? "bg-amber-500/10 text-white" 
                  : "text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                />
              )}
              
              <div className="flex items-center gap-3 mb-1 w-full">
                <div className={clsx(
                  "p-1.5 rounded-md transition-colors",
                  isActive ? "bg-amber-500/20 text-amber-500" : "bg-neutral-900 text-neutral-600 group-hover:text-neutral-400"
                )}>
                  <Icon size={16} strokeWidth={2} />
                </div>
                <span className="text-sm font-medium">{s.label}</span>
                {isActive && <ArrowRight size={12} className="ml-auto text-amber-500" />}
              </div>
              <p className={clsx(
                "text-[10px] text-left transition-colors pl-8",
                isActive ? "text-neutral-400" : "text-neutral-600 group-hover:text-neutral-500"
              )}>
                {s.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-neutral-900 bg-[#030303]/50">
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 mb-2">
          <span>SDK VERSION</span>
          <span className="text-amber-500/50">v2.0.0</span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-tighter">
          <span>Environment</span>
          <span className="text-neutral-500">Starknet</span>
        </div>
      </div>
    </div>
  );
}
