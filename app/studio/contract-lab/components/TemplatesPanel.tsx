"use client";

import { motion } from "framer-motion";
import { FileText, Zap, Coins, Image as ImageIcon, ChevronRight, GraduationCap } from "lucide-react";
import { clsx } from "clsx";
import { CONTRACT_TEMPLATES, type ContractTemplate } from "../templates";
import { Badge } from "@/components/ui/badge";

interface TemplatesPanelProps {
  onLoadTemplate: (template: ContractTemplate) => void;
  theme: "amber" | "emerald" | "azure" | "mono";
}

const iconMap = {
  FileText: FileText,
  Zap: Zap,
  Coins: Coins,
  ImageIcon: ImageIcon,
};

export function TemplatesPanel({ onLoadTemplate, theme }: TemplatesPanelProps) {
  const accentColor = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    azure: "text-sky-500",
    mono: "text-white"
  }[theme];

  const accentBg = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    azure: "bg-sky-500",
    mono: "bg-white"
  }[theme];

  const difficultyColors = {
    Easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Pro: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full no-scrollbar">
      <div className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          Starknet Templates
        </div>
        <div className="text-[11px] text-neutral-600 leading-relaxed">
          Select a pre-built contract to jumpstart your development.
        </div>
      </div>

      <div className="grid gap-3">
        {CONTRACT_TEMPLATES.map((template, idx) => {
          const Icon = iconMap[template.iconName];
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onLoadTemplate(template)}
              className="group relative flex flex-col text-left p-4 rounded-xl border border-neutral-800 bg-black/40 hover:bg-white/[0.03] hover:border-neutral-700 transition-all duration-300 overflow-hidden"
            >
              {/* Background Glow */}
              <div className={clsx(
                "absolute -right-4 -top-4 w-20 h-20 opacity-0 group-hover:opacity-10 transition-opacity blur-2xl rounded-full",
                accentBg
              )} />

              <div className="flex items-start justify-between mb-3">
                <div className={clsx(
                  "p-2 rounded-lg bg-neutral-900 group-hover:bg-neutral-800 transition-colors",
                  accentColor
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <Badge className={clsx("text-[9px] px-1.5 py-0 border", difficultyColors[template.difficulty])}>
                  {template.difficulty}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="text-[13px] font-bold text-neutral-200 group-hover:text-white transition-colors">
                  {template.name}
                </div>
                <div className="text-[11px] text-neutral-500 leading-normal line-clamp-2">
                  {template.description}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-600">
                  <span className="opacity-40">file:</span>
                  <span className="group-hover:text-neutral-400 transition-colors">{template.filename}</span>
                </div>
                <div className={clsx(
                  "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0",
                  accentColor
                )}>
                  Load <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-neutral-500" />
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Dev Tip</div>
        </div>
        <div className="text-[10px] text-neutral-600 leading-relaxed italic">
          Load a template and press <span className="text-neutral-500 font-mono">Ctrl+S</span> to compile it instantly on the Starknet devnet.
        </div>
      </div>
    </div>
  );
}
