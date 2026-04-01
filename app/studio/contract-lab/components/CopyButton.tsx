"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-neutral-400 flex items-center gap-1.5"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {label && <span className="text-[9px] uppercase font-mono">{copied ? "Copied" : label}</span>}
    </button>
  );
};
