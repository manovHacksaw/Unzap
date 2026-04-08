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
  Download,
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

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const groupedFunctions = useMemo(() => {
    const groups: Record<string, AbiEntry[]> = { "Main": [] };
    for (const entry of effectiveAbi) {
      if (entry.type === "function" && entry.state_mutability) {
        groups["Main"].push(entry);
      } else if ((entry.type === "impl" || entry.type === "interface") && Array.isArray(entry.items)) {
        const groupName = entry.name || "Interface";
        if (!groups[groupName]) groups[groupName] = [];
        for (const item of entry.items) {
          if (item.state_mutability) groups[groupName].push(item);
        }
      }
    }
    if (groups["Main"].length === 0) delete groups["Main"];
    return Object.entries(groups).map(([name, items]) => ({ name, items }));
  }, [effectiveAbi]);

  const toggleGroup = (name: string) => 
    setCollapsedGroups(prev => ({ ...prev, [name]: !prev[name] }));

  const allFunctions = useMemo(() => groupedFunctions.flatMap(g => g.items), [groupedFunctions]);
  const viewFunctions = allFunctions.filter((fn: AbiEntry) => fn.state_mutability === "view");
  const writeFunctions = allFunctions.filter((fn: AbiEntry) => fn.state_mutability === "external");

  const generateHooks = () => {
    const name = activeFileName?.replace(/\.cairo$/, "") || "MyContract";
    window.open(`/studio/hook-gen?address=${effectiveAddress}&name=${name}`, "_blank");
  };

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

  const handleRead = async (fn: AbiEntry) => {
    if (!provider || !effectiveAddress) return;
    const fnName = fn.name;
    setFuncLoading(prev => ({ ...prev, [fnName]: true }));
    setFuncErrors(prev => ({ ...prev, [fnName]: "" }));
    try {
      const calldata = buildCalldata(fn);
      const res = await provider.callContract({
        contractAddress: effectiveAddress,
        entrypoint: fnName,
        calldata,
      });
      const decoded = decodeOutputValue(res.result, fn.outputs?.[0]?.type || "");
      setFuncResults(prev => ({ ...prev, [fnName]: decoded }));
      addLog(`read ${fnName} success: ${decoded.decoded}`);
      setCallLog(prev => [{
        id: Math.random().toString(36).slice(2),
        fnName,
        type: "read",
        timestamp: Date.now(),
        result: decoded.decoded,
      }, ...prev]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFuncErrors(prev => ({ ...prev, [fnName]: msg }));
      addLog(`read ${fnName} failed: ${msg.slice(0, 60)}`);
    } finally {
      setFuncLoading(prev => ({ ...prev, [fnName]: false }));
    }
  };

  const handleWrite = async (fn: AbiEntry) => {
    if (!account || !effectiveAddress) {
      onRequestWallet();
      return;
    }
    const fnName = fn.name;
    setFuncLoading(prev => ({ ...prev, [fnName]: true }));
    setFuncErrors(prev => ({ ...prev, [fnName]: "" }));

    const logEntry: CallLogEntry = {
      id: Math.random().toString(36).slice(2),
      fnName,
      type: "write",
      timestamp: Date.now(),
    };

    try {
      const calldata = buildCalldata(fn);
      const isSponsored = szWallet?.mode === "sponsored" && walletType === "privy";

      const txOptions = isSponsored ? { feeMode: "sponsored" as const } : { maxFee: 0 };
      
      const res = await account.execute(
        {
          contractAddress: effectiveAddress,
          entrypoint: fnName,
          calldata,
        },
        undefined,
        txOptions as any
      );

      logEntry.txHash = res.transaction_hash;
      setCallLog(prev => [logEntry, ...prev]);

      addLog(`execute ${fnName} submitted: ${res.transaction_hash.slice(0, 10)}...`);
      notify?.({
        tone: "info",
        title: "Transaction Submitted",
        description: `Calling ${fnName}. Waiting for confirmation...`,
      });

      const receipt = await provider?.waitForTransaction(res.transaction_hash);
      
      setCallLog(prev => prev.map(entry => 
        entry.txHash === res.transaction_hash ? { ...entry, confirmed: true } : entry
      ));

      addLog(`execute ${fnName} confirmed`);
      notify?.({
        tone: "success",
        title: "Transaction Confirmed",
        description: `${fnName} has been successfully executed on-chain.`,
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

  const loadCustomTarget = async (address: string, abi?: AbiEntry[]) => {
    setIsLoadingTarget(true);
    try {
      setCustomAddress(address);
      if (abi) {
        setCustomAbiText(JSON.stringify(abi, null, 2));
      }
      setUseCustomTarget(true);
      setShowCustomTarget(false);
      addLog(`Switched target to external contract: ${address.slice(0, 10)}...`);
    } finally {
      setIsLoadingTarget(false);
    }
  };

  // ── components ──────────────────────────────────────────────────────────

  const InteractionMetaStrip = ({ compact }: { compact?: boolean }) => (
    <div className={clsx(
      "flex items-center justify-between border-b border-neutral-800 bg-black/40 backdrop-blur-md px-3 flex-shrink-0",
      compact ? "py-1.5" : "py-2.5"
    )}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30 leading-none mb-1">Fee Mode</span>
          <div className="flex items-center gap-1.5">
            {szWallet?.mode === "sponsored" ? (
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] px-1 py-0 h-4 font-bold flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> SPONSORED
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold border-neutral-700 text-neutral-500">STANDARD</Badge>
            )}
          </div>
        </div>
        <div className="w-px h-6 bg-neutral-800/50" />
        <div className="flex flex-col">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/30 leading-none mb-1">Status</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-tighter">Ready</span>
          </div>
        </div>
      </div>
      {szWallet?.mode === "sponsored" && (
        <div className="flex items-center gap-2">
          <p className="text-[9px] text-muted-foreground/40 font-medium max-w-[140px] text-right leading-tight">
            Gas costs are currently <span className="text-amber-500/80 font-bold italic underline decoration-amber-500/30 underline-offset-2">Fully Sponsored</span> by Starkzap
          </p>
        </div>
      )}
    </div>
  );

  const renderFnCard = (fn: AbiEntry, isRead: boolean) => {
    const isExpanded = expandedFns[fn.name] || false;
    const isLoading = funcLoading[fn.name] || false;
    const result = funcResults[fn.name];
    const error = funcErrors[fn.name];
    const inputs = fn.inputs ?? [];

    return (
      <div key={fn.name} className={clsx(
        "rounded-xl border transition-all duration-200 overflow-hidden",
        isExpanded ? "bg-[#0c0c0c] border-neutral-700/50 shadow-lg" : "bg-[#070707] border-neutral-800 hover:border-neutral-700"
      )}>
        {/* Header */}
        <div 
          className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none group"
          onClick={() => toggleExpand(fn.name)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              isRead ? "bg-emerald-500/50" : "bg-amber-500/50"
            )} />
            <span className="font-mono text-[12px] font-medium text-foreground/90 truncate group-hover:text-white transition-colors">{fn.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />}
            <ChevronDown className={clsx("w-3.5 h-3.5 text-muted-foreground/30 transition-transform duration-200", isExpanded && "rotate-180")} />
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-1 duration-200 border-t border-neutral-800/50 pt-3">
            {inputs.length > 0 ? (
              <div className="space-y-3">
                {inputs.map((inp) => (
                  <div key={inp.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono font-medium text-muted-foreground/60">{inp.name}</label>
                      <span className="text-[9px] font-mono text-muted-foreground/30 bg-white/5 px-1.5 py-0.5 rounded italic">{inp.type}</span>
                    </div>
                    <input
                      className="w-full bg-black/40 border border-neutral-800/50 rounded-lg px-3 py-2 text-xs font-mono text-foreground/80 outline-none focus:border-amber-500/30 focus:bg-black/60 transition-all placeholder:text-muted-foreground/20"
                      placeholder={isU256(inp.type) ? "e.g. 1000000 or 0x..." : isBool(inp.type) ? "true / false" : "Value..."}
                      value={funcInputs[fn.name]?.[inp.name] || ""}
                      onChange={(e) => setFuncInputs(prev => ({
                        ...prev,
                        [fn.name]: { ...(prev[fn.name] || {}), [inp.name]: e.target.value }
                      }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2">
                <p className="text-[10px] text-muted-foreground/40 italic font-mono">No input parameters required.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  isRead ? handleRead(fn) : handleWrite(fn);
                }}
                disabled={isLoading}
                className={clsx(
                   "h-8 px-4 text-[11px] font-bold uppercase tracking-wider transition-all",
                   isRead 
                    ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                    : "bg-amber-500 text-black hover:bg-amber-400"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>{isRead ? "Query" : "Execute"}</span>
                )}
              </Button>

              {result && (
                <div className="flex items-center gap-2 ml-4 min-w-0">
                  <span className="text-[10px] font-mono text-emerald-400/80 truncate">{result.decoded}</span>
                  <CopyButton text={result.decoded} className="h-6 w-6" />
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-mono text-red-300/80 leading-relaxed break-all">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const WalletNetworkBar = () => (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800 bg-black/20 flex-shrink-0">
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

  const AddressBar = () => (
    <div className="flex-shrink-0 border-b border-neutral-800 bg-black/20">
      {effectiveAddress ? (
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {useCustomTarget ? "External" : "Deployed"}
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
              <TooltipTrigger render={<span className="text-muted-foreground/40 hover:text-foreground/70 transition-colors p-0.5 cursor-pointer" onClick={copyAddress} />}>
                {copiedAddress ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">Copy address</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<a
                  href={`${netConfig.explorer}/contract/${effectiveAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-0.5"
                />}>
                  <ExternalLink className="w-3 h-3" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">View on Explorer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<button
                  onClick={generateHooks}
                  disabled={effectiveAbi.length === 0}
                  className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                />}>
                <Code2 className="w-3 h-3" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">Generate React Hooks</TooltipContent>
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

  if (!isFullscreen) {
    return (
      <div className="flex flex-col h-full">
        <WalletNetworkBar />
        <InteractionMetaStrip compact />
        <AddressBar />
        <ScrollArea className="flex-1">
          {activeSubTab === "functions" ? (
            <div className="p-3 space-y-4">
              {allFunctions.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-[10px] text-muted-foreground/30 font-mono italic">
                    {effectiveAbi.length === 0
                      ? "No ABI loaded — build first or paste an ABI."
                      : "No external functions in ABI."}
                  </p>
                </div>
              )}

              {groupedFunctions.map((group) => {
                const isCollapsed = collapsedGroups[group.name];
                const views = group.items.filter((f: AbiEntry) => f.state_mutability === "view");
                const writes = group.items.filter((f: AbiEntry) => f.state_mutability === "external");

                return (
                  <div key={group.name} className="space-y-4">
                    <div 
                      className="flex items-center gap-2 group cursor-pointer"
                      onClick={() => toggleGroup(group.name)}
                    >
                      <ChevronRight className={clsx("w-3 h-3 text-muted-foreground/40 transition-transform group-hover:text-amber-500/60", !isCollapsed && "rotate-90")} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 group-hover:text-amber-500/70 transition-colors">{group.name}</span>
                      <div className="flex-1 h-px bg-border/20 group-hover:bg-amber-500/10 transition-colors" />
                      <span className="text-[8px] text-muted-foreground/30 font-mono">{group.items.length}</span>
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-3">
                        {views.length > 0 && views.map((fn: AbiEntry) => renderFnCard(fn, true))}
                        {writes.length > 0 && writes.map((fn: AbiEntry) => renderFnCard(fn, false))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                            <TooltipTrigger render={<a
                                href={`${netConfig.explorer}/tx/${entry.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-0.5"
                              />}>
                                <ArrowUpRight className="w-3 h-3" />
                            </TooltipTrigger>
                            <TooltipContent className="text-[9px]">View tx on Explorer</TooltipContent>
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

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
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
                <TooltipTrigger render={<span onClick={copyAddress} className="text-muted-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer" />}>
                    {copiedAddress ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">Copy address</TooltipContent>
              </Tooltip>
              <a href={`${netConfig.explorer}/contract/${effectiveAddress}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-amber-400 transition-colors">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {effectiveAddress && effectiveAbi.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={generateHooks}
              className="h-8 text-[10px] font-bold uppercase tracking-wider border border-neutral-800 text-amber-400/70 hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/5 gap-1.5"
            >
              <Code2 className="w-3 h-3" />
              Generate Hooks
            </Button>
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

      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-black/20 border border-neutral-800">
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

      {activeSubTab === "functions" ? (
        <div className="grid grid-cols-2 gap-6">
          {groupedFunctions.map((group) => {
            const isCollapsed = collapsedGroups[group.name];
            const views = group.items.filter((f: AbiEntry) => f.state_mutability === "view");
            const writes = group.items.filter((f: AbiEntry) => f.state_mutability === "external");

            return (
              <div key={group.name} className="col-span-2 space-y-4">
                <div 
                  className="flex items-center gap-3 group cursor-pointer"
                  onClick={() => toggleGroup(group.name)}
                >
                  <ChevronRight className={clsx("w-4 h-4 text-muted-foreground/40 transition-transform group-hover:text-amber-500/60", !isCollapsed && "rotate-90")} />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/60 group-hover:text-amber-500/80 transition-colors">{group.name}</span>
                  <div className="flex-1 h-px bg-border/20 group-hover:bg-amber-500/10 transition-colors" />
                  <Badge className="bg-neutral-900 text-neutral-500 border-neutral-800 text-[10px]">{group.items.length}</Badge>
                </div>

                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {views.length > 0 && (
                       <div className="space-y-2">
                         {views.map((fn: AbiEntry) => renderFnCard(fn, true))}
                       </div>
                    )}
                    {writes.length > 0 && (
                       <div className="space-y-2">
                         {writes.map((fn: AbiEntry) => renderFnCard(fn, false))}
                       </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {allFunctions.length === 0 && (
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
                          <TooltipTrigger render={<a
                              href={`${netConfig.explorer}/tx/${entry.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground/40 hover:text-amber-400 transition-colors p-1"
                            />}>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px]">View on Explorer</TooltipContent>
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
