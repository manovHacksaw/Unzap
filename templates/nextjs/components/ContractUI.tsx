"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
{{HOOK_IMPORTS}}

// ── Context for child components to easily log instead of prop-drilling
const LogContext = createContext<(entry: { type: any; text: string }) => void>(() => {});
function useLog() { return useContext(LogContext); }

// ── Shared styles
const rowStyle = { borderBottom: "1px solid #1e1e1e", padding: "16px 0" };
const fnNameStyle = { fontFamily: "ui-monospace, monospace", fontSize: "14px", fontWeight: 600, color: "#d4d4d8" };
const readBadgeStyle = { backgroundColor: "#1e1e1e", color: "#a1a1aa", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const writeBadgeStyle = { backgroundColor: "#451a03", color: "#fcd34d", border: "1px solid #78350f", fontSize: "10px", padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const inputStyle = { backgroundColor: "#000", border: "1px solid #27272a", borderRadius: "6px", padding: "6px 10px", color: "#d4d4d8", fontSize: "12px", fontFamily: "ui-monospace, monospace", outline: "none", width: "100%" };
const ghostBtnStyle = { backgroundColor: "#18181b", color: "#a1a1aa", border: "1px solid #27272a", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" };
const execBtnStyle = { backgroundColor: "#f59e0b", color: "#000", border: "none", borderRadius: "6px", padding: "7px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", transition: "all 0.15s" };
const refreshBtnStyle = { ...ghostBtnStyle, padding: "2px 8px", fontSize: "14px", border: "none", backgroundColor: "transparent" };

{{READ_COMPONENTS}}

{{WRITE_COMPONENTS}}

export function ContractUI({ onLog }: { onLog: (e: any) => void }) {
  return (
    <LogContext.Provider value={onLog}>
      <style>{`
        .subhed { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #52525b; margin-bottom: 8px; margin-top: 32px; }
        .subhed:first-child { margin-top: 0; }
        input:focus { border-color: #52525b !important; }
        .exec-wrap:hover .exec-tooltip { opacity: 1; }
        .exec-tooltip { position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: #e5e5e5; color: #000; font-size: 10px; padding: 4px 8px; border-radius: 4px; pointer-events: none; opacity: 0; transition: opacity 0.15s; white-space: nowrap; font-weight: 600; text-transform: uppercase; }
      `}</style>
      <div>
{{HAS_READS}}
{{RENDER_READS}}
{{HAS_WRITES}}
{{RENDER_WRITES}}
      </div>
    </LogContext.Provider>
  );
}
