"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Braces, Terminal } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface RawResultInspectorProps {
  data: any;
  isLoading?: boolean;
}

export function RawResultInspector({ data, isLoading }: RawResultInspectorProps) {
  const [copied, setCopied] = useState(false);

  const copyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 bg-black/40 border border-neutral-900 rounded-xl">
        <Terminal size={24} className="mb-2 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] animate-pulse">Awaiting Payload...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-700 bg-black/20 border border-neutral-900/50 rounded-xl border-dashed">
        <Braces size={20} className="mb-2 opacity-20" />
        <span className="text-[10px] font-mono uppercase tracking-widest opacity-30 italic">No output yet</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 border border-neutral-900 rounded-xl overflow-hidden group">
      <div className="px-4 py-2 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-emerald-500" />
          <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase tracking-widest">JSON Response</span>
        </div>
        <button 
          onClick={copyResult}
          className="p-1 px-2 rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
        >
          {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-neutral-600" />}
          <span className="text-[9px] font-mono text-neutral-600">{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed custom-scrollbar">
        <motion.pre 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-emerald-500/80 whitespace-pre-wrap selection:bg-emerald-500/20"
        >
          {JSON.stringify(data, null, 2)}
        </motion.pre>
      </div>
    </div>
  );
}
