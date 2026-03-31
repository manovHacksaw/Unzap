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
    <div className="flex h-full">
      {/* ── LEFT: Templates + compile ── */}
      <div className="flex flex-col w-64 flex-shrink-0 border-r border-neutral-900 overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-5 border-b border-neutral-900">
          <div className="text-[10px] font-mono text-neutral-500 tracking-widest mb-1">[ CONTRACT LAB ]</div>
          <h1 className="text-white font-bold text-base tracking-tight">Cairo Compiler</h1>
          <p className="text-neutral-500 text-xs mt-1">Write, compile, inspect</p>
        </div>

        {/* Templates */}
        <div className="px-4 py-4 border-b border-neutral-900 space-y-1.5">
          <div className="text-[10px] font-mono text-neutral-600 tracking-widest mb-3">TEMPLATES</div>
          {TEMPLATES.map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => selectTemplate(id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-all",
                templateId === id
                  ? "border-amber-500/40 bg-amber-500/5 text-white"
                  : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
              )}
            >
              <FlaskConical
                className={clsx(
                  "w-4 h-4 flex-shrink-0",
                  templateId === id ? "text-amber-400" : "text-neutral-700"
                )}
                strokeWidth={1.5}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{label}</div>
                <div className="text-[10px] text-neutral-600 truncate">{desc}</div>
              </div>
              {templateId === id && (
                <ChevronRight className="w-3 h-3 text-amber-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Status */}
        {statusLabel && (
          <div className="px-5 py-3 border-b border-neutral-900">
            <div className="text-[10px] font-mono">{statusLabel}</div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Compile button */}
        <div className="px-4 py-4 border-t border-neutral-900">
          <button
            onClick={compile}
            disabled={compileState.status === "compiling"}
            className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {compileState.status === "compiling" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Compiling…
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Compile →
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-neutral-700 mt-2 font-mono">
            scarb build · sepolia
          </p>
        </div>
      </div>

      {/* ── MAIN: Editor + output ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cairo editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-b border-neutral-900">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-900 flex-shrink-0">
            <span className="text-[10px] font-mono text-neutral-600 tracking-widest">src/lib.cairo</span>
            <CopyButton text={source} />
          </div>

          {/* Textarea */}
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full resize-none bg-[#030303] text-neutral-300 font-mono text-[12px] leading-relaxed px-5 py-4 focus:outline-none caret-amber-400 selection:bg-amber-500/20"
            style={{ tabSize: 4 }}
          />
        </div>

        {/* Output panel */}
        <div className="flex-shrink-0 flex flex-col" style={{ height: 260 }}>
          {/* Tabs */}
          <div className="flex items-center border-b border-neutral-900 bg-[#0a0a0a]">
            <span className="text-[10px] font-mono text-neutral-700 tracking-widest px-4">OUTPUT</span>
            <div className="flex">
              {outputTabs.map(({ id, label, available }) => (
                <button
                  key={id}
                  onClick={() => available && setActiveTab(id)}
                  disabled={!available}
                  className={clsx(
                    "px-4 py-2.5 text-[10px] font-mono tracking-wider border-b-2 transition-colors",
                    activeTab === id && available
                      ? id === "errors"
                        ? "border-red-500 text-red-400"
                        : "border-amber-500 text-amber-400"
                      : available
                        ? "border-transparent text-neutral-500 hover:text-neutral-300"
                        : "border-transparent text-neutral-800 cursor-not-allowed"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto px-4">
              {content && <CopyButton text={content} />}
            </div>
          </div>

          {/* Output content */}
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
                  <span className="text-[11px] font-mono text-neutral-700">
                    Press <span className="text-amber-600">Compile →</span> to build your contract
                  </span>
                </motion.div>
              ) : compileState.status === "compiling" ? (
                <motion.div
                  key="compiling"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full gap-2"
                >
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
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
  );
}
