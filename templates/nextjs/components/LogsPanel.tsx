"use client";

import { useEffect, useRef } from "react";

export type LogType = "call" | "result" | "tx" | "error" | "info";

export interface LogEntry {
  id: string;
  type: LogType;
  text: string;
  timestamp: number;
}

const PREFIX: Record<LogType, string> = {
  call:   ">",
  result: "←",
  tx:     "⚡",
  error:  "✗",
  info:   "·",
};

const COLOR: Record<LogType, string> = {
  call:   "#71717a", // zinc-500
  result: "#d4d4d8", // zinc-300
  tx:     "#f59e0b", // amber-500
  error:  "#f87171", // red-400
  info:   "#3f3f46", // zinc-700
};

function timestamp(ms: number): string {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

interface LogsPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogsPanel({ logs, onClear }: LogsPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div
      style={{
        borderTop: "1px solid #1e1e1e",
        backgroundColor: "#080808",
        height: "160px",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 16px",
          borderBottom: "1px solid #161616",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#3f3f46",
          }}
        >
          output
        </span>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "10px",
              color: "#3f3f46",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.color = "#71717a")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.color = "#3f3f46")
            }
          >
            clear
          </button>
        )}
      </div>

      {/* Log entries */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "6px 16px",
        }}
      >
        {logs.length === 0 ? (
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              color: "#2d2d2d",
              margin: 0,
            }}
          >
            No activity yet.
          </p>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                marginBottom: "2px",
                fontFamily: "ui-monospace, monospace",
                fontSize: "11px",
                lineHeight: "1.6",
              }}
            >
              <span style={{ color: COLOR[entry.type], flexShrink: 0, width: "12px" }}>
                {PREFIX[entry.type]}
              </span>
              <span style={{ color: COLOR[entry.type], flex: 1, wordBreak: "break-all" }}>
                {entry.text}
              </span>
              <span style={{ color: "#2d2d2d", flexShrink: 0, fontSize: "10px" }}>
                {timestamp(entry.timestamp)}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
