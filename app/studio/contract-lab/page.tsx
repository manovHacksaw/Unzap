"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Zap,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Loader2,
  Code2,
} from "lucide-react";
import { clsx } from "clsx";

// ── Compiler URL ──────────────────────────────────────────────────────────────

const COMPILER_URL =
  process.env.NEXT_PUBLIC_COMPILER_URL ?? "http://localhost:3001";

// ── Cairo contract templates ──────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "storage",
    label: "Simple Storage",
    desc: "Read/write a felt252 value",
    source: `#[starknet::interface]
trait ISimpleStorage<TContractState> {
    fn set(ref self: TContractState, value: felt252);
    fn get(self: @TContractState) -> felt252;
}

#[starknet::contract]
mod SimpleStorage {
    #[storage]
    struct Storage {
        stored_value: felt252,
    }

    #[abi(embed_v0)]
    impl StorageImpl of super::ISimpleStorage<ContractState> {
        fn set(ref self: ContractState, value: felt252) {
            self.stored_value.write(value);
        }

        fn get(self: @ContractState) -> felt252 {
            self.stored_value.read()
        }
    }
}
`,
  },
  {
    id: "counter",
    label: "Counter",
    desc: "Increment / decrement a u64",
    source: `#[starknet::interface]
trait ICounter<TContractState> {
    fn get(self: @TContractState) -> u64;
    fn increment(ref self: TContractState);
    fn decrement(ref self: TContractState);
}

#[starknet::contract]
mod Counter {
    #[storage]
    struct Storage {
        count: u64,
    }

    #[abi(embed_v0)]
    impl CounterImpl of super::ICounter<ContractState> {
        fn get(self: @ContractState) -> u64 {
            self.count.read()
        }

        fn increment(ref self: ContractState) {
            self.count.write(self.count.read() + 1);
        }

        fn decrement(ref self: ContractState) {
            let current = self.count.read();
            assert(current > 0, 'Counter: underflow');
            self.count.write(current - 1);
        }
    }
}
`,
  },
  {
    id: "voting",
    label: "Voting",
    desc: "One-vote-per-address tally",
    source: `use starknet::ContractAddress;

#[starknet::interface]
trait IVoting<TContractState> {
    fn vote(ref self: TContractState, candidate: felt252);
    fn get_votes(self: @TContractState, candidate: felt252) -> u64;
}

#[starknet::contract]
mod Voting {
    use starknet::get_caller_address;
    use starknet::ContractAddress;
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        votes: Map<felt252, u64>,
        has_voted: Map<ContractAddress, bool>,
    }

    #[abi(embed_v0)]
    impl VotingImpl of super::IVoting<ContractState> {
        fn vote(ref self: ContractState, candidate: felt252) {
            let caller = get_caller_address();
            assert(!self.has_voted.read(caller), 'Already voted');
            self.has_voted.write(caller, true);
            let current = self.votes.read(candidate);
            self.votes.write(candidate, current + 1);
        }

        fn get_votes(self: @ContractState, candidate: felt252) -> u64 {
            self.votes.read(candidate)
        }
    }
}
`,
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompileError {
  message: string;
  line: number;
  col: number;
}

interface CompileSuccess {
  sierra: object;
  casm: object;
  abi: object[];
  logs: string;
}

type CompileState =
  | { status: "idle" }
  | { status: "compiling" }
  | { status: "success"; data: CompileSuccess }
  | { status: "error"; errors: CompileError[]; logs?: string };

type OutputTab = "logs" | "errors" | "abi" | "sierra" | "casm";

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContractLabPage() {
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id);
  const [source, setSource] = useState<string>(TEMPLATES[0].source);
  const [compileState, setCompileState] = useState<CompileState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<OutputTab>("logs");

  const selectTemplate = useCallback((id: string) => {
    const t = TEMPLATES.find((t) => t.id === id);
    if (!t) return;
    setTemplateId(id);
    setSource(t.source);
    setCompileState({ status: "idle" });
  }, []);

  const compile = async () => {
    if (compileState.status === "compiling") return;
    setCompileState({ status: "compiling" });

    try {
      const res = await fetch(`${COMPILER_URL}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });

      const json = await res.json();

      if (!res.ok || json.errors) {
        setCompileState({ status: "error", errors: json.errors ?? [], logs: json.logs });
        setActiveTab("logs");
      } else {
        setCompileState({ status: "success", data: json as CompileSuccess });
        setActiveTab("logs");
      }
    } catch (e) {
      setCompileState({
        status: "error",
        errors: [{ message: e instanceof Error ? e.message : "Network error", line: 0, col: 0 }],
      });
      setActiveTab("errors");
    }
  };

  // ── Tab content ──
  const outputTabs: { id: OutputTab; label: string; available: boolean }[] = [
    {
      id: "logs",
      label: "Logs",
      available: compileState.status === "success" || compileState.status === "error",
    },
    {
      id: "errors",
      label: "Errors",
      available: compileState.status === "error",
    },
    {
      id: "abi",
      label: "ABI",
      available: compileState.status === "success",
    },
    {
      id: "sierra",
      label: "Sierra",
      available: compileState.status === "success",
    },
    {
      id: "casm",
      label: "CASM",
      available: compileState.status === "success",
    },
  ];

  const outputContent = (): string => {
    if (compileState.status === "error") {
      if (activeTab === "logs") return compileState.logs ?? "";
      if (activeTab === "errors") {
        return compileState.errors
          .map((e) =>
            e.line > 0
              ? `Line ${e.line}:${e.col} — ${e.message}`
              : e.message
          )
          .join("\n\n");
      }
      return "";
    }
    if (compileState.status === "success") {
      const d = compileState.data;
      if (activeTab === "logs") return d.logs;
      if (activeTab === "abi") return JSON.stringify(d.abi, null, 2);
      if (activeTab === "sierra") return JSON.stringify(d.sierra, null, 2);
      if (activeTab === "casm") return JSON.stringify(d.casm, null, 2);
    }
    return "";
  };

  const content = outputContent();

  const statusLabel = {
    idle: null,
    compiling: <span className="text-amber-400 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Compiling…</span>,
    success: <span className="text-emerald-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Compiled OK</span>,
    error: <span className="text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{(compileState as { status: "error"; errors: CompileError[] }).errors?.length ?? 0} error(s)</span>,
  }[compileState.status];

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* ── TOP BREADCRUMB/HEADER ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-900 bg-[#050505] flex-shrink-0">
        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-600">
          <span>Studio</span>
          <span className="text-neutral-800">/</span>
          <span className="text-amber-400">Cairo Compiler</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-neutral-600">
          <span>{statusLabel || "Ready"}</span>
        </div>
      </div>

      {/* ── MAIN FLEX CONTAINER ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL: Templates ── */}
        <div className="flex flex-col w-72 flex-shrink-0 border-r border-neutral-900 overflow-hidden bg-[#0a0a0a]">
          {/* Panel Header */}
          <div className="px-5 py-4 border-b border-neutral-900 bg-[#050505] flex-shrink-0">
            <h2 className="text-white font-bold text-sm tracking-tight">Templates</h2>
            <p className="text-neutral-600 text-[10px] mt-1">Select a contract template to start</p>
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {TEMPLATES.map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => selectTemplate(id)}
                className={clsx(
                  "w-full flex items-start gap-3 px-4 py-3 border rounded-lg transition-all text-left group",
                  templateId === id
                    ? "border-amber-500/60 bg-gradient-to-r from-amber-500/10 to-amber-500/5 shadow-sm shadow-amber-500/20"
                    : "border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:bg-white/[0.02] hover:text-neutral-300"
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded border flex items-center justify-center flex-shrink-0 transition-all mt-0.5",
                  templateId === id
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-neutral-800 group-hover:border-neutral-700"
                )}>
                  <FlaskConical
                    className={clsx(
                      "w-4 h-4",
                      templateId === id ? "text-amber-400" : "text-neutral-700"
                    )}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={clsx("text-sm font-semibold", templateId === id ? "text-white" : "")}>
                    {label}
                  </div>
                  <div className="text-[10px] text-neutral-700 mt-0.5 leading-tight">{desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-900" />

          {/* Compile Section */}
          <div className="px-4 py-4 bg-[#050505] flex flex-col gap-3 flex-shrink-0">
            <div>
              <h3 className="text-white font-semibold text-xs tracking-tight mb-2">Build Contract</h3>
              <button
                onClick={compile}
                disabled={compileState.status === "compiling"}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-200",
                  compileState.status === "compiling"
                    ? "bg-amber-400/70 text-black/70 cursor-not-allowed"
                    : "bg-amber-400 text-black hover:bg-amber-300 shadow-lg shadow-amber-400/30 active:scale-95"
                )}
              >
                {compileState.status === "compiling" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Building…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Build
                  </>
                )}
              </button>
            </div>

            {/* Status Badge */}
            <div className={clsx(
              "px-3 py-2 rounded border text-[10px] font-mono flex items-center gap-2",
              compileState.status === "success"
                ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400"
                : compileState.status === "error"
                  ? "border-red-500/40 bg-red-500/5 text-red-400"
                  : compileState.status === "compiling"
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-400"
                    : "border-neutral-800 bg-neutral-900/30 text-neutral-600"
            )}>
              <div className={clsx(
                "w-1.5 h-1.5 rounded-full",
                compileState.status === "success"
                  ? "bg-emerald-400 animate-pulse"
                  : compileState.status === "error"
                    ? "bg-red-400"
                    : compileState.status === "compiling"
                      ? "bg-amber-400 animate-spin"
                      : "bg-neutral-600"
              )} />
              <span>
                {compileState.status === "idle" && "Ready to build"}
                {compileState.status === "compiling" && "Compiling…"}
                {compileState.status === "success" && "Build successful"}
                {compileState.status === "error" && `${(compileState as any).errors?.length ?? 0} error(s)`}
              </span>
            </div>

            <div className="text-[9px] text-neutral-700 font-mono text-center">
              Scarb · Sepolia Testnet
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Editor + Output ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── EDITOR SECTION ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-900 bg-[#050505] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-neutral-600" strokeWidth={1.5} />
                  <span className="text-[10px] font-mono text-neutral-600 tracking-widest">src/lib.cairo</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CopyButton text={source} />
              </div>
            </div>

            {/* Editor */}
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full resize-none bg-[#030303] text-neutral-300 font-mono text-[12px] leading-relaxed px-5 py-4 focus:outline-none caret-amber-400 selection:bg-amber-500/20"
              style={{ tabSize: 4 }}
            />
          </div>

          {/* ── OUTPUT PANEL ── */}
          <div className="flex-shrink-0 flex flex-col border-t border-neutral-900" style={{ height: 280 }}>
            {/* Output Header + Tabs */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-900 bg-[#050505] flex-shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-neutral-600 tracking-widest font-bold">OUTPUT</span>
                <div className="flex items-center gap-1 border border-neutral-800 rounded bg-neutral-900/40 p-0.5">
                  {outputTabs.map(({ id, label, available }) => (
                    <button
                      key={id}
                      onClick={() => available && setActiveTab(id)}
                      disabled={!available}
                      className={clsx(
                        "px-3 py-1.5 text-[9px] font-mono tracking-wider rounded transition-colors",
                        activeTab === id && available
                          ? id === "errors"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : available
                            ? "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                            : "text-neutral-800 cursor-not-allowed"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                {content && <CopyButton text={content} />}
              </div>
            </div>

            {/* Output Content */}
            <div className="flex-1 overflow-auto bg-[#030303]">
              <AnimatePresence mode="wait">
                {compileState.status === "idle" ? (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-full"
                  >
                    <div className="text-center">
                      <div className="text-[11px] font-mono text-neutral-700">
                        Build your contract to see the output
                      </div>
                      <div className="text-[10px] text-neutral-800 mt-2">Select a template or write your own Cairo code</div>
                    </div>
                  </motion.div>
                ) : compileState.status === "compiling" ? (
                  <motion.div
                    key="compiling"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-full gap-3"
                  >
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                    <span className="text-[11px] font-mono text-neutral-600">Running scarb build…</span>
                  </motion.div>
                ) : content ? (
                  <motion.pre
                    key={activeTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={clsx(
                      "px-5 py-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap",
                      activeTab === "errors" ? "text-red-400" : "text-amber-400/90"
                    )}
                  >
                    {content}
                  </motion.pre>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
