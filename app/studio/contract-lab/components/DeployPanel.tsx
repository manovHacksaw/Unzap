"use client";

import { clsx } from "clsx";
import {
  RefreshCw,
  X,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Activity,
  Box,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  DeployStatus,
  DeployStep,
  CompileSuccess,
  ExplorerEntry,
  BuildStatus,
  AbiEntry,
  StudioToastInput,
} from "../types";
import type { Account, WalletAccount } from "starknet";

// ── tiny helpers ──────────────────────────────────────────────────────────────

function HashValue({
  value,
  href,
  onCopy,
}: {
  value: string;
  href?: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 1800);
  };
  const short = `${value.slice(0, 10)}…${value.slice(-6)}`;
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="font-mono text-[11px] text-neutral-300">{short}</span>
      <button
        onClick={copy}
        className="p-1 rounded hover:bg-white/5 text-neutral-600 hover:text-neutral-400 transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded hover:bg-white/5 text-neutral-600 hover:text-amber-400 transition-colors"
          title="View on Explorer"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </span>
  );
}

// ── props ─────────────────────────────────────────────────────────────────────

interface DeployPanelProps {
  activeFile: ExplorerEntry | null;
  activeBuildData: CompileSuccess | null;
  buildStatus: BuildStatus;
  network: "mainnet" | "sepolia";
  netConfig: { label: string; explorer: string };
  handleNetworkSwitch: (n: "mainnet" | "sepolia") => void;
  starknetAccount: Account | WalletAccount | null;
  walletAddress: string;
  walletType: "privy" | "extension" | null;
  disconnectWallet: () => void;
  strkBalance: string | null;
  isFetchingBalance: boolean;
  fetchStrkBalance: (addr: string) => void;
  setShowAuthModal: (v: boolean) => void;
  deployStatus: DeployStatus;
  deploySteps: DeployStep[];
  classHash: string;
  contractAddress: string;
  constructorInputs: Record<string, string>;
  setConstructorInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  salt: string;
  setSalt: (v: string) => void;
  handleDeclare: () => void;
  handleDeploy: () => void;
  onReset: () => void;
  isWalletConnecting: boolean;
  notify?: (toast: StudioToastInput) => void;
  onGetStarterApp?: () => void;
}

// ── component ─────────────────────────────────────────────────────────────────

export function DeployPanel({
  activeFile,
  activeBuildData,
  buildStatus,
  network,
  netConfig,
  handleNetworkSwitch,
  starknetAccount,
  walletAddress,
  walletType,
  disconnectWallet,
  strkBalance,
  isFetchingBalance,
  fetchStrkBalance,
  setShowAuthModal,
  deployStatus,
  deploySteps,
  classHash,
  contractAddress,
  constructorInputs,
  setConstructorInputs,
  salt,
  setSalt,
  handleDeclare,
  handleDeploy,
  onReset,
  isWalletConnecting,
  notify,
  onGetStarterApp,
}: DeployPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active step
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [deploySteps]);

  const isBuilt = !!activeBuildData && buildStatus === "success";
  const isDeclared = deployStatus === "declared" || deployStatus === "deploying" || deployStatus === "deployed";
  const isDeployed = deployStatus === "deployed";
  const isBusy = deployStatus === "declaring" || deployStatus === "deploying";

  // constructor inputs from ABI
  const ctorInputs: Array<{ name: string; type: string }> =
    activeBuildData?.abi?.find((e: AbiEntry) => e.type === "constructor")?.inputs ?? [];

  // function count from ABI
  const fnCount = activeBuildData?.abi?.reduce((n: number, e: AbiEntry) => {
    if (e.state_mutability) return n + 1;
    if ((e.type === "impl" || e.type === "interface") && Array.isArray(e.items))
      return n + e.items.filter((i: AbiEntry) => !!i.state_mutability).length;
    return n;
  }, 0) ?? 0;

  const buildSizeKb = activeBuildData
    ? (JSON.stringify(activeBuildData.casm ?? {}).length / 1024).toFixed(1)
    : null;

  // next-step hint
  const nextStep = isDeployed
    ? "Contract is live on-chain"
    : isDeclared
    ? "Ready to deploy — class hash registered"
    : isBuilt
    ? "Declare contract to register class hash"
    : "Build your contract to continue";

  return (
    <ScrollArea className="h-full">
    <div ref={scrollRef} className="flex flex-col min-h-full bg-transparent">

      {/* ── Contract Header ──────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-neutral-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white truncate">
              {activeFile?.filename ?? "No file selected"}
            </p>
            <p className="text-[10px] text-neutral-600 mt-0.5">
              {walletType === "privy" ? "Privy · Gasless" : walletType === "extension" ? "Extension wallet" : "No wallet connected"}
            </p>
          </div>

          {/* Status badge */}
          <Badge className={clsx(
            "flex-shrink-0 text-[9px] font-bold uppercase tracking-wide",
            isDeployed
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
              : isDeclared
              ? "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/10"
              : isBuilt
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
              : "bg-white/5 text-muted-foreground border-neutral-800 hover:bg-white/5"
          )}>
            <span className={clsx(
              "w-1.5 h-1.5 rounded-full mr-1",
              isDeployed ? "bg-emerald-500" : isDeclared ? "bg-sky-400" : isBuilt ? "bg-amber-500" : "bg-neutral-600"
            )} />
            {isDeployed ? "Deployed" : isDeclared ? "Declared" : isBuilt ? "Built" : "Idle"}
          </Badge>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-800 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-neutral-500">Current step</div>
              <div className="mt-2 text-[14px] font-semibold tracking-tight text-white">{nextStep}</div>
            </div>


          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2.5">
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-neutral-500">Status</div>
              <div className="mt-1 text-[12px] font-semibold text-white">
                {isDeployed ? "Live" : isDeclared ? "Declared" : isBuilt ? "Ready" : "Draft"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2.5">
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-neutral-500">Functions</div>
              <div className="mt-1 text-[12px] font-semibold text-white">{fnCount || "—"}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-[#0a0a0a] px-3 py-2.5">
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-neutral-500">Artifacts</div>
              <div className="mt-1 text-[12px] font-semibold text-white">{buildSizeKb ? `${buildSizeKb} KB` : "Pending"}</div>
            </div>
          </div>
        </div>

        {/* Contract metadata — only when built */}
        {isBuilt && (
          <div className="flex items-center gap-4 mt-4">
            <div>
              <SectionLabel>ABI</SectionLabel>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">Generated</p>
            </div>
            <div className="w-px h-7 bg-neutral-800" />
            <div>
              <SectionLabel>Functions</SectionLabel>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{fnCount}</p>
            </div>
            <div className="w-px h-7 bg-neutral-800" />
            <div>
              <SectionLabel>Size</SectionLabel>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">{buildSizeKb} KB</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Environment ──────────────────────────────────────────────── */}
      <div className="px-5 py-5 space-y-4 border-b border-neutral-800">
        <SectionLabel>Environment</SectionLabel>

        {/* Network */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={clsx(
              "w-1.5 h-1.5 rounded-full",
              network === "mainnet" ? "bg-amber-500" : "bg-emerald-500"
            )} />
            <span className="text-[11px] text-neutral-300 font-medium">{netConfig.label}</span>
          </div>
          <div className="flex items-center p-0.5 rounded-lg bg-black/30 border border-neutral-800 overflow-hidden text-[9px] font-bold uppercase tracking-wider">
            <button
              onClick={() => handleNetworkSwitch("mainnet")}
              className={clsx(
                "px-2.5 py-1 rounded-md transition-all",
                network === "mainnet" ? "bg-amber-500 text-black" : "text-neutral-600 hover:text-neutral-300"
              )}
            >
              Main
            </button>
            <button
              onClick={() => handleNetworkSwitch("sepolia")}
              className={clsx(
                "px-2.5 py-1 rounded-md transition-all",
                network === "sepolia" ? "bg-emerald-500 text-black" : "text-neutral-600 hover:text-neutral-300"
              )}
            >
              Test
            </button>
          </div>
        </div>

        {/* Wallet */}
        {starknetAccount ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  <span
                    className="font-mono text-[11px] text-foreground/80 cursor-copy select-all"
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      notify?.({
                        tone: "success",
                        title: "Wallet address copied",
                        description: "The connected Starknet address is now in your clipboard.",
                      });
                    }}
                    title="Click to copy"
                  >
                    {walletAddress.slice(0, 10)}…{walletAddress.slice(-6)}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 pl-3">
                  {walletType === "privy" ? "Privy Protocol" : "External wallet"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnectWallet}
                className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                title="Disconnect"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-black/40 border border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <p className="text-[9px] text-neutral-600 uppercase tracking-wide">STRK Balance</p>
                  {isFetchingBalance ? (
                    <div className="h-3.5 w-14 bg-neutral-800 animate-pulse rounded mt-0.5" />
                  ) : (
                    <p className="text-[13px] font-mono text-white font-semibold mt-0.5">
                      {strkBalance ?? "0.00"}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchStrkBalance(walletAddress)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-700 hover:text-neutral-400 transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", isFetchingBalance && "animate-spin")} />
              </button>
            </div>

            <p className="text-[10px] text-neutral-700 leading-relaxed">
              Declare can use the studio sponsor wallet. Privy deploy and invoke can be sponsored via AVNU.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            disabled={isWalletConnecting}
            className="w-full py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWalletConnecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </div>

      {/* ── Deployment State ─────────────────────────────────────────── */}
      <div className="px-5 py-5 space-y-4 border-b border-neutral-800">
        <SectionLabel>Deployment State</SectionLabel>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-neutral-500">Class Hash</p>
            {classHash ? (
              <HashValue
                value={classHash}
                href={`${netConfig.explorer}/class/${classHash}`}
                onCopy={() =>
                  notify?.({
                    tone: "success",
                    title: "Class hash copied",
                    description: "The declared class hash is ready to share or inspect.",
                  })
                }
              />
            ) : (
              <p className="text-[11px] text-neutral-700 mt-0.5 italic">Not declared</p>
            )}
          </div>

          <div className="h-px bg-black/30" />

          <div>
            <p className="text-[10px] text-neutral-500">Contract Address</p>
            {contractAddress ? (
              <HashValue
                value={contractAddress}
                href={`${netConfig.explorer}/contract/${contractAddress}`}
                onCopy={() =>
                  notify?.({
                    tone: "success",
                    title: "Contract address copied",
                    description: "The deployed contract address is now in your clipboard.",
                  })
                }
              />
            ) : (
              <p className="text-[11px] text-neutral-700 mt-0.5 italic">Not deployed</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Constructor Inputs ───────────────────────────────────────── */}
      {isBuilt && (ctorInputs.length > 0 || !isDeployed) && (
        <div className="px-5 py-5 space-y-3 border-b border-neutral-800 bg-neutral-900/10">
          <SectionLabel>Constructor & Salt</SectionLabel>
          
          {ctorInputs.length > 0 && (
            <div className="space-y-4 mb-4">
              {ctorInputs.map((inp) => (
                <div key={inp.name}>
                  <label className="text-[9px] font-mono text-neutral-600">
                    {inp.name}{" "}
                    <span className="text-neutral-700">{inp.type}</span>
                  </label>
                  <input
                    value={constructorInputs[inp.name] ?? ""}
                    onChange={(e) =>
                      setConstructorInputs((prev) => ({ ...prev, [inp.name]: e.target.value }))
                    }
                    placeholder="0x… or decimal"
                    className="w-full mt-1 bg-transparent border-b border-border/60 py-1.5 text-[11px] font-mono outline-none focus:border-amber-500/50 text-neutral-300 placeholder:text-neutral-800 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          {!isDeployed && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-mono text-neutral-600">
                  salt <span className="text-neutral-700">felt252</span>
                </label>
                <button
                  onClick={() => setSalt(Math.floor(Math.random() * 1_000_000).toString())}
                  className="p-1 hover:text-amber-500 transition-colors text-neutral-700"
                  title="Randomize salt"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              </div>
              <input
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                placeholder="0"
                className="w-full mt-1 bg-transparent border-b border-border/60 py-1.5 text-[11px] font-mono outline-none focus:border-amber-500/50 text-neutral-300 placeholder:text-neutral-800 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Execution Pipeline ───────────────────────────────────────── */}
      {deploySteps.length > 0 && (
        <div className="px-5 py-5 border-b border-neutral-800">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-3 h-3 text-neutral-600" />
            <SectionLabel>Pipeline</SectionLabel>
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {deploySteps.map((step, index) => {
                const isActive = step.status === "active";
                const isLast = index === deploySteps.length - 1;
                
                return (
                  <motion.div
                    key={step.id}
                    ref={isActive ? activeStepRef : null}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                    }}
                    className={clsx(
                      "group relative flex gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                      isActive ? "bg-neutral-800/30 border border-neutral-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]" : "border border-transparent"
                    )}
                  >
                    {/* Circle & Line Column */}
                    <div className="relative flex flex-col items-center shrink-0 w-4">
                      {!isLast && (
                        <div className="absolute top-6 bottom-[-16px] w-px bg-neutral-800/50" />
                      )}
                      <div className={clsx(
                        "relative top-1 w-3.5 h-3.5 rounded-full border-2 border-black/60 transition-all duration-500 z-10",
                        step.status === "done"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          : isActive
                          ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                          : step.status === "error"
                          ? "bg-red-500"
                          : "bg-neutral-800"
                      )}>
                        {isActive && (
                          <motion.div 
                            className="absolute inset-0 rounded-full bg-amber-500"
                            animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* Content Column */}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <p className={clsx(
                        "text-[11px] font-bold tracking-tight transition-colors",
                        step.status === "idle" ? "text-neutral-700" : isActive ? "text-white" : "text-neutral-400"
                      )}>
                        {step.label}
                      </p>
                      
                      {step.detail && (
                        <motion.p 
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[9px] font-mono text-neutral-500 bg-black/40 px-2 py-0.5 rounded border border-neutral-800/50 w-fit"
                        >
                          {step.detail}
                        </motion.p>
                      )}
                      
                      {step.status === "error" && !step.detail && (
                        <p className="text-[9px] font-medium text-red-500/80 leading-relaxed mt-1">
                          Step failed. Check the terminal for details.
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <motion.div
                        layoutId="active-glow"
                        className="absolute inset-0 rounded-xl bg-amber-500/[0.02] pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-8 space-y-3 mt-auto">
        {/* Next step hint */}
        <div className="flex items-center gap-1.5 mb-1">
          <ChevronRight className="w-3 h-3 text-neutral-700 flex-shrink-0" />
          <p className="text-[10px] text-neutral-600">{nextStep}</p>
        </div>

        {/* Not declared: primary = Declare, secondary = Deploy (disabled) */}
        {!isDeclared && !isBusy && (
          <>
            <button
              onClick={handleDeclare}
              disabled={!isBuilt || !starknetAccount}
              className={clsx(
                "w-full py-3 rounded-xl text-[12px] font-bold tracking-wide transition-all flex items-center justify-center gap-2",
                isBuilt && starknetAccount
                  ? "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.2)] hover:shadow-[0_0_32px_rgba(245,158,11,0.3)]"
                  : "bg-white/5 text-muted-foreground cursor-not-allowed"
              )}
            >
              <Box className="w-4 h-4" />
              Declare Contract
            </button>
            <button
              disabled
              title="Declare first to get class hash"
              className="w-full py-2.5 rounded-xl text-[11px] font-semibold text-neutral-700 bg-black/20 border border-border/40 cursor-not-allowed flex items-center justify-center gap-2"
            >
              Deploy
              <span className="text-[9px] text-neutral-800 font-normal">· declare first</span>
            </button>
          </>
        )}

        {/* Declaring in progress */}
        {deployStatus === "declaring" && (
          <button
            disabled
            className="w-full py-3 rounded-xl text-[12px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Declaring…
          </button>
        )}

        {/* Declared: primary = Deploy, secondary = Re-declare */}
        {deployStatus === "declared" && (
          <>
            <button
              onClick={handleDeploy}
              disabled={isWalletConnecting}
              className="w-full py-3 rounded-xl text-[12px] font-bold tracking-wide transition-all flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-100 shadow-[0_0_24px_rgba(255,255,255,0.08)] hover:shadow-[0_0_32px_rgba(255,255,255,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              Deploy Contract
            </button>
            <button
              onClick={onReset}
              className="w-full py-2.5 rounded-xl text-[11px] font-semibold text-neutral-600 hover:text-neutral-400 bg-transparent border border-border/50 hover:border-neutral-700 transition-all flex items-center justify-center gap-1.5"
            >
              Re-declare
            </button>
          </>
        )}

        {/* Deploying in progress */}
        {deployStatus === "deploying" && (
          <button
            disabled
            className="w-full py-3 rounded-xl text-[12px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Deploying…
          </button>
        )}

        {/* Deployed */}
        {deployStatus === "deployed" && (
          <>
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              Deployed
            </div>

            {/* Starter app CTA */}
            {contractAddress && activeBuildData?.abi && (
              <button
                onClick={() => onGetStarterApp?.()}
                className="w-full py-3 rounded-xl text-[12px] font-bold tracking-wide transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-[0_0_24px_rgba(139,92,246,0.2)] hover:shadow-[0_0_32px_rgba(139,92,246,0.35)]"
              >
                <Sparkles className="w-4 h-4" />
                Get Starter App
              </button>
            )}

            <button
              onClick={onReset}
              className="w-full py-2.5 rounded-xl text-[11px] font-semibold text-neutral-600 hover:text-neutral-400 bg-transparent border border-border/50 hover:border-neutral-700 transition-all"
            >
              Reset & Redeploy
            </button>
          </>
        )}
      </div>
    </div>
    </ScrollArea>
  );
}
