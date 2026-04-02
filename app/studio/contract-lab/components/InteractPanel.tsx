"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Account, WalletAccount, shortString, type ProviderInterface } from "starknet";
import {
  AlertCircle,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Hash as LucideHash,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  X,
  Zap,
  Activity,
  Clock,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { clsx } from "clsx";
import { getNetworkConfig } from "@/lib/network-config";
import type { AbiEntry, CallLogEntry, ContractHistoryItem, FnResult, StudioToastInput, TransactionData, SzWalletType } from "../types";
import { CopyButton } from "./CopyButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatAbiEntries, normalizeAbiEntries } from "../utils";

interface InteractPanelProps {
  contractAddress: string;
  abi: AbiEntry[];
  account: Account | WalletAccount | null;
  szWallet?: SzWalletType | null;
  walletType?: "privy" | "extension" | null;
  walletAddress?: string;
  strkBalance?: string | null;
  isFetchingBalance?: boolean;
  fetchStrkBalance?: (addr: string) => void;
  network?: "mainnet" | "sepolia";
  handleNetworkSwitch?: (n: "mainnet" | "sepolia") => void;
  addLog: (msg: string) => void;
  provider: ProviderInterface | null;
  netConfig: ReturnType<typeof getNetworkConfig>;
  logTransaction: (data: TransactionData) => void;
  onRequestWallet: () => void;
  recentDeployments: ContractHistoryItem[];
  layout?: "panel" | "fullscreen";
  activeFileName?: string;
  notify?: (toast: StudioToastInput) => void;
}

export function InteractPanel({
  contractAddress,
  abi: deployedAbi,
  account,
  szWallet = null,
  walletType = null,
  walletAddress = "",
  strkBalance = null,
  isFetchingBalance = false,
  fetchStrkBalance,
  network,
  handleNetworkSwitch,
  addLog,
  provider,
  netConfig,
  logTransaction,
  onRequestWallet,
  recentDeployments,
  layout = "panel",
  activeFileName = "",
  notify,
}: InteractPanelProps) {
  const [customAddress, setCustomAddress] = useState("");
  const [customAbiText, setCustomAbiText] = useState("");
  const [customAbiError, setCustomAbiError] = useState("");
  const [isLoadingTarget, setIsLoadingTarget] = useState(false);
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [showCustomTarget, setShowCustomTarget] = useState(false);

  const [funcInputs, setFuncInputs] = useState<Record<string, Record<string, string>>>({});
  const [funcResults, setFuncResults] = useState<Record<string, FnResult>>({});
  const [funcLoading, setFuncLoading] = useState<Record<string, boolean>>({});
  const [funcErrors, setFuncErrors] = useState<Record<string, string>>({});
  const [expandedFns, setExpandedFns] = useState<Record<string, boolean>>({});

  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"functions" | "log">("functions");
  const [copiedAddress, setCopiedAddress] = useState(false);

  const isFullscreen = layout === "fullscreen";

  const parsedCustomAbi = useMemo(() => {
    if (!customAbiText.trim()) return null;
    try {
      return normalizeAbiEntries(JSON.parse(customAbiText.trim()));
    } catch {
      return null;
    }
  }, [customAbiText]);

  useEffect(() => {
    if (!customAbiText.trim()) {
      setCustomAbiError("");
      return;
    }

    if (!parsedCustomAbi || parsedCustomAbi.length === 0) {
      setCustomAbiError("Invalid JSON — paste a raw ABI array.");
      return;
    }

    setCustomAbiError("");
  }, [customAbiText, parsedCustomAbi]);

  const savedDeployedAbi = useMemo(() => {
    if (!contractAddress) return [];
    const matchedDeployment = recentDeployments.find(
      (deployment) => deployment.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
    return matchedDeployment ? normalizeAbiEntries(matchedDeployment.abi) : [];
  }, [contractAddress, recentDeployments]);

  const effectiveAddress = useCustomTarget && customAddress ? customAddress : contractAddress;
  const resolvedDeployedAbi = savedDeployedAbi.length > 0 ? savedDeployedAbi : deployedAbi;
  const effectiveAbi: AbiEntry[] = useCustomTarget && parsedCustomAbi ? parsedCustomAbi : resolvedDeployedAbi;

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

  // ── type helpers ──────────────────────────────────────────────────────────
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

  const resolveAbiForAddress = useCallback(async (address: string) => {
    if (!provider) {
      throw new Error("No provider available to resolve ABI on the selected network.");
    }

    const contractClass = await provider.getClassAt(address);
    const resolvedAbi = normalizeAbiEntries((contractClass as { abi?: unknown }).abi);
    if (resolvedAbi.length === 0) {
      throw new Error("No ABI was returned for this contract.");
    }

    return resolvedAbi;
  }, [provider]);

  const loadCustomTarget = useCallback(async (addressInput: string, abiOverride?: AbiEntry[]) => {
    const address = addressInput.trim();
    if (!address) return;

    setIsLoadingTarget(true);
    try {
      const resolvedAbi = abiOverride && abiOverride.length > 0 ? abiOverride : await resolveAbiForAddress(address);
      setCustomAddress(address);
      setCustomAbiText(formatAbiEntries(resolvedAbi));
      setCustomAbiError("");
      setUseCustomTarget(true);
      setShowCustomTarget(false);
      setActiveSubTab("functions");
      addLog(`[interact] Loaded ${address.slice(0, 10)}... with ${resolvedAbi.length} ABI entr${resolvedAbi.length === 1 ? "y" : "ies"}.`);
      notify?.({
        tone: "success",
        title: "Contract interface loaded",
        description: `${resolvedAbi.length} ABI entr${resolvedAbi.length === 1 ? "y" : "ies"} loaded for ${address.slice(0, 10)}...`,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load contract ABI.";
      setCustomAbiError(message);
      addLog(`[interact] ${message}`);
      notify?.({
        tone: "error",
        title: "Contract load failed",
        description: message,
      });
    } finally {
      setIsLoadingTarget(false);
    }
  }, [addLog, notify, resolveAbiForAddress]);

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
    if (!account && !szWallet) { onRequestWallet(); return; }
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

      let txHash = "";

      if (walletType === "privy" && szWallet) {
        // Gasless execution via AVNU paymaster
        addLog(`${fnName}: sending gasless (AVNU paymaster)…`);
        const tx = await szWallet.execute([call], { feeMode: "sponsored" });
        txHash = tx.hash;
        addLog(`${fnName} gasless tx: ${txHash}`);
        setFuncResults(prev => ({ ...prev, [fnName]: { raw: [txHash], decoded: "pending…" } }));
        logEntry.txHash = txHash;
        logTransaction({ hash: txHash, type: fnName, status: "pending" });
        setCallLog(prev => [logEntry, ...prev]);
        await tx.wait();
      } else {
        // Extension wallet — direct execution
        const tx = await account!.execute([call]);
        txHash = tx.transaction_hash as string;
        addLog(`${fnName} tx: ${txHash}`);
        setFuncResults(prev => ({ ...prev, [fnName]: { raw: [txHash], decoded: "pending…" } }));
        logEntry.txHash = txHash;
        logTransaction({ hash: txHash, type: fnName, status: "pending" });
        setCallLog(prev => [logEntry, ...prev]);
        await account!.waitForTransaction(txHash);
      }

      addLog(`${fnName} confirmed ✓`);
      setFuncResults(prev => ({ ...prev, [fnName]: { raw: [txHash], decoded: "confirmed ✓" } }));
      logTransaction({ hash: txHash, type: fnName, status: "success" });
      setCallLog(prev => prev.map(e => e.id === logEntry.id ? { ...e, confirmed: true } : e));
      notify?.({
        tone: "success",
        title: `${fnName} confirmed`,
        description: walletType === "privy" ? "Gasless transaction landed successfully." : "Transaction landed successfully.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFuncErrors(prev => ({ ...prev, [fnName]: msg }));
      logEntry.error = msg;
      addLog(`execute ${fnName} failed: ${msg.slice(0, 80)}`);
      setCallLog(prev => [logEntry, ...prev]);
      notify?.({
        tone: "error",
        title: `${fnName} failed`,
        description: msg.slice(0, 140),
      });
    } finally {
      setFuncLoading(prev => ({ ...prev, [fnName]: false }));
    }
  };

  const toggleExpand = (fnName: string) =>
    setExpandedFns(prev => ({ ...prev, [fnName]: !prev[fnName] }));

  const copyAddress = () => {
    navigator.clipboard.writeText(effectiveAddress);
    setCopiedAddress(true);
    notify?.({
      tone: "success",
      title: "Contract address copied",
      description: "The active contract address is now in your clipboard.",
    });
    setTimeout(() => setCopiedAddress(false), 1500);
  };

  // ── input renderer ────────────────────────────────────────────────────────
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
        <div key={inp.name} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-foreground/70">{inp.name}</span>
            <span className="text-[9px] text-muted-foreground/50">bool</span>
          </div>
          <button
            onClick={() => setVal(checked ? "false" : "true")}
            className={clsx(
              "w-8 h-4 rounded-full transition-all relative flex-shrink-0 border",
              checked ? "bg-emerald-500/20 border-emerald-500/40" : "bg-white/5 border-border/60"
            )}
          >
            <div className={clsx(
              "absolute top-0.5 w-3 h-3 rounded-full transition-all",
              checked ? "translate-x-[18px] bg-emerald-400" : "translate-x-0.5 bg-neutral-600"
            )} />
          </button>
        </div>
      );
    }

    return (
      <div key={inp.name} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-foreground/60">{inp.name}</label>
          <span className="text-[9px] text-muted-foreground/40 font-mono truncate max-w-[120px]" title={inp.type}>{shortType}</span>
        </div>
        <input
          placeholder={
            isAddress(inp.type) ? "0x…" :
            isU256(inp.type) ? "integer or 0x…" :
            isArray(inp.type) ? "a, b, c" :
            "felt252…"
          }
          value={value}
          onChange={e => setVal(e.target.value)}
          className="w-full bg-black/30 border border-border/50 rounded-md px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 text-foreground/80 placeholder:text-muted-foreground/30 transition-all"
        />
      </div>
    );
  };

  // ── function card ─────────────────────────────────────────────────────────
  const renderFnCard = (fn: AbiEntry, isView: boolean) => {
    const fnName = fn.name as string;
    const inputs: Array<{ name: string; type: string }> = fn.inputs ?? [];
    const isLoading = funcLoading[fnName];
    const result = funcResults[fnName];
    const error = funcErrors[fnName];
    const hasInputs = inputs.length > 0;
    const isExpanded = expandedFns[fnName] ?? false;

    return (
      <div
        key={fnName}
        className={clsx(
          "rounded-lg border transition-all duration-150",
          isView
            ? "border-border/50 hover:border-emerald-500/20"
            : "border-border/50 hover:border-amber-500/20",
          (result || error) && "border-b-0 rounded-b-none"
        )}
      >
        {/* Card header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
          onClick={() => hasInputs && toggleExpand(fnName)}
        >
          <div className={clsx(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            isView ? "bg-emerald-500" : "bg-amber-500"
          )} />
          <span className="text-[12px] font-mono font-medium text-foreground/85 flex-1 truncate">{fnName}</span>
          <Badge className={clsx(
            "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 h-4 flex-shrink-0",
            isView
              ? "bg-emerald-500/8 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/8"
              : "bg-amber-500/8 text-amber-500 border-amber-500/20 hover:bg-amber-500/8"
          )}>
            {isView ? "read" : "write"}
          </Badge>
          {hasInputs && (
            <ChevronDown className={clsx(
              "w-3 h-3 text-muted-foreground/40 transition-transform flex-shrink-0",
              isExpanded && "rotate-180"
            )} />
          )}
        </div>

        {/* Inputs (shown always if no inputs, else collapsible) */}
        {(hasInputs ? isExpanded : true) && (
          <div className="px-3 pb-3 space-y-3">
            {hasInputs && (
              <div className="space-y-2 p-2.5 rounded-md bg-black/20 border border-border/40">
                {inputs.map(inp => renderInput(fnName, inp))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => isView ? callFn(fn) : executeFn(fn)}
                disabled={isLoading}
                className={clsx(
                  "h-7 flex-1 text-[10px] font-bold uppercase tracking-wider gap-1.5",
                  isView
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 hover:text-emerald-300"
                    : account
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-white/5 text-amber-500/60 border border-amber-500/20 hover:bg-amber-500/8 hover:text-amber-400"
                )}
                variant={isView || !account ? "ghost" : "default"}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isView ? (
                  "Query"
                ) : account ? (
                  "Execute"
                ) : (
                  <><Shield className="w-3 h-3" />Connect</>
                )}
              </Button>
              {(result || error) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/5"
                  onClick={() => {
                    setFuncResults(prev => { const n = { ...prev }; delete n[fnName]; return n; });
                    setFuncErrors(prev => { const n = { ...prev }; delete n[fnName]; return n; });
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Result */}
            {result && (
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest">
                    <Check className="w-2.5 h-2.5" /> Output
                  </div>
                  <CopyButton
                    text={result.extra ? `${result.decoded} (${result.extra})` : result.decoded}
                    onCopy={() =>
                      notify?.({
                        tone: "success",
                        title: "Result copied",
                        description: `${fnName} output copied to your clipboard.`,
                      })
                    }
                  />
                </div>
                <div className="font-mono text-[11px] text-emerald-300/80 break-all">{result.decoded}</div>
                {result.extra && (
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground/50">{result.extra}</div>
                )}
                {result.raw.length > 1 && (
                  <details className="mt-1.5">
                    <summary className="text-[9px] text-muted-foreground/40 cursor-pointer hover:text-muted-foreground/70 transition-colors">raw felts</summary>
                    <pre className="mt-1 text-[9px] font-mono text-muted-foreground/40 break-all whitespace-pre-wrap">{JSON.stringify(result.raw, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md bg-red-500/5 border border-red-500/15 p-2.5">
                <div className="flex items-center gap-1 text-[9px] font-bold text-red-400/80 uppercase tracking-widest mb-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Reverted
                </div>
                <div className="text-[10px] font-mono text-red-300/60 leading-relaxed break-all">{error}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const InteractionMetaStrip = ({ compact = false }: { compact?: boolean }) => (
    <div className={clsx(
      "flex flex-wrap items-center gap-3",
      compact ? "px-3 py-2 border-b border-neutral-800 bg-black/10" : "mb-5"
    )}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-500">StarkZap SDK</span>
      <span className={clsx("text-[9px] font-semibold uppercase tracking-[0.16em]", walletType === "privy" ? "text-emerald-400/80" : "text-neutral-500")}>
        {walletType === "privy" ? "Gasless" : "Gasless with Privy"}
      </span>
      {walletAddress && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {walletType === "privy" ? "Privy session" : "Extension wallet"}
        </span>
      )}
    </div>
  );

  // ── wallet + network bar ──────────────────────────────────────────────────
  const WalletNetworkBar = () => (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800 bg-black/20 flex-shrink-0">
      {/* Network toggle */}
      {handleNetworkSwitch && (
        <div className="flex items-center p-0.5 rounded-md bg-black/30 border border-neutral-800 text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
          <button
            onClick={() => handleNetworkSwitch("mainnet")}
            className={clsx(
              "px-2 py-1 rounded transition-all",
              network === "mainnet" ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground"
            )}
          >Main</button>
          <button
            onClick={() => handleNetworkSwitch("sepolia")}
            className={clsx(
              "px-2 py-1 rounded transition-all",
              network === "sepolia" ? "bg-emerald-500 text-black" : "text-muted-foreground hover:text-foreground"
            )}
          >Test</button>
        </div>
      )}

      <div className="w-px h-4 bg-border/50 flex-shrink-0" />

      {/* Wallet info */}
      {walletAddress ? (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
            <span className={clsx(
              "text-[10px] font-bold uppercase tracking-wider",
              walletType === "privy" ? "text-amber-400/80" : "text-sky-400/80"
            )}>
              {walletType === "privy" ? "Privy · Gasless" : "Extension"}
            </span>
          </div>
          <span className="font-mono text-[10px] text-foreground/60 truncate">
            {walletAddress.slice(0, 10)}…{walletAddress.slice(-6)}
          </span>
          {/* Balance */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500/50" />
            {isFetchingBalance ? (
              <div className="w-10 h-3 bg-white/10 animate-pulse rounded" />
            ) : (
              <span className="text-[10px] font-mono text-foreground/70">{strkBalance ?? "—"} STRK</span>
            )}
            {fetchStrkBalance && walletAddress && (
              <button
                onClick={() => fetchStrkBalance(walletAddress)}
                className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors ml-0.5"
                title="Refresh balance"
              >
                <RefreshCw className={clsx("w-3 h-3", isFetchingBalance && "animate-spin")} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRequestWallet}
          className="h-6 px-2.5 text-[9px] font-bold uppercase tracking-wider text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/5 gap-1.5"
        >
          <Wallet className="w-3 h-3" />Connect Wallet
        </Button>
      )}
    </div>
  );

  // ── address bar ───────────────────────────────────────────────────────────
  const AddressBar = () => (
    <div className="flex-shrink-0 border-b border-neutral-800 bg-black/20">
      {effectiveAddress ? (
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {useCustomTarget ? "External Contract" : "Deployed Contract"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px] text-muted-foreground/40 hover:text-amber-400 hover:bg-transparent gap-1"
              onClick={() => setShowCustomTarget(!showCustomTarget)}
            >
              {showCustomTarget ? <X className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
              {showCustomTarget ? "Close" : "Change"}
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-foreground/70 flex-1 truncate" title={effectiveAddress}>
              {effectiveAddress.slice(0, 16)}…{effectiveAddress.slice(-8)}
            </span>
            <Tooltip>
              <TooltipTrigger>
                <button onClick={copyAddress} className="text-muted-foreground/40 hover:text-foreground/70 transition-colors p-0.5">
                  {copiedAddress ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">Copy address</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <a
                  href={`${netConfig.voyager}/contract/${effectiveAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">View on Voyager</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-500/70" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/70">No contract loaded</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[9px] text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/5 gap-1"
            onClick={() => setShowCustomTarget(true)}
          >
            <Plus className="w-2.5 h-2.5" />Load
          </Button>
        </div>
      )}

      {/* Inline load form */}
      {showCustomTarget && (
        <div className="px-3 pb-3 pt-1 border-t border-neutral-800 bg-black/10 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Load Contract</div>
          <div>
            <label className="text-[9px] text-muted-foreground/50 block mb-1">Address</label>
            <input
              value={customAddress}
              onChange={e => setCustomAddress(e.target.value)}
              placeholder="0x…"
              className="w-full bg-black/40 border border-border/50 rounded-md px-2.5 py-1.5 text-[11px] font-mono outline-none focus:border-amber-500/40 text-foreground/80 placeholder:text-muted-foreground/30 transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground/50 block mb-1">
              ABI <span className="text-muted-foreground/30">(JSON array, optional)</span>
            </label>
            <textarea
              value={customAbiText}
              onChange={e => setCustomAbiText(e.target.value)}
              placeholder={'[{"type":"function","name":"get",...}]'}
              rows={3}
              className="w-full bg-black/40 border border-border/50 rounded-md px-2.5 py-1.5 text-[10px] font-mono outline-none focus:border-amber-500/40 text-foreground/70 placeholder:text-muted-foreground/30 resize-none transition-all"
            />
            {customAbiError && <p className="text-[9px] text-red-400 mt-0.5">{customAbiError}</p>}
            {parsedCustomAbi && !customAbiError && (
              <p className="text-[9px] text-emerald-500/70 mt-0.5">✓ {parsedCustomAbi.length} entries parsed</p>
            )}
          </div>
          {recentDeployments.length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Recent</div>
              {recentDeployments.slice(0, 3).map((d: ContractHistoryItem) => (
                <button
                  key={d.id}
                  onClick={() => void loadCustomTarget(d.contractAddress, normalizeAbiEntries(d.abi))}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/40 bg-black/20 hover:border-border/70 transition-colors text-left group"
                >
                  <Box className="w-3 h-3 text-muted-foreground/30 group-hover:text-amber-500/50 flex-shrink-0 transition-colors" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] text-foreground/70 font-medium truncate">{d.name || "Contract"}</span>
                    <span className="text-[9px] font-mono text-muted-foreground/40 truncate">{d.contractAddress?.slice(0, 14)}…</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-amber-500/50 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 h-7 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400"
              disabled={!customAddress || isLoadingTarget || (!!customAbiText.trim() && !!customAbiError)}
              onClick={() => void loadCustomTarget(customAddress, parsedCustomAbi ?? undefined)}
            >
              {isLoadingTarget ? "Loading..." : "Load"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border/50"
              onClick={() => setShowCustomTarget(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tab strip */}
      <div className="flex h-8 border-t border-neutral-800 bg-black/10">
        {(["functions", "log"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={clsx(
              "flex items-center gap-1.5 px-3 h-full text-[9px] font-bold uppercase tracking-widest relative transition-colors",
              activeSubTab === tab
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-amber-500"
                : "text-muted-foreground/40 hover:text-muted-foreground/70"
            )}
          >
            {tab === "functions" ? <Zap className="w-2.5 h-2.5" /> : <Activity className="w-2.5 h-2.5" />}
            {tab}
            {tab === "log" && callLog.length > 0 && (
              <Badge className="h-3.5 px-1 text-[8px] bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/15 ml-0.5">
                {callLog.length}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ── empty state ───────────────────────────────────────────────────────────
  if (!effectiveAddress && !showCustomTarget) {
    return (
      <div className="flex flex-col h-full">
        <WalletNetworkBar />
        <InteractionMetaStrip compact />
        <AddressBar />
        <div className="flex-1 p-6">
          <div className="rounded-xl border border-neutral-800 bg-black/20 p-5">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Interface ready</p>
                <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-white">Load a contract and start calling functions</h3>
                <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-neutral-400">
                  Pull in a deployed contract address and we’ll auto-load its ABI when available. If you already deployed from this studio, you can jump back in from your recent contracts.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-9 bg-amber-500 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-black hover:bg-amber-400"
                    onClick={() => setShowCustomTarget(true)}
                  >
                    <Plus className="w-3 h-3" />Load External Contract
                  </Button>
                </div>
                <p className="mt-3 text-[10px] text-neutral-500">Paste an address only if you want to inspect an existing deployment.</p>
              </div>
            </div>

            {recentDeployments.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500">Recent deployments</div>
                <div className="grid gap-2">
                  {recentDeployments.slice(0, 3).map((deployment) => (
                    <button
                      key={deployment.id}
                      onClick={() => void loadCustomTarget(deployment.contractAddress, normalizeAbiEntries(deployment.abi))}
                      className="group flex items-center gap-3 rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-3 text-left transition-colors hover:border-amber-500/20 hover:bg-black/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-neutral-100">{deployment.name || "Contract"}</div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-neutral-500">{deployment.contractAddress}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-600 transition-colors group-hover:text-amber-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── panel layout (sidebar) ────────────────────────────────────────────────
  if (!isFullscreen) {
    return (
      <div className="flex flex-col h-full">
        <WalletNetworkBar />
        <InteractionMetaStrip compact />
        <AddressBar />
        <ScrollArea className="flex-1">
          {activeSubTab === "functions" ? (
            <div className="p-3 space-y-4">
              {externalFunctions.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-[10px] text-muted-foreground/30 font-mono italic">
                    {effectiveAbi.length === 0
                      ? "No ABI loaded — build first or paste an ABI."
                      : "No external functions in ABI."}
                  </p>
                </div>
              )}

              {viewFunctions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Read</span>
                    <div className="flex-1 h-px bg-emerald-500/10" />
                    <span className="text-[8px] text-muted-foreground/30">{viewFunctions.length}</span>
                  </div>
                  {viewFunctions.map((fn: AbiEntry) => renderFnCard(fn, true))}
                </div>
              )}

              {viewFunctions.length > 0 && writeFunctions.length > 0 && (
                <Separator className="bg-border/30" />
              )}

              {writeFunctions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/60">Write</span>
                    <div className="flex-1 h-px bg-amber-500/10" />
                    <span className="text-[8px] text-muted-foreground/30">{writeFunctions.length}</span>
                  </div>
                  {writeFunctions.map((fn: AbiEntry) => renderFnCard(fn, false))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {callLog.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] text-muted-foreground/30 font-mono italic">No calls yet.</p>
                </div>
              ) : (
                callLog.map(entry => (
                  <div key={entry.id} className="p-2.5 rounded-lg border border-neutral-800 bg-black/20 space-y-1 hover:border-neutral-700 transition-colors group">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className={clsx(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          entry.error ? "bg-red-500" : entry.confirmed ? "bg-emerald-500" : entry.txHash ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        )} />
                        <span className="text-[11px] font-mono font-medium text-foreground/75 truncate">{entry.fnName}</span>
                        <Badge className={clsx(
                          "text-[7px] px-1 py-0 h-3.5",
                          entry.type === "read"
                            ? "bg-emerald-500/8 text-emerald-500/70 border-emerald-500/15"
                            : "bg-amber-500/8 text-amber-500/70 border-amber-500/15"
                        )}>
                          {entry.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {entry.txHash && (
                          <Tooltip>
                            <TooltipTrigger>
                              <a
                                href={`${netConfig.voyager}/tx/${entry.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-0.5"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="text-[9px]">View tx on Voyager</TooltipContent>
                          </Tooltip>
                        )}
                        <CopyButton text={entry.result || entry.error || ""} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground/30">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                    {entry.result && (
                      <div className="font-mono text-[9px] text-emerald-400/60 truncate">{entry.result}</div>
                    )}
                    {entry.error && (
                      <div className="font-mono text-[9px] text-red-400/60 truncate">{entry.error.slice(0, 80)}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // ── fullscreen layout ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500">Contract Interface</span>
              {effectiveAddress && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span className="text-[7px] font-bold uppercase tracking-[0.18em] text-emerald-500/80">Live</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{activeFileName || "Unnamed Contract"}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {effectiveAddress && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-neutral-800">
              <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[180px]">{effectiveAddress}</span>
              <Tooltip>
                <TooltipTrigger>
                  <button onClick={copyAddress} className="text-muted-foreground/40 hover:text-foreground/70 transition-colors">
                    {copiedAddress ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">Copy address</TooltipContent>
              </Tooltip>
              <a href={`${netConfig.voyager}/contract/${effectiveAddress}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-amber-400 transition-colors">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className={clsx(
              "h-8 text-[10px] font-bold uppercase tracking-wider border gap-1.5",
              showCustomTarget
                ? "bg-amber-500 text-black border-amber-400 hover:bg-amber-400"
                : "border-neutral-800 text-muted-foreground hover:text-foreground hover:border-neutral-700"
            )}
            onClick={() => setShowCustomTarget(!showCustomTarget)}
          >
            {showCustomTarget ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showCustomTarget ? "Close" : "Load External"}
          </Button>
        </div>
      </div>

      {/* Wallet + Network bar (fullscreen) */}
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-black/20 border border-neutral-800">
        {/* Network */}
        {handleNetworkSwitch && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40">Network</span>
            <div className="flex items-center p-0.5 rounded-md bg-black/30 border border-neutral-800 text-[9px] font-bold uppercase tracking-wider">
              <button
                onClick={() => handleNetworkSwitch("mainnet")}
                className={clsx("px-2.5 py-1 rounded transition-all", network === "mainnet" ? "bg-amber-500 text-black" : "text-muted-foreground hover:text-foreground")}
              >Mainnet</button>
              <button
                onClick={() => handleNetworkSwitch("sepolia")}
                className={clsx("px-2.5 py-1 rounded transition-all", network === "sepolia" ? "bg-emerald-500 text-black" : "text-muted-foreground hover:text-foreground")}
              >Sepolia</button>
            </div>
          </div>
        )}

        <div className="w-px h-5 bg-border/50" />

        {/* Wallet */}
        {walletAddress ? (
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]" />
              <span className={clsx("text-[10px] font-bold uppercase tracking-wider", walletType === "privy" ? "text-amber-400/80" : "text-sky-400/80")}>
                {walletType === "privy" ? "Privy · Gasless" : "Extension Wallet"}
              </span>
              <span className="font-mono text-[11px] text-foreground/60">{walletAddress.slice(0, 14)}…{walletAddress.slice(-8)}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500/60" />
              </div>
              {isFetchingBalance ? (
                <div className="w-14 h-3.5 bg-white/10 animate-pulse rounded" />
              ) : (
                <span className="text-[12px] font-mono font-semibold text-foreground/80">{strkBalance ?? "—"} <span className="text-[10px] text-muted-foreground/50 font-normal">STRK</span></span>
              )}
              {fetchStrkBalance && (
                <button
                  onClick={() => fetchStrkBalance(walletAddress)}
                  className="p-1 rounded hover:bg-white/5 text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors"
                  title="Refresh balance"
                >
                  <RefreshCw className={clsx("w-3 h-3", isFetchingBalance && "animate-spin")} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRequestWallet}
            className="h-7 text-[10px] font-bold uppercase tracking-wider text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/5 gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5" />Connect Wallet to Execute Write Functions
          </Button>
        )}
      </div>

      <InteractionMetaStrip />

      {/* Load external form (fullscreen) */}
      {showCustomTarget && (
        <div className="mb-6 p-5 rounded-xl bg-black/30 border border-amber-500/15 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <LucideHash className="w-3 h-3" />Contract Address
              </label>
              <input
                value={customAddress}
                onChange={e => setCustomAddress(e.target.value)}
                placeholder="0x0123… (Starknet Address)"
                className="w-full bg-black/40 border border-border/50 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-amber-500/40 text-foreground/80 placeholder:text-muted-foreground/30 transition-all"
              />
              {recentDeployments.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[8px] text-muted-foreground/30 uppercase tracking-widest">Recent deployments</div>
                  {recentDeployments.slice(0, 4).map((d: ContractHistoryItem) => (
                    <button
                      key={d.id}
                      onClick={() => void loadCustomTarget(d.contractAddress, normalizeAbiEntries(d.abi))}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/20 border border-border/40 hover:border-border/70 hover:bg-black/30 transition-all group text-left"
                    >
                      <Box className="w-3 h-3 text-muted-foreground/30 group-hover:text-amber-500/60 flex-shrink-0 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-foreground/70 truncate group-hover:text-foreground/90 transition-colors">{d.name || "Contract"}</div>
                        <div className="font-mono text-[8px] text-muted-foreground/40 truncate">{d.contractAddress}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <Code2 className="w-3 h-3" />ABI (JSON Array)
              </label>
              <textarea
                value={customAbiText}
                onChange={e => setCustomAbiText(e.target.value)}
                placeholder={'[\n  {\n    "type": "function",\n    "name": "balanceOf",\n    ...\n  }\n]'}
                className="w-full h-[140px] bg-black/40 border border-border/50 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-amber-500/40 text-foreground/70 placeholder:text-muted-foreground/25 resize-none transition-all"
              />
              {customAbiError && <p className="text-[9px] text-red-400">{customAbiError}</p>}
              {parsedCustomAbi && !customAbiError && (
                <p className="text-[9px] text-emerald-500/70">✓ {parsedCustomAbi.length} ABI entries parsed</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button size="sm" variant="ghost" className="h-8 text-[10px] border border-border/50" onClick={() => setShowCustomTarget(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-8 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black hover:bg-amber-400 px-5"
              disabled={!customAddress || isLoadingTarget || (!!customAbiText.trim() && !!customAbiError)}
              onClick={() => void loadCustomTarget(customAddress, parsedCustomAbi ?? undefined)}
            >
              {isLoadingTarget ? "Loading..." : "Load Interface"}
            </Button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Read", value: viewFunctions.length, color: "text-emerald-400" },
          { label: "Write", value: writeFunctions.length, color: "text-amber-400" },
          { label: "Calls", value: callLog.length, color: "text-sky-400" },
        ].map(stat => (
          <div key={stat.label} className="px-4 py-3 rounded-lg bg-black/20 border border-neutral-800">
            <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">{stat.label}</div>
            <div className={clsx("text-xl font-bold", stat.color)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-800 mb-5">
        {(["functions", "log"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors",
              activeSubTab === tab
                ? "text-amber-500 border-amber-500"
                : "text-muted-foreground/40 border-transparent hover:text-muted-foreground/70"
            )}
          >
            {tab === "functions" ? <Zap className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
            {tab}
            {tab === "log" && callLog.length > 0 && (
              <Badge className="h-4 px-1.5 text-[8px] bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/15">
                {callLog.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSubTab === "functions" ? (
        <div className="grid grid-cols-2 gap-4">
          {viewFunctions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Read</span>
                <div className="flex-1 h-px bg-emerald-500/10" />
                <span className="text-[8px] text-muted-foreground/30">{viewFunctions.length} functions</span>
              </div>
              {viewFunctions.map((fn: AbiEntry) => renderFnCard(fn, true))}
            </div>
          )}
          {writeFunctions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/60">Write</span>
                <div className="flex-1 h-px bg-amber-500/10" />
                <span className="text-[8px] text-muted-foreground/30">{writeFunctions.length} functions</span>
              </div>
              {writeFunctions.map((fn: AbiEntry) => renderFnCard(fn, false))}
            </div>
          )}
          {externalFunctions.length === 0 && (
            <div className="col-span-2 py-16 text-center text-[11px] text-muted-foreground/30 font-mono italic">
              {effectiveAbi.length === 0 ? "No ABI loaded — build the contract first." : "No external functions in ABI."}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {callLog.length === 0 ? (
            <div className="py-16 text-center text-[11px] text-muted-foreground/30 font-mono italic">No calls yet.</div>
          ) : (
            callLog.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 p-3.5 rounded-lg border border-neutral-800 bg-black/20 hover:bg-black/30 hover:border-neutral-700 transition-all group">
                <div className={clsx(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  entry.error ? "bg-red-500" : entry.confirmed ? "bg-emerald-500" : entry.txHash ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-medium text-foreground/80">{entry.fnName}</span>
                    <Badge className={clsx(
                      "text-[8px] px-1.5",
                      entry.type === "read"
                        ? "bg-emerald-500/8 text-emerald-500/70 border-emerald-500/20"
                        : "bg-amber-500/8 text-amber-500/70 border-amber-500/20"
                    )}>
                      {entry.type}
                    </Badge>
                  </div>
                  {entry.result && <div className="text-[10px] font-mono text-emerald-400/60 truncate">{entry.result}</div>}
                  {entry.error && <div className="text-[10px] font-mono text-red-400/60 truncate">{entry.error.slice(0, 100)}</div>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground/30">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {entry.txHash && (
                      <Tooltip>
                        <TooltipTrigger>
                          <a
                            href={`${netConfig.voyager}/tx/${entry.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-1"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">View on Voyager</TooltipContent>
                      </Tooltip>
                    )}
                    <CopyButton text={entry.result || entry.error || ""} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
