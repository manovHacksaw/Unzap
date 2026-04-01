import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import type { CompileError } from "../types";

interface DiagnosticCardProps {
  error: CompileError;
  index: number;
  onAiFix: (err: CompileError, idx: number) => void;
  isFixing: string | null;
  suggestion: { index: number; fix: { line: number; newContent: string; description?: string } } | null;
  onApplyFix: (fix: { line: number; newContent: string }) => void;
}

export const DiagnosticCard = ({
  error,
  index,
  onAiFix,
  isFixing,
  suggestion,
  onApplyFix,
}: DiagnosticCardProps) => (
  <div className="rounded border border-red-500/10 bg-red-500/5 p-3 text-red-300 relative group overflow-hidden">
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Line {error.line}</span>
      </div>
      {!suggestion && (
        <button
          onClick={() => onAiFix(error, index)}
          disabled={isFixing !== null}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {isFixing === index.toString() ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {isFixing === index.toString() ? "Fixing..." : "Fix with AI"}
        </button>
      )}
    </div>
    <p className="text-[11px] font-mono leading-relaxed text-neutral-300 mb-2">{error.message}</p>
    {suggestion && (
      <div className="mt-3 space-y-2 border-t border-amber-500/10 pt-3 bg-amber-500/5 -mx-3 -mb-3 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">AI REPAIR SUGGESTION</span>
        </div>
        <div className="rounded bg-black/40 border border-neutral-800 p-2 font-mono text-[11px] overflow-x-auto text-neutral-400">
          <div className="text-red-400/60 line-through opacity-50">{suggestion.fix.line || "..."}</div>
          <div className="text-emerald-400">{suggestion.fix.newContent}</div>
        </div>
        <p className="text-[10px] text-neutral-500 italic leading-relaxed">{suggestion.fix.description}</p>
        {suggestion.fix.newContent && (
          <button
            onClick={() => onApplyFix(suggestion.fix)}
            className="w-full py-1.5 rounded bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all"
          >
            Apply Fix & Recompile
          </button>
        )}
      </div>
    )}
  </div>
);
