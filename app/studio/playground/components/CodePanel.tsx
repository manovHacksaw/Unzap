"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, Info, Code as CodeIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { clsx } from "clsx";

export interface CodeAnnotation {
  lineNumber: number;
  title: string;
  description: string;
}

interface CodePanelProps {
  code: string;
  annotations: CodeAnnotation[];
  activeLine?: number;
  title?: string;
}

export function CodePanel({ code, annotations, activeLine, title = "SDK Snippet" }: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [hoveredAnnotationLine, setHoveredAnnotationLine] = useState<number | null>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = useMemo(() => code.split("\n"), [code]);

  return (
    <div className="flex flex-col h-full bg-[#030303] border border-neutral-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between bg-[#080808]">
        <div className="flex items-center gap-2">
          <CodeIcon size={14} className="text-amber-500" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">{title}</span>
        </div>
        <button 
          onClick={copyCode}
          className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-white"
          title="Copy to clipboard"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers & Gutter */}
        <div className="w-12 flex-shrink-0 bg-[#050505] border-r border-neutral-900 py-4 font-mono text-[11px] text-neutral-700 text-right pr-3 select-none">
          {lines.map((_, i) => (
            <div 
              key={i} 
              className={clsx(
                "h-5 leading-5",
                activeLine === i + 1 && "text-amber-500 font-bold"
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto bg-[#030303] py-4 relative group">
          <pre className="font-mono text-[11px] leading-5 text-neutral-300 pr-5 min-w-full">
            {lines.map((line, i) => {
              const lineNumber = i + 1;
              const isActive = activeLine === lineNumber;
              const annotation = annotations.find(a => a.lineNumber === lineNumber);

              return (
                <div 
                  key={i} 
                  className={clsx(
                    "relative px-4 transition-colors",
                    isActive ? "bg-amber-500/10 border-l-2 border-amber-500" : "border-l-2 border-transparent",
                    annotation && "hover:bg-neutral-900/50 cursor-help"
                  )}
                  onMouseEnter={() => annotation && setHoveredAnnotationLine(lineNumber)}
                  onMouseLeave={() => setHoveredAnnotationLine(null)}
                >
                  <span className="whitespace-pre">{line || " "}</span>
                  
                  {/* Annotation Trigger (Dot) */}
                  {annotation && !isActive && (
                    <div className="absolute right-2 top-1.5 w-1.5 h-1.5 rounded-full bg-neutral-700 animate-pulse" />
                  )}
                  
                  {/* Tooltip for Annotation */}
                  <AnimatePresence>
                    {hoveredAnnotationLine === lineNumber && annotation && (
                      <motion.div
                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        className="absolute left-full ml-4 top-0 z-50 w-64 p-4 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl pointer-events-none"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-500">
                            <Info size={12} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-neutral-200 mb-1 leading-tight">{annotation.title}</p>
                            <p className="text-[10px] text-neutral-500 leading-relaxed font-sans">{annotation.description}</p>
                          </div>
                        </div>
                        {/* Tooltip Arrow alternative */}
                        <div className="absolute top-2 -left-1.5 w-3 h-3 bg-neutral-900 border-l border-b border-neutral-800 rotate-45" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 border-t border-neutral-900 bg-[#050505] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-mono text-neutral-500">TypeScript</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] font-mono text-neutral-500">Starknet</span>
          </div>
        </div>
        
        <a 
          href="https://github.com/manovHacksaw/starkzap" 
          target="_blank" 
          role="link"
          className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          <ExternalLink size={10} />
          <span>Full SDK Docs</span>
        </a>
      </div>
    </div>
  );
}
