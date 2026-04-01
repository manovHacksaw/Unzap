"use client";

import { useState, useMemo } from "react";
import { Account, WalletAccount, shortString, type ProviderInterface } from "starknet";
import {
  Activity,
  AlertCircle,
  Box,
  Check,
  ChevronRight,
  Code2,
  Cpu,
  Edit2,
  Globe,
  Info,
  Loader2,
  Hash as LucideHash,
  Plus,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { getNetworkConfig } from "@/lib/network-config";
import type { AbiEntry, CallLogEntry, ContractHistoryItem, FnResult, TransactionData } from "../types";
import { CopyButton } from "./CopyButton";

interface InteractPanelProps {
  contractAddress: string;
  abi: AbiEntry[];
  account: Account | WalletAccount | null;
  addLog: (msg: string) => void;
  provider: ProviderInterface | null;
  netConfig: ReturnType<typeof getNetworkConfig>;
  logTransaction: (data: TransactionData) => void;
  onRequestWallet: () => void;
  recentDeployments: ContractHistoryItem[];
  layout?: "panel" | "fullscreen";
  activeFileName?: string;
}

export function InteractPanel({
  contractAddress,
  abi: deployedAbi,
  account,
  addLog,
  provider,
  netConfig,
  logTransaction,
  onRequestWallet,
  recentDeployments,
  layout = "panel",
  activeFileName = "",
}: InteractPanelProps) {
  const [customAddress, setCustomAddress] = useState("");
  const [customAbiText, setCustomAbiText] = useState("");
  const [customAbiError, setCustomAbiError] = useState("");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [showCustomTarget, setShowCustomTarget] = useState(false);

  const [funcInputs, setFuncInputs] = useState<Record<string, Record<string, string>>>({});
  const [funcResults, setFuncResults] = useState<Record<string, FnResult>>({});
  const [funcLoading, setFuncLoading] = useState<Record<string, boolean>>({});
  const [funcErrors, setFuncErrors] = useState<Record<string, string>>({});

  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"functions" | "log">("functions");

  const isFullscreen = layout === "fullscreen";

  const parsedCustomAbi = useMemo(() => {
    if (!customAbiText.trim()) return null;
    try {
      const parsed = JSON.parse(customAbiText.trim());
      setCustomAbiError("");
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      setCustomAbiError("Invalid JSON — paste a raw ABI array.");
      return null;
    }
  }, [customAbiText]);

  const effectiveAddress = useCustomTarget && customAddress ? customAddress : contractAddress;
  const effectiveAbi: AbiEntry[] = useCustomTarget && parsedCustomAbi ? parsedCustomAbi : deployedAbi;

  const externalFunctions = useMemo(() => {
    const fns: AbiEntry[] = [];
    for (const entry of effectiveAbi) {
      if (entry.type === "function" && entry.state_mutability) {
        fns.push(entry);
      } else if ((entry.type === "impl" || entry.type === "interface") && Array.isArray(entry.items)) {
        for (const item of entry.items) {
          if (item.state_mutability) fns.push(item);
        }
      }
    }
    const seen = new Set<string>();
    return fns.filter(fn => {
      if (seen.has(fn.name)) return false;
      seen.add(fn.name);
      return true;
    });
  }, [effectiveAbi]);

  const viewFunctions = externalFunctions.filter((fn: AbiEntry) => fn.state_mutability === "view");
  const writeFunctions = externalFunctions.filter((fn: AbiEntry) => fn.state_mutability === "external");

  const isU256 = (t: string) => t === "core::integer::u256" || t === "u256";
  const isBool = (t: string) => t === "core::bool" || t === "bool";
  const isAddress = (t: string) => t.includes("ContractAddress");
  const isArray = (t: string) => t.startsWith("core::array::Array") || t.startsWith("Array<");
  const isOption = (t: string) => t.startsWith("core::option::Option") || t.startsWith("Option<");
  const isByteArray = (t: string) => t === "core::byte_array::ByteArray" || t === "ByteArray";

  function encodeInputValue(value: string, type: string): string[] {
    if (isU256(type)) {
      try {
        const n = value.startsWith("0x") ? BigInt(value) : BigInt(value || "0");
        const low = (n & BigInt("0xffffffffffffffffffffffffffffffff")).toString(10);
        const high = (n >> BigInt(128)).toString(10);
        return [low, high];
      } catch { return ["0", "0"]; }
    }
    if (isBool(type)) return [value === "true" || value === "1" ? "1" : "0"];
    if (isArray(type)) {
      const items = value.split(",").map(s => s.trim()).filter(Boolean);
      return [items.length.toString(), ...items];
    }
    if (isOption(type)) {
      if (!value || value === "None") return ["1"];
      return ["0", value];
    }
    if (isByteArray(type)) return [value || "0"];
    const isHex = /^0x[a-fA-F0-9]+$/.test(value);
    const isDecimal = /^[0-9]+$/.test(value);
    if (!isHex && !isDecimal && value.length > 0 && value.length <= 31) {
      try { return [shortString.encodeShortString(value)]; }
      catch { return [value || "0"]; }
    }
    return [value || "0"];
  }

  function decodeOutputValue(raw: string[], outputType: string): FnResult {
    if (!raw || raw.length === 0) return { raw: [], decoded: "—" };
    if (isU256(outputType) && raw.length >= 2) {
      try {
        const low = BigInt(raw[0]);
        const high = BigInt(raw[1]);
        const val = low + high * (BigInt(2) ** BigInt(128));
        return { raw, decoded: val.toString(10), extra: "0x" + val.toString(16) };
      } catch { return { raw, decoded: raw.join(", ") }; }
    }
    if (isBool(outputType)) {
      const v = raw[0];
      return { raw, decoded: (v === "0x0" || v === "0") ? "false" : "true" };
    }
    const v = raw[0];
    try {
      const n = BigInt(v);
      if (n === BigInt(0)) return { raw, decoded: "0" };
      const dec = n.toString(10);
      const hex = "0x" + n.toString(16).padStart(64, "0");
      const bytes = [];
      let tmp = n;
      while (tmp > BigInt(0)) {
        bytes.unshift(Number(tmp & BigInt(0xff)));
        tmp >>= BigInt(8);
      }
      if (bytes.length > 0 && bytes.length <= 31 && bytes.every(b => b >= 32 && b <= 126)) {
        const str = String.fromCharCode(...bytes);
        return { raw, decoded: `"${str}"`, extra: `${dec} (${hex.slice(0, 10)}...)` };
      }
      return { raw, decoded: dec, extra: hex };
    } catch {
      return { raw, decoded: v };
    }
  }

  function buildCalldata(fn: AbiEntry): string[] {
    const inputs: Array<{ name: string; type: string }> = fn.inputs ?? [];
    const calldata: string[] = [];
    for (const inp of inputs) {
      const val = funcInputs[fn.name]?.[inp.name] ?? "0";
      calldata.push(...encodeInputValue(val, inp.type));
    }
    return calldata;
  }

  const callFn = async (fn: AbiEntry) => {
    if (!effectiveAddress) return;
    const fnName = fn.name as string;
    setFuncLoading(prev => ({ ...prev, [fnName]: true }));
    setFuncErrors(prev => ({ ...prev, [fnName]: "" }));
    const logEntry: CallLogEntry = {
      id: Date.now().toString(),
      fnName,
      type: "read",
      inputs: funcInputs[fnName] ?? {},
      timestamp: Date.now(),
    };
    try {
      const calldata = buildCalldata(fn);
      if (!provider) throw new Error("No provider available");
      const raw: string[] = await provider.callContract({
        contractAddress: effectiveAddress,
        entrypoint: fnName,
        calldata,
      });
      const outputs: Array<{ type: string; name?: string }> = fn.outputs ?? [];
      let result: FnResult;
      if (outputs.length === 1) {
        result = decodeOutputValue(raw, outputs[0].type);
      } else if (outputs.length > 1) {
        result = { raw, decoded: raw.join(", ") };
      } else {
        result = { raw, decoded: raw.length > 0 ? raw.join(", ") : "✓" };
      }
      setFuncResults(prev => ({ ...prev, [fnName]: result }));
      logEntry.result = result.extra ? `${result.decoded}  (${result.extra})` : result.decoded;
      addLog(`read ${fnName}: ${logEntry.result?.slice(0, 80)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFuncErrors(prev => ({ ...prev, [fnName]: msg }));
      logEntry.error = msg;
      addLog(`read ${fnName} failed: ${msg.slice(0, 80)}`);
    } finally {
      setFuncLoading(prev => ({ ...prev, [fnName]: false }));
      setCallLog(prev => [logEntry, ...prev]);
    }
  };

  const executeFn = async (fn: AbiEntry) => {
    if (!account) { onRequestWallet(); return; }
    if (!effectiveAddress) return;
    const fnName = fn.name as string;
    setFuncLoading(prev => ({ ...prev, [fnName]: true }));
    setFuncErrors(prev => ({ ...prev, [fnName]: "" }));
    setFuncResults(prev => { const next = { ...prev }; delete next[fnName]; return next; });
    const logEntry: CallLogEntry = {
      id: Date.now().toString(),
      fnName,
      type: "write",
      inputs: funcInputs[fnName] ?? {},
      timestamp: Date.now(),
    };
    try {
      const calldata = buildCalldata(fn);
      const call = { contractAddress: effectiveAddress, entrypoint: fnName, calldata };
      const tx = await account.execute([call]);
      const txHash = tx.transaction_hash as string;
      addLog(`sent ${fnName}: ${txHash}`);
      setFuncResults(prev => ({ ...prev, [fnName]: { raw: [txHash], decoded: "pending…" } }));
      logEntry.txHash = txHash;
      logTransaction({ hash: txHash, type: fnName, status: "pending" });
      setCallLog(prev => [logEntry, ...prev]);
      await account.waitForTransaction(txHash);
      addLog(`${fnName} confirmed ✓`);
      setFuncResults(prev => ({ ...prev, [fnName]: { raw: [txHash], decoded: "confirmed ✓" } }));
      logTransaction({ hash: txHash, type: fnName, status: "success" });
      setCallLog(prev => prev.map(e => e.id === logEntry.id ? { ...e, confirmed: true } : e));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFuncErrors(prev => ({ ...prev, [fnName]: msg }));
      logEntry.error = msg;
      addLog(`execute ${fnName} failed: ${msg.slice(0, 80)}`);
      setCallLog(prev => [logEntry, ...prev]);
    } finally {
      setFuncLoading(prev => ({ ...prev, [fnName]: false }));
    }
  };

  const renderInput = (fnName: string, inp: { name: string; type: string }) => {
    const value = funcInputs[fnName]?.[inp.name] ?? "";
    const setVal = (v: string) => setFuncInputs(prev => ({
      ...prev,
      [fnName]: { ...prev[fnName], [inp.name]: v },
    }));
    const shortType = inp.type.split("::").pop() ?? inp.type;

    if (isBool(inp.type)) {
      const checked = value === "true" || value === "1";
      return (
        <div key={inp.name} className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{inp.name}</label>
            <span className="text-[9px] font-mono text-neutral-700">bool</span>
          </div>
          <button
            onClick={() => setVal(checked ? "false" : "true")}
            className={clsx(
              "w-9 h-5 rounded-full transition-colors relative flex-shrink-0 border",
              checked ? "bg-emerald-500/20 border-emerald-500/40" : "bg-neutral-900 border-neutral-700"
            )}
          >
            <div className={clsx(
              "absolute top-0.5 w-4 h-4 rounded-full transition-all",
              checked ? "translate-x-[18px] bg-emerald-400" : "translate-x-0.5 bg-neutral-600"
            )} />
          </button>
        </div>
      );
    }

    return (
      <div key={inp.name} className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{inp.name}</label>
          <span className="text-[9px] font-mono text-neutral-700 truncate max-w-[140px]" title={inp.type}>{shortType}</span>
        </div>
        <input
          placeholder={
            isAddress(inp.type) ? "0x…" :
            isU256(inp.type) ? "integer or 0x…" :
            isArray(inp.type) ? "a, b, c  (comma-separated)" :
            "felt252…"
          }
          value={value}
          onChange={e => setVal(e.target.value)}
          className="w-full bg-black/40 border border-neutral-900 rounded-lg px-3 py-2 text-[11px] font-mono outline-none focus:border-amber-500/30 text-neutral-300 placeholder:text-neutral-800 transition-all"
        />
      </div>
    );
  };

  const renderFnCard = (fn: AbiEntry, isView: boolean) => {
    const fnName = fn.name as string;
    const inputs: Array<{ name: string; type: string }> = fn.inputs ?? [];
    const isLoading = funcLoading[fnName];
    const result = funcResults[fnName];
    const error = funcErrors[fnName];
    const hasInputs = inputs.length > 0;

    return (
      <div key={fnName} className={clsx(
        "rounded-xl border transition-all duration-200",
        isView ? "border-neutral-800 hover:border-neutral-700" : "border-neutral-800 hover:border-amber-500/20"
      )}>
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <div className={clsx(
            "w-2 h-2 rounded-full flex-shrink-0",
            isView
              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
              : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]"
          )} />
          <span className="text-[11px] font-bold font-mono text-neutral-200 flex-1 truncate">{fnName}</span>
          <span className={clsx(
            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border flex-shrink-0",
            isView
              ? "bg-emerald-500/5 text-emerald-600 border-emerald-900"
              : "bg-amber-500/5 text-amber-600 border-amber-900/60"
          )}>
            {isView ? "view" : "write"}
          </span>
        </div>

        <div className="px-3.5 pb-3.5 space-y-3">
          {hasInputs && (
            <div className="space-y-2.5 bg-black/20 rounded-lg p-3 border border-neutral-900">
              {inputs.map(inp => renderInput(fnName, inp))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => isView ? callFn(fn) : executeFn(fn)}
              disabled={isLoading}
              className={clsx(
                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5",
                isView
                  ? "bg-neutral-900 border border-neutral-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-emerald-600 hover:text-emerald-400 disabled:opacity-40"
                  : account
                    ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] disabled:opacity-40"
                    : "bg-neutral-900 border border-amber-500/20 text-amber-600/60 hover:text-amber-500 hover:bg-amber-500/5 disabled:opacity-40"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isView ? (
                "Query"
              ) : account ? (
                "Execute"
              ) : (
                <><Shield className="w-3 h-3" /> Connect Wallet</>
              )}
            </button>
            {result && (
              <button
                onClick={() => setFuncResults(prev => { const n = { ...prev }; delete n[fnName]; return n; })}
                className="p-2 rounded-lg border border-neutral-900 text-neutral-700 hover:text-neutral-500 hover:border-neutral-800 transition-colors"
                title="Clear result"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {result && (
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                  <Check className="w-3 h-3" /> Output
                </div>
                <CopyButton text={result.extra ? `${result.decoded} (${result.extra})` : result.decoded} />
              </div>
              <div className="font-mono text-[11px] text-emerald-200/80 break-all">{result.decoded}</div>
              {result.extra && (
                <div className="mt-1 font-mono text-[10px] text-neutral-600">{result.extra}</div>
              )}
              {result.raw.length > 1 && (
                <details className="mt-2">
                  <summary className="text-[9px] text-neutral-700 cursor-pointer hover:text-neutral-500 transition-colors">raw felts</summary>
                  <pre className="mt-1 text-[9px] font-mono text-neutral-700 break-all whitespace-pre-wrap">{JSON.stringify(result.raw, null, 2)}</pre>
                </details>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1.5">
                <AlertCircle className="w-3 h-3" /> Reverted
              </div>
              <div className="text-[10px] font-mono text-red-300/70 leading-relaxed break-all">{error}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!effectiveAddress && !showCustomTarget) {
    return (
      <div className="-m-5 flex flex-col items-center justify-center gap-5 py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <Activity className="w-7 h-7 text-neutral-600" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-[13px] text-neutral-300 font-bold">No Contract Target</p>
          <p className="text-[10px] text-neutral-600 leading-relaxed">
            Deploy a contract from the Deploy tab, or load an existing one.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-[220px]">
          <button
            onClick={() => setShowCustomTarget(true)}
            className="w-full py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:border-amber-500/30 hover:text-amber-400 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Load External Contract
          </button>
          {recentDeployments.length > 0 && (
            <div className="space-y-1.5 mt-1">
              <div className="text-[9px] text-neutral-700 uppercase tracking-widest text-center">recent</div>
              {recentDeployments.slice(0, 3).map((d: ContractHistoryItem) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setCustomAddress(d.contractAddress);
                    if (d.abi) setCustomAbiText(JSON.stringify(d.abi));
                    setUseCustomTarget(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-900 bg-black/20 hover:border-neutral-700 transition-colors text-left"
                >
                  <Box className="w-3 h-3 flex-shrink-0 text-neutral-700" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-neutral-300 font-medium truncate">{d.name || "Contract"}</span>
                    <span className="text-[9px] font-mono text-neutral-700 truncate">{d.contractAddress?.slice(0, 12)}…</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500">
        <div className="mb-12">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-2xl shadow-amber-500/5">
                  <Zap className="w-7 h-7 text-amber-500" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/70">Contract Dashboard</span>
                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase text-emerald-500">Verified</span>
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-none">{activeFileName || "Unnamed Contract"}</h2>
                </div>
              </div>

              {effectiveAddress && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] w-fit">
                  <Globe className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="text-xs font-mono text-neutral-400">{effectiveAddress}</span>
                  <div className="w-px h-3 bg-neutral-800" />
                  <CopyButton text={effectiveAddress} label="Copy Address" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-3 text-right">
              <button
                onClick={() => setShowCustomTarget(!showCustomTarget)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest border",
                  showCustomTarget ? "bg-amber-500 text-black border-amber-400" : "bg-white/[0.05] border-white/[0.1] text-neutral-300 hover:text-amber-500 hover:bg-white/[0.1]"
                )}
              >
                <Plus className="w-4 h-4" />
                Load External
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900/50 border border-white/[0.05] text-amber-500 font-black text-[10px] uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Totally Gasless
              </div>
            </div>
          </div>

          {showCustomTarget && (
            <div className="mt-12 p-8 rounded-3xl bg-[#080808]/80 border border-amber-500/20 backdrop-blur-2xl animate-in zoom-in-95 duration-200 shadow-2xl">
              <div className="flex items-center justify-between mb-8 border-b border-white/[0.05] pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner">
                    <Globe className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-white tracking-tight leading-none mb-1">Load Starknet Contract</h3>
                    <p className="text-xs text-neutral-500">Provide a contract address and its ABI to generate the interface.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomTarget(false)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-all text-neutral-600 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-5 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
                      <LucideHash className="w-3.5 h-3.5" />
                      Contract Address
                    </label>
                    <input
                      value={customAddress}
                      onChange={e => setCustomAddress(e.target.value)}
                      placeholder="0x0123... (Starknet Address)"
                      className="w-full bg-black/60 border border-white/[0.08] rounded-2xl px-5 py-4 text-sm font-mono outline-none focus:border-amber-500/50 text-neutral-200 placeholder:text-neutral-800 transition-all shadow-inner"
                    />
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-500/[0.02] border border-amber-500/10">
                    <div className="flex items-center gap-2 text-amber-500/80 mb-2">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-center">Recent Contracts</span>
                    </div>
                    {recentDeployments.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {recentDeployments.slice(0, 5).map((d: ContractHistoryItem) => (
                          <button
                            key={d.id}
                            onClick={() => setCustomAddress(d.contractAddress)}
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="text-[11px] text-white font-bold group-hover:text-amber-500 transition-colors">{d.name}</div>
                              <div className="font-mono text-[9px] text-neutral-600 block truncate max-w-[140px]">{d.contractAddress}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] text-neutral-800 font-bold uppercase tracking-tighter">{d.createdAt}</span>
                              <ChevronRight className="w-3 h-3 text-neutral-800 group-hover:text-amber-500 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-700 italic">No recent local deployments found.</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (customAddress) {
                        setUseCustomTarget(true);
                        setShowCustomTarget(false);
                      }
                    }}
                    disabled={!customAddress}
                    className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.15)] disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <span className="group-hover:scale-105 transition-transform inline-block">Load Deployed Interface</span>
                  </button>
                </div>

                <div className="col-span-7 flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5" />
                    ABI Interface (JSON Array)
                  </label>
                  <div className="flex-1 min-h-[300px] relative">
                    <textarea
                      value={customAbiText}
                      onChange={e => setCustomAbiText(e.target.value)}
                      placeholder={'[\n  {\n    "type": "function",\n    "name": "balanceOf",\n    ...\n  }\n]'}
                      className="absolute inset-0 w-full h-full bg-black/60 border border-white/[0.08] rounded-3xl px-6 py-6 text-xs font-mono outline-none focus:border-amber-500/50 text-neutral-400 placeholder:text-neutral-800 resize-none transition-all shadow-inner custom-scrollbar"
                    />
                  </div>
                  {customAbiError && (
                    <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold">
                      Error: {customAbiError}
                    </div>
                  )}
                  {parsedCustomAbi && !customAbiError && (
                    <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold">
                      Interface Verified: {parsedCustomAbi.length} dynamic methods found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-10 grid grid-cols-3 gap-6">
            <div className="col-span-2 p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/[0.08] backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Info className="w-32 h-32" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-3 flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                AI Contract Insight
              </h3>
              <p className="text-neutral-300 text-sm leading-relaxed max-w-2xl">
                This contract, <span className="text-amber-500 font-bold">{activeFileName}</span>, implements
                {viewFunctions.length > 0 ? ` ${viewFunctions.length} query methods` : ""}
                {writeFunctions.length > 0 ? ` and ${writeFunctions.length} state-changing operations` : ""}.
                It follows the standard Starknet component pattern with embedded entrypoints for maximum gas efficiency and modularity on {netConfig.label}.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex flex-col justify-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-700 mb-1 leading-none">Status</div>
              <div className="text-xl font-bold text-neutral-300 flex items-center gap-2 uppercase tracking-tighter">
                {contractAddress && !useCustomTarget ? "On-Chain Active" : "Local Prototype"}
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-neutral-600 uppercase">Methods</span>
                  <span className="text-lg font-black text-white">{externalFunctions.length}</span>
                </div>
                <div className="w-px h-6 bg-neutral-900" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-neutral-600 uppercase">ABI Size</span>
                  <span className="text-lg font-black text-white">{(JSON.stringify(effectiveAbi).length / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              {(!contractAddress && !useCustomTarget) && (
                <div className="mt-6 flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase tracking-widest bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
                  <ChevronRight className="w-3.5 h-3.5" />
                  Check Deploy Panel
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
              <div className="flex items-center gap-6">
                <button onClick={() => setActiveSubTab("functions")} className={clsx("text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all", activeSubTab === "functions" ? "text-amber-500 border-amber-500" : "text-neutral-600 border-transparent hover:text-neutral-400")}>Interface</button>
                <button onClick={() => setActiveSubTab("log")} className={clsx("text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all", activeSubTab === "log" ? "text-amber-500 border-amber-500" : "text-neutral-600 border-transparent hover:text-neutral-400")}>Activity</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
              {activeSubTab === "functions" ? (
                <div className="grid grid-cols-2 gap-4">
                  {externalFunctions.map((fn) => renderFnCard(fn, fn.state_mutability === "view"))}
                </div>
              ) : (
                <div className="space-y-4">
                  {callLog.map(entry => (
                    <div key={entry.id} className="p-4 rounded-xl border border-white/[0.03] bg-white/[0.01] flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                      <div className="flex items-center gap-4">
                        <div className={clsx("w-2 h-2 rounded-full", entry.error ? "bg-red-500" : "bg-emerald-500")} />
                        <div>
                          <div className="text-xs font-mono text-neutral-300">{entry.fnName}</div>
                          <div className="text-[10px] text-neutral-600 font-mono mt-0.5">{new Date(entry.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {entry.txHash && <a href={`${netConfig.voyager}/tx/${entry.txHash}`} target="_blank" className="text-[10px] uppercase font-black text-neutral-500 hover:text-amber-500 transition-colors">Voyager ↗</a>}
                        <CopyButton text={entry.result || entry.error || ""} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-4 space-y-6">
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-white/[0.05]">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Security & Metadata
              </h4>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/40 border border-white/[0.03]">
                  <span className="text-[8px] font-black uppercase text-neutral-700">Account Status</span>
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-1.5 h-1.5 rounded-full", account ? "bg-emerald-500" : "bg-red-500")} />
                    <span className="text-[11px] font-mono text-neutral-400">{account ? account.address.slice(0, 10) + "..." : "Not Connected"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/40 border border-white/[0.03]">
                  <span className="text-[8px] font-black uppercase text-neutral-700">Compiler Version</span>
                  <span className="text-[11px] font-mono text-neutral-400">Scarb 2.8.4</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
                <Zap className="w-12 h-12 text-amber-500" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-2">Power Mode</h4>
              <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                Gasless execution enabled via Starkzap Paymaster. Your builder credits are covering this session.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Panel layout
  return (
    <div className="-m-5 flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex-shrink-0 border-b border-neutral-900">
        {effectiveAddress ? (
          <div className="px-4 py-3 bg-black/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-neutral-600">
                  {useCustomTarget ? "Custom Target" : "Deployed Contract"}
                </span>
              </div>
              <button
                onClick={() => setShowCustomTarget(!showCustomTarget)}
                className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-2.5 h-2.5" />
                <span>Change</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-neutral-300 flex-1 truncate" title={effectiveAddress}>
                {effectiveAddress.slice(0, 14)}…{effectiveAddress.slice(-8)}
              </span>
              <CopyButton text={effectiveAddress} />
              <a
                href={`${netConfig.voyager}/contract/${effectiveAddress}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors"
                title="View on Voyager"
              >↗</a>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-amber-500/5 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500">No address set</span>
          </div>
        )}

        {showCustomTarget && (
          <div className="px-4 py-4 bg-[#080808] border-t border-neutral-900 space-y-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Load Contract</div>
            <div>
              <label className="text-[9px] text-neutral-600 block mb-1">Address</label>
              <input
                value={customAddress}
                onChange={e => setCustomAddress(e.target.value)}
                placeholder="0x…"
                className="w-full bg-black/50 border border-neutral-800 rounded-lg px-3 py-2 text-[11px] font-mono outline-none focus:border-amber-500/30 text-neutral-300 placeholder:text-neutral-700 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] text-neutral-600 block mb-1">ABI <span className="text-neutral-700">(paste JSON array)</span></label>
              <textarea
                value={customAbiText}
                onChange={e => setCustomAbiText(e.target.value)}
                placeholder={'[{"type":"function","name":"get",...}]'}
                rows={3}
                className="w-full bg-black/50 border border-neutral-800 rounded-lg px-3 py-2 text-[10px] font-mono outline-none focus:border-amber-500/30 text-neutral-300 placeholder:text-neutral-700 resize-none transition-all"
              />
              {customAbiError && <p className="text-[9px] text-red-400 mt-1">{customAbiError}</p>}
              {parsedCustomAbi && !customAbiError && (
                <p className="text-[9px] text-emerald-600 mt-1">✓ {parsedCustomAbi.length} ABI entries parsed</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (customAddress) {
                    setUseCustomTarget(true);
                    setShowCustomTarget(false);
                    setActiveSubTab("functions");
                  }
                }}
                disabled={!customAddress}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-bold text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Load
              </button>
              <button
                onClick={() => setShowCustomTarget(false)}
                className="flex-1 py-2 rounded-lg border border-neutral-800 text-neutral-500 font-bold text-[10px] uppercase tracking-widest hover:border-neutral-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex h-8 bg-black/20">
          {(["functions", "log"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={clsx(
                "px-4 h-full text-[9px] font-black uppercase tracking-widest relative transition-colors",
                activeSubTab === tab
                  ? "text-neutral-200 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-amber-500"
                  : "text-neutral-600 hover:text-neutral-400"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {activeSubTab === "functions" ? (
          <div className="p-4 space-y-5">
            {externalFunctions.length === 0 && (
              <div className="text-center py-10 text-[10px] text-neutral-700 font-mono italic">
                {effectiveAbi.length === 0
                  ? "No ABI loaded — build the contract or paste an ABI above."
                  : "No external functions detected in the ABI."}
              </div>
            )}

            {viewFunctions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-emerald-900/40" />
                  <span className="text-[9px] font-black uppercase text-neutral-600 tracking-[0.2em]">Read</span>
                  <div className="h-px flex-1 bg-emerald-900/40" />
                </div>
                {viewFunctions.map((fn: AbiEntry) => renderFnCard(fn, true))}
              </div>
            )}

            {writeFunctions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-amber-900/40" />
                  <span className="text-[9px] font-black uppercase text-neutral-600 tracking-[0.2em]">Write</span>
                  <div className="h-px flex-1 bg-amber-900/40" />
                </div>
                {writeFunctions.map((fn: AbiEntry) => renderFnCard(fn, false))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {callLog.length === 0 ? (
              <div className="text-center py-14 text-[10px] text-neutral-700 font-mono italic">
                No calls yet.
              </div>
            ) : (
              callLog.map(entry => (
                <div key={entry.id} className="p-3 rounded-lg border border-neutral-900 bg-black/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold font-mono text-neutral-200 truncate">{entry.fnName}</span>
                    <span className="text-[9px] font-mono text-neutral-700">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
