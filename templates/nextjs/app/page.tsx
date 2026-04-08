"use client";

import { useState, useCallback } from "react";
import { useStarkzap } from "@/hooks/use{{PASCAL_NAME}}";
import { ContractUI } from "@/components/ContractUI";
import { LogsPanel, type LogEntry } from "@/components/LogsPanel";

// ── TopBar ────────────────────────────────────────────────────────────────────
// IDE-style header. Wallet connection lives here, not in ContractUI.
// ContractUI only reads wallet state — it never initiates connection.

function TopBar() {
  const { address, connectWallet } = useStarkzap();

  return (
    <div
      style={{
        height: "36px",
        borderBottom: "1px solid #1e1e1e",
        backgroundColor: "#0d0d0d",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "12px",
        flexShrink: 0,
      }}
    >
      {/* Left: contract identity */}
      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "#d4d4d8", fontWeight: 500 }}>
        {{CONTRACT_NAME}}
      </span>

      <span style={{ color: "#2a2a2a" }}>·</span>

      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#52525b" }}>
        {{NETWORK}}
      </span>

      <span style={{ color: "#2a2a2a" }}>·</span>

      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#52525b" }}>
        {{SHORT_ADDRESS}}
      </span>

      <span style={{ color: "#2a2a2a" }}>·</span>

      {/* Live status indicator */}
      <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#4ade80",
            boxShadow: "0 0 6px rgba(74,222,128,0.5)",
          }}
        />
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#4ade8066", letterSpacing: "0.05em" }}>
          live
        </span>
      </span>

      {/* Right: wallet */}
      <div style={{ marginLeft: "auto" }}>
        {address ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#4ade80" }} />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#71717a" }}>
              {address.slice(0, 10)}&hellip;{address.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              color: "#f59e0b",
              background: "none",
              border: "1px solid #292215",
              borderRadius: "4px",
              padding: "3px 10px",
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget;
              btn.style.borderColor = "#78450c";
              btn.style.color = "#fbbf24";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.borderColor = "#292215";
              btn.style.color = "#f59e0b";
            }}
          >
            connect wallet
          </button>
        )}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback(
    (entry: Omit<LogEntry, "id" | "timestamp">) => {
      setLogs((prev) => [
        ...prev.slice(-199),
        { ...entry, id: Math.random().toString(36).slice(2), timestamp: Date.now() },
      ]);
    },
    []
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#0a0a0a", overflow: "hidden" }}>
      <TopBar />

      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px" }}>
          <ContractUI onLog={addLog} />
        </div>
      </main>

      <LogsPanel logs={logs} onClear={clearLogs} />
    </div>
  );
}
