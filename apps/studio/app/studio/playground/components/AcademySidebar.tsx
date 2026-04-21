"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Settings, 
  Zap, 
  ShieldCheck, 
  Code2, 
  ChevronRight, 
  ChevronDown,
  LayoutDashboard,
  CheckCircle2,
  Circle,
  HelpCircle,
  Menu,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export type ModuleId = "setup" | "foundation" | "sponsored" | "signing" | "advanced";

interface SubModule {
  id: string;
  label: string;
  isCompleted?: boolean;
}

interface Module {
  id: ModuleId;
  label: string;
  icon: any;
  subModules: SubModule[];
}

const ACADEMY_MODULES: Module[] = [
  {
    id: "setup",
    label: "0. Environment Setup",
    icon: Settings,
    subModules: [
      { id: "node", label: "Node.js Environment" },
      { id: "starknetjs", label: "SDK Installation" },
      { id: "scarb", label: "Scarb Toolchain" }
    ]
  },
  {
    id: "foundation",
    label: "1. Core Foundation",
    icon: BookOpen,
    subModules: [
      { id: "connect", label: "Wallet Onboarding" },
      { id: "identity", label: "Signer Strategy" }
    ]
  },
  {
    id: "sponsored",
    label: "2. Gasless Ecosystem",
    icon: Zap,
    subModules: [
      { id: "paymaster", label: "Sponsored Pay" },
      { id: "multi-call", label: "Atomic Multi-call" }
    ]
  },
  {
    id: "signing",
    label: "3. Privacy & Security",
    icon: ShieldCheck,
    subModules: [
      { id: "sign", label: "Typed Message Signing" },
      { id: "eip712", label: "Starknet Domain Spec" }
    ]
  },
  {
    id: "advanced",
    label: "4. Advanced Contract Lab",
    icon: Code2,
    subModules: [
      { id: "execute", label: "Universal Invoke" },
      { id: "deploy", label: "UDC Deployment" }
    ]
  }
];

interface AcademySidebarProps {
  activeModuleId: ModuleId;
  activeSubModuleId: string;
  onSelect: (moduleId: ModuleId, subModuleId: string) => void;
  isCollapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function AcademySidebar({ 
  activeModuleId, 
  activeSubModuleId, 
  onSelect, 
  isCollapsed, 
  setCollapsed 
}: AcademySidebarProps) {
  const [expandedModules, setExpandedModules] = useState<ModuleId[]>([activeModuleId]);

  const toggleModule = (id: ModuleId) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? 72 : 280 }}
      className="h-full bg-[#050505] border-r border-neutral-900 flex flex-col relative transition-all duration-300 ease-in-out z-50 shadow-2xl"
    >
      {/* Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-900 bg-[#080808]">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black">
              <Terminal size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold font-mono tracking-tighter text-white">STARKNET</span>
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">Developer Academy</span>
            </div>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!isCollapsed)}
          className={clsx(
            "p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500",
            isCollapsed && "mx-auto"
          )}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Module Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {ACADEMY_MODULES.map((module) => {
          const isExpanded = expandedModules.includes(module.id);
          const isActive = activeModuleId === module.id;
          const Icon = module.icon;

          return (
            <div key={module.id} className="space-y-1">
              <button
                onClick={() => isCollapsed ? (setCollapsed(false), toggleModule(module.id)) : toggleModule(module.id)}
                className={clsx(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                  isActive ? "text-amber-500" : "text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200"
                )}
              >
                <div className={clsx(
                  "p-2 rounded-lg transition-colors",
                  isActive ? "bg-amber-500/10 text-amber-500" : "bg-neutral-900 text-neutral-600 group-hover:text-neutral-400"
                )}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-bold flex-1 text-left">{module.label}</span>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      className="text-neutral-600"
                    >
                      <ChevronDown size={14} />
                    </motion.div>
                  </>
                )}
              </button>

              <AnimatePresence>
                {!isCollapsed && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-11 space-y-1"
                  >
                    {module.subModules.map((subModule) => {
                      const isSubActive = activeSubModuleId === subModule.id;
                      return (
                        <button
                          key={subModule.id}
                          onClick={() => onSelect(module.id, subModule.id)}
                          className={clsx(
                            "w-full flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all group",
                            isSubActive 
                              ? "text-white bg-amber-500/5 border-l-2 border-amber-500" 
                              : "text-neutral-600 hover:text-neutral-400 border-l-2 border-transparent"
                          )}
                        >
                          {subModule.isCompleted ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <Circle size={10} className={clsx(isSubActive ? "text-amber-500" : "text-neutral-800 group-hover:text-neutral-700")} fill={isSubActive ? "currentColor" : "none"} />
                          )}
                          <span>{subModule.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className={clsx(
        "p-4 border-t border-neutral-900 bg-[#030303]/50",
        isCollapsed && "flex justify-center"
      )}>
        {!isCollapsed ? (
          <div className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                  80%
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white font-bold tracking-tight">Ecosystem Mastery</span>
                  <span className="text-[9px] text-neutral-500 uppercase tracking-widest">Progress</span>
                </div>
             </div>
             <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full w-[80%] bg-emerald-500" />
             </div>
          </div>
        ) : (
          <div className="p-2 text-neutral-600">
            <HelpCircle size={18} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
