"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { StarkZap } from "starkzap";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import { type ProviderInterface } from "starknet";
import {
  Files,
  Settings,
  Search,
  Box,
  History,
  ChevronDown,
  Copy,
  FileCode,
  Activity,
  Zap,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  FilePlus,
  XCircle,
  Terminal,
  TestTube,
  Play,
  Loader2,
  Layout,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

// Contract Lab Components
import { CopyButton } from "./components/CopyButton";
import { ActivityIcon } from "./components/ActivityIcon";
import { ContextMenuButton } from "./components/ContextMenuButton";
import { PanelHeader } from "./components/PanelHeader";
import { DiagnosticCard } from "./components/DiagnosticCard";
import { HistoryDeploymentCard } from "./components/HistoryDeploymentCard";
import { AuthModal } from "./components/AuthModal";
import { AccountModal } from "./components/AccountModal";
import { DeployAccountPrompt } from "./components/DeployAccountPrompt";
import { SettingsPanel } from "./components/SettingsPanel";
import { InteractPanel } from "./components/InteractPanel";
import { DeployPanel } from "./components/DeployPanel";
import { ToastViewport } from "./components/ToastViewport";
import { Editor } from "./components/Editor";
import { StatusBar } from "./components/StatusBar";

// Hooks
import { useIdeTerminal } from "./hooks/useIdeTerminal";
import { useToasts } from "./hooks/useToasts";
import { useFileExplorer } from "./hooks/useFileExplorer";
import { useCairoCompiler } from "./hooks/useCairoCompiler";
import { useWallet } from "./hooks/useWallet";
import { useContractDeploy } from "./hooks/useContractDeploy";
import { useHistory } from "./hooks/useHistory";
import { useDraftPersistence } from "./hooks/useDraftPersistence";
import { useLayoutResize } from "./hooks/useLayoutResize";
import { CursorProvider } from "./context/CursorContext";

// Utils & Consts
import {
  formatProblemsForCopy,
  normalizeAbiEntries,
} from "./utils";
import { CONTRACT_TEMPLATES } from "./templates";
import {
  INITIAL_FILES,
  type ContractHistoryItem,
  type TransactionHistoryItem,
  type AbiEntry,
  type BuildStatus,
  type CompileSuccess,
} from "./types";

const sidebarTitleMap: Record<string, string> = {
  explorer: "Explorer",
  search: "Search",
  history: "History",
  interact: "Interact",
};

export default function StarkzapIDE() {
  // ── 1. GLOBAL CONTEXTS & REFS ──
  const { ready: privyReady, authenticated, getAccessToken, login, logout } = usePrivy();
  const { network, setNetwork } = useNetwork();
  const netConfig = useMemo(() => getNetworkConfig(network), [network]);
  const sdkRef = useRef<StarkZap | null>(null);
  const router = useRouter();

  useEffect(() => {
    sdkRef.current = new StarkZap({
      network: netConfig.network,
      paymaster: { headers: { "x-paymaster-api-key": process.env.NEXT_PUBLIC_AVNU_API_KEY ?? "" } },
    });
  }, [netConfig.network]);

  const centerPaneRef = useRef<HTMLDivElement>(null);

  // ── 2. CORE STATE (SHARED ACROSS HOOKS) ──
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState(INITIAL_FILES[0].id);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [buildOutputsByFile, setBuildOutputsByFile] = useState<Record<string, CompileSuccess>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ── 3. DOMAIN HOOKS ──
  const terminal = useIdeTerminal();
  const toasts = useToasts();
  const layout = useLayoutResize(centerPaneRef);

  const persistence = useDraftPersistence({
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    buildOutputsByFile,
    setBuildOutputsByFile,
    setBuildStatus,
    addLog: terminal.addLog,
  });

  const explorer = useFileExplorer({
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    buildOutputsByFile,
    settings: persistence.settings,
    addLog: terminal.addLog,
    pushToast: toasts.pushToast,
  });

  const wallet = useWallet({
    network,
    sdkRef,
    privyReady,
    authenticated,
    getAccessToken,
    login,
    logout,
    addLog: terminal.addLog,
    pushToast: toasts.pushToast,
  });

  const history = useHistory({
    privyReady,
    authenticated,
    getAccessToken,
  });

  const [activeBottomTab, setActiveBottomTab] = useState("terminal");
  const [activeSidebarTab, setActiveSidebarTab] = useState("explorer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeInteractFn, setActiveInteractFn] = useState<string | null>(null);
  const [showDeployAccountPrompt, setShowDeployAccountPrompt] = useState(false);

  const compiler = useCairoCompiler({
    activeSourceFile: explorer.activeSourceFile,
    buildStatus,
    setBuildStatus,
    buildOutputsByFile,
    setBuildOutputsByFile,
    addLog: terminal.addLog,
    pushToast: toasts.pushToast,
    setActiveBottomTab,
    setFiles,
  });

  const deploy = useContractDeploy({
    network,
    netConfig,
    sdkRef,
    activeBuildData: explorer.activeBuildData,
    activeSourceFile: explorer.activeSourceFile,
    activeFile: explorer.activeFile,
    starknetAccount: wallet.starknetAccount,
    szWallet: wallet.szWallet,
    walletAddress: wallet.walletAddress,
    walletType: wallet.walletType,
    addLog: terminal.addLog,
    pushToast: toasts.pushToast,
    logTransaction: history.logTransaction,
    logDeployment: history.logDeployment,
    setShowAuthModal: wallet.setShowAuthModal,
    setShowDeployAccountPrompt,
    readStrkBalance: wallet.readStrkBalance,
    formatStrkAmount: wallet.formatStrkAmount,
    setStrkBalance: wallet.setStrkBalance,
    fetchStrkBalance: wallet.fetchStrkBalance,
    setActiveSidebarTab,
    setIsSidebarOpen,
    setActiveInteractFn,
    getAccessToken,
  });

  // ── 4. DERIVED UI STATE ──
  const accentColor = useMemo(() => {
    switch (persistence.settings.theme) {
      case "emerald": return "text-emerald-500";
      case "azure": return "text-sky-400";
      case "mono": return "text-white";
      default: return "text-amber-500";
    }
  }, [persistence.settings.theme]);

  const accentBg = useMemo(() => {
    switch (persistence.settings.theme) {
      case "emerald": return "bg-emerald-500";
      case "azure": return "bg-sky-500";
      case "mono": return "bg-white";
      default: return "bg-amber-500";
    }
  }, [persistence.settings.theme]);

  const interactFunctions = useMemo(() => {
    const firstH = history.history.deployments[0];
    const interactAbi: AbiEntry[] = explorer.activeBuildData?.abi ?? (typeof firstH?.abi === 'string' ? JSON.parse(firstH.abi) : []) ?? [];
    const fns: AbiEntry[] = [];
    for (const entry of interactAbi) {
      if (entry.type === "function" && entry.state_mutability) fns.push(entry);
      else if ((entry.type === "impl" || entry.type === "interface") && Array.isArray(entry.items)) { 
        for (const item of (entry.items as AbiEntry[]) || []) { 
          if (item.state_mutability) fns.push(item); 
        } 
      }
    }
    const allFns = fns.filter((fn, i, arr) => arr.findIndex(f => f.name === fn.name) === i);
    return {
      all: allFns,
      view: allFns.filter(f => f.state_mutability === "view"),
      write: allFns.filter(f => f.state_mutability === "external" || f.state_mutability === "external_v0"),
    };
  }, [explorer.activeBuildData, history.history.deployments]);


  const workspaceSignals = useMemo(() => [
    { label: "Network", value: netConfig.label, tone: network === "mainnet" ? "amber" : "sky" },
    { label: "Wallet", value: wallet.walletAddress ? `${wallet.walletType === "privy" ? "Privy" : "Ext"} · ${wallet.walletAddress.slice(0, 6)}` : "No Wallet", tone: wallet.walletAddress ? "emerald" : "neutral" },
    { label: "State", value: buildStatus === "idle" ? "Build Required" : buildStatus === "building" ? "Compiling..." : buildStatus === "success" ? "Ready" : "Fix Errors", tone: buildStatus === "success" ? "emerald" : buildStatus === "building" ? "amber" : "sky" },
  ], [netConfig.label, network, wallet.walletAddress, wallet.walletType, buildStatus]);

  const diagnosticLineMap = useMemo(() => {
    const map = new Map<number, "error" | "warning">();
    compiler.errors.forEach((e) => { if (e.line > 0) map.set(e.line, "error"); });
    explorer.liveDiagnostics.forEach((d) => { if (d.line > 0 && !map.has(d.line)) map.set(d.line, d.severity === "warning" ? "warning" : "error"); });
    return map;
  }, [compiler.errors, explorer.liveDiagnostics]);

  const handleNetworkSwitch = useCallback((net: "mainnet" | "sepolia") => {
    setNetwork(net);
    wallet.resetWalletState();
    deploy.resetDeployState();
    terminal.addLog(`Switched network to ${net}. Wallet and deployment state cleared.`);
  }, [deploy, setNetwork, terminal, wallet]);

  const renderLogLine = (log: string) => {
    const isError = /error|fail|failed|rejected/i.test(log);
    const isSuccess = /success|confirmed|deployed|verified/i.test(log);
    
    const patterns = [{ regex: /(0x[a-fA-F0-0]{60,66})/g, type: "hash" }, { regex: /(https?:\/\/[^\s]+)/g, type: "url" }, { regex: /'([^']+)'/g, type: "string" }];
    let parts: { text: string; type?: string }[] = [{ text: log }];
    patterns.forEach((p) => {
      const nextParts: typeof parts = [];
      parts.forEach((part) => {
        if (part.type) { nextParts.push(part); return; }
        const segments = part.text.split(p.regex);
        segments.forEach((seg, i) => { if (i % 2 === 1) nextParts.push({ text: seg, type: p.type }); else if (seg) nextParts.push({ text: seg }); });
      });
      parts = nextParts;
    });

    const content = parts.map((p, i) => {
      if (p.type === "hash") return <span key={i} className="text-amber-500/90 font-bold">{p.text}</span>;
      if (p.type === "url") return <a key={i} href={p.text} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 font-medium">{p.text}</a>;
      if (p.type === "string") return <span key={i} className="text-emerald-400/80">\'{p.text.slice(1, -1)}\'</span>;
      return p.text;
    });

    return (
      <span className={clsx(
        isError ? "text-red-400/90" : isSuccess ? "text-emerald-400/90" : "text-neutral-400"
      )}>
        {content}
      </span>
    );
  };

  const handleGenerateApp = useCallback(() => {
    const address = deploy.contractAddress;
    if (!address) return;

    // Look up deployment ID from history (preferred — gives a clean URL)
    const matched = history.history.deployments.find(
      (d) => d.contractAddress.toLowerCase() === address.toLowerCase()
    );
    if (matched?.id) {
      router.push(`/deployments/${matched.id}`);
      return;
    }

    // Fallback: use address directly via the deployments list page
    router.push("/deployments");
  }, [deploy.contractAddress, history.history.deployments, router]);

  const renderSidebarActions = () => {
    if (activeSidebarTab === "explorer") return <button onClick={explorer.createFile} className="p-1 hover:bg-neutral-800 rounded transition-colors text-neutral-600 hover:text-neutral-300"><FilePlus className="w-3.5 h-3.5" /></button>;
    if (activeSidebarTab === "history") return <button onClick={() => { history.setHistory({ deployments: [], transactions: [] }); toasts.pushToast({ tone: "info", title: "History cleared", description: "Local history was wiped." }); }} className="p-1 hover:text-white transition-colors" title="Clear history"><RefreshCw className="w-2.5 h-2.5" /></button>;
    return null;
  };

  // ── 5. RENDER ──
  return (
    <TooltipProvider delayDuration={200}>
      <CursorProvider>
      <div className="flex flex-col h-screen min-h-0 bg-[#050505] text-neutral-400 font-sans overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-800 bg-black/40 backdrop-blur-xl flex-shrink-0 z-20 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-700" />
            <div className="w-3 h-3 rounded-full bg-neutral-600" />
            <div className={clsx("w-3 h-3 rounded-full opacity-70", accentBg)} />
          </div>
          <div className="w-px h-4 bg-neutral-800" />
          <div className="flex items-center gap-3 min-w-0">
            <TestTube className={clsx("w-3.5 h-3.5", accentColor)} />
            <div className="text-sm font-semibold text-foreground/90">Contract Lab</div>
          </div>
          <div className="hidden xl:flex items-center gap-4 min-w-0">
            {workspaceSignals.map((signal) => (
              <div key={signal.label} className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em]">
                <span className="text-neutral-600">{signal.label}</span>
                <span className={clsx(signal.tone === "amber" ? "text-amber-300" : signal.tone === "emerald" ? "text-emerald-300" : signal.tone === "sky" ? "text-sky-300" : "text-neutral-300")}>{signal.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2 hover:bg-white/10 text-foreground/70 hover:text-foreground" onClick={compiler.handleBuild} disabled={buildStatus === "building"}>
            {buildStatus === "building" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Build
          </Button>
          {buildStatus === "success" && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15"><CheckCircle2 className="w-3 h-3 mr-1" />Build Success</Badge>}
          {buildStatus === "error" && <Badge className="bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/15"><XCircle className="w-3 h-3 mr-1" />Build Failed</Badge>}
          {buildStatus === "building" && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/15"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5 inline-block" />Building</Badge>}
          <div className="w-px h-4 bg-neutral-800 mx-1" />
          {deploy.contractAddress ? (
            <Button
              size="sm"
              onClick={handleGenerateApp}
              className="gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 hover:text-amber-300 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate App
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              className="gap-1.5 bg-neutral-800/40 text-neutral-600 border border-neutral-800 cursor-not-allowed"
              title="Deploy a contract first"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate App
            </Button>
          )}
          <div className="w-px h-4 bg-neutral-800 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-foreground/50 hover:text-foreground" onClick={() => setIsSettingsOpen(true)}><Settings className="w-4 h-4" /></Button>
        </div>
      </div>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={persistence.settings} updateSetting={persistence.updateSetting} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── ACTIVITY BAR ── */}
        <div className="flex flex-col items-center w-12 border-r border-neutral-800 bg-black/20 backdrop-blur-sm py-4 gap-4 flex-shrink-0">
          <ActivityIcon label="Explorer" icon={Files} active={activeSidebarTab === "explorer"} onClick={() => { setActiveSidebarTab("explorer"); setIsSidebarOpen(true); setIsRightPanelOpen(true); }} />
          <ActivityIcon label="Interact" icon={Zap} active={activeSidebarTab === "interact"} onClick={() => { setActiveSidebarTab("interact"); setIsSidebarOpen(true); }} />
          <ActivityIcon label="Search" icon={Search} active={activeSidebarTab === "search"} onClick={() => { setActiveSidebarTab("search"); setIsSidebarOpen(true); setIsRightPanelOpen(true); }} />
          <ActivityIcon label="History" icon={History} active={activeSidebarTab === "history"} onClick={() => { setActiveSidebarTab("history"); setIsSidebarOpen(true); setIsRightPanelOpen(true); }} />
          <div className="flex-1" />
          <ActivityIcon label={isRightPanelOpen ? "Hide deploy panel" : "Show deploy panel"} icon={Layout} active={isRightPanelOpen} onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} />
        </div>

        {/* ── LEFT SIDEBAR ── */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex flex-col h-full min-h-0 border-r border-neutral-800 bg-black/20 backdrop-blur-sm overflow-hidden flex-shrink-0">
              <PanelHeader title={sidebarTitleMap[activeSidebarTab] ?? activeSidebarTab}>
                {renderSidebarActions()}
              </PanelHeader>
              <div className="flex-1 min-h-0 overflow-y-auto" onContextMenu={(e) => explorer.openContextMenu(e, null)}>
                {activeSidebarTab === "explorer" && (
                  <div className="py-2">
                    <div onClick={() => toggleSection('src')} className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02] select-none">
                      <ChevronDown className={clsx("w-3 h-3 transition-transform", collapsedSections['src'] && "-rotate-90")} />
                      src
                    </div>
                    {!collapsedSections['src'] && (
                      <div>
                        {explorer.sourceFiles.map((f) => (
                          <div key={f.id} onClick={() => explorer.setActiveFileId(f.id)} onContextMenu={(e) => explorer.openContextMenu(e, f.id)} className={clsx("group w-full flex items-center gap-2 px-6 py-1 text-xs transition-colors cursor-pointer relative", explorer.activeFileId === f.id ? clsx(persistence.settings.theme === 'mono' ? "bg-white/10 text-white" : `${accentBg}/10 ${accentColor}`) : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300")}>
                            <Zap className={clsx("w-3.5 h-3.5 flex-shrink-0", explorer.activeFileId === f.id ? `${accentColor} ${persistence.settings.theme !== 'mono' ? 'fill-current' : ''}` : "text-neutral-700 group-hover:text-neutral-500")} />
                            {explorer.editingFileId === f.id ? (
                              <input autoFocus value={explorer.renameValue} onChange={(e) => explorer.setRenameValue(e.target.value)} onBlur={explorer.confirmRename} onKeyDown={(e) => e.key === "Enter" && explorer.confirmRename()} className="bg-neutral-900 border border-amber-500/50 outline-none px-1 rounded text-neutral-200 w-full" />
                            ) : (
                              <span className="truncate">{f.filename}</span>
                            )}
                            {!explorer.editingFileId && (
                              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => explorer.startRename(e, f)} className="p-0.5 hover:text-white"><Edit2 className="w-2.5 h-2.5" /></button>
                                <button onClick={(e) => explorer.deleteFile(e, f.id)} className="p-0.5 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                        {explorer.sourceFiles.length === 0 && <div className="px-6 py-2 text-[10px] text-neutral-600 italic">No Cairo files yet.</div>}
                      </div>
                    )}

                    <div className="mt-4">
                      <div onClick={() => toggleSection('templates')} className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02] select-none">
                        <ChevronDown className={clsx("w-3 h-3 transition-transform", collapsedSections['templates'] && "-rotate-90")} />
                        starter templates
                      </div>
                      {!collapsedSections['templates'] && (
                        <div className="space-y-0.5">
                          {CONTRACT_TEMPLATES.map((t: (typeof CONTRACT_TEMPLATES)[0]) => (
                            <div key={t.id} onClick={() => explorer.handleLoadTemplate(t)} className="group w-full flex items-center gap-2 px-6 py-1.5 text-[11px] transition-colors cursor-pointer text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300">
                              <FileCode className={clsx("w-3 h-3 flex-shrink-0 text-neutral-700 group-hover:text-amber-500/50")} />
                              <span className="truncate text-neutral-400 group-hover:text-neutral-200 transition-colors font-medium">{t.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <div onClick={() => toggleSection('artifacts')} className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02] select-none">
                        <ChevronDown className={clsx("w-3 h-3 transition-transform", collapsedSections['artifacts'] && "-rotate-90")} />
                        artifacts
                      </div>
                      {!collapsedSections['artifacts'] && (
                        <div>
                          {explorer.artifactFiles.length > 0 ? (
                            explorer.artifactFiles.map((f) => (
                              <div key={f.id} onClick={() => explorer.setActiveFileId(f.id)} className={clsx("group w-full flex items-center gap-2 px-6 py-1 text-xs transition-colors cursor-pointer relative", explorer.activeFileId === f.id ? "bg-sky-500/10 text-sky-300" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300")}>
                                <Box className={clsx("w-3.5 h-3.5 flex-shrink-0 transition-colors", explorer.activeFileId === f.id ? "text-sky-400" : "text-neutral-700 group-hover:text-neutral-500")} />
                                <span className="truncate">{f.filename}</span>
                              </div>
                            ))
                          ) : persistence.isDraftHydrating ? (
                            <div className="px-6 py-2 space-y-2">
                              {[0, 1, 2].map((item) => (
                                <div key={`artifact-skeleton-${item}`} className="flex items-center gap-2 py-1.5"><div className="h-3.5 w-3.5 rounded bg-neutral-900 animate-pulse" /><div className="h-3 w-full max-w-[150px] rounded bg-neutral-900 animate-pulse" /></div>
                              ))}
                            </div>
                          ) : (
                            <div className="mx-4 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Saved in Browser</div>
                              <div className="mt-2 text-[10px] leading-relaxed text-neutral-600">Files and build artifacts are stored in this browser.</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeSidebarTab === "explorer" && authenticated && history.history.deployments.length > 0 && (
                  <div className="mt-4 border-t border-neutral-900 pt-4 px-2 pb-6">
                    <div onClick={() => toggleSection('deployments')} className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02] select-none">
                      <ChevronDown className={clsx("w-3 h-3 transition-transform", collapsedSections['deployments'] && "-rotate-90")} />
                      recent deployments
                    </div>
                    {!collapsedSections['deployments'] && (
                      <div>
                        {history.history.deployments.map((d: ContractHistoryItem) => (
                          <div key={d.id} onClick={() => {
                            window.open(`/deployments/${d.id}`, "_blank");
                          }} className="group w-full flex items-center gap-2 px-6 py-1.5 text-[11px] transition-colors cursor-pointer text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300">
                            <Box className="w-3 h-3 flex-shrink-0 text-neutral-700 group-hover:text-amber-500/50" />
                            <div className="flex flex-col truncate"><span className="truncate text-neutral-300 font-medium">{d.name || "Contract"}</span><span className="text-[9px] font-mono text-neutral-600 truncate">{d.contractAddress.slice(0, 10)}...</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeSidebarTab === "search" && (
                  <div className="p-3 space-y-5">
                    <div className="space-y-2">
                       <div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Search In Current File</div><div className="text-[10px] font-mono text-neutral-700">{explorer.codeSearchMatches.length} matches</div></div>
                       <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"><input value={explorer.codeSearchQuery} onChange={(e) => explorer.setCodeSearchQuery(e.target.value)} placeholder={`Search in ${explorer.activeFile?.filename || "file"}`} className="w-full bg-transparent text-[12px] text-neutral-300 outline-none placeholder:text-neutral-700" /></div>
                       <div className="max-h-[280px] space-y-1 overflow-y-auto">
                        {explorer.codeSearchQuery.trim() ? (explorer.codeSearchMatches.length > 0 ? explorer.codeSearchMatches.map((match) => (<button key={`match-${match.index}`} onClick={() => jumpToLineCol(match.line, match.col)} className="w-full rounded border border-neutral-800 bg-black/20 px-3 py-2 text-left transition-colors hover:border-neutral-700 hover:bg-white/[0.03]"><div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Line {match.line}:{match.col}</div><div className="mt-1 truncate text-[11px] text-neutral-300">{match.preview}</div></button>)) : <div className="px-2 py-2 text-[10px] font-mono text-neutral-700">No matches.</div>) : <div className="px-2 py-2 text-[10px] font-mono text-neutral-700">Type to search.</div>}
                       </div>
                    </div>
                  </div>
                )}
                {activeSidebarTab === "history" && (
                  <div className="p-4 overflow-y-auto h-full no-scrollbar space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4"><div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent Deployments</div><Zap className="w-2.5 h-2.5 text-neutral-800" /></div>
                      {history.history.deployments.length === 0 ? <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">No deployments found.</div> : (
                        <div className="space-y-2">{history.history.deployments.map((d: ContractHistoryItem) => (<HistoryDeploymentCard key={d.id} deployment={d} onInteract={() => { const restoredAbi = normalizeAbiEntries(d.abi); deploy.setContractAddress(d.contractAddress); deploy.setClassHash(d.classHash); deploy.setDeployStatus("deployed"); deploy.setDeploySteps([]); deploy.setConstructorInputs({}); setActiveSidebarTab("interact"); setIsSidebarOpen(true); terminal.addLog(`[history] Restored: ${d.contractAddress.slice(0, 10)}...`); toasts.pushToast({ tone: "info", title: "Interface restored", description: "Ready." }); }} onGenerateApp={() => { window.open(`/deployments/${d.id}`, "_blank"); }} />))}</div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-4"><div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent Transactions</div><button onClick={() => { history.setHistory({ deployments: [], transactions: [] }); toasts.pushToast({ tone: "info", title: "History cleared", description: "Wiped." }); }} className="p-1 hover:text-white transition-colors"><RefreshCw className="w-2.5 h-2.5" /></button></div>
                      {history.history.transactions.length === 0 ? <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">No transactions.</div> : (
                        <div className="space-y-2">{history.history.transactions.map((tx: TransactionHistoryItem) => (
                          <div key={tx.id} className="p-2.5 rounded border border-neutral-800 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-neutral-300 uppercase">{tx.type}</span>
                              <span className="text-[9px] text-neutral-700">{new Date(tx.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[9px] font-mono text-neutral-600 truncate mb-1.5">{tx.hash}</div>
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger render={<span className="text-muted-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer" />}>
                                    <Copy className="w-3 h-3" />
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px]">Copy hash</TooltipContent>
                              </Tooltip>
                              <a href={`${netConfig.explorer}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors">View ↗</a>
                            </div>
                          </div>
                        ))}</div>
                      )}
                    </div>
                  </div>
                )}
                {activeSidebarTab === "interact" && (
                  <div className="p-3 space-y-1 overflow-y-auto h-full no-scrollbar">
                    {(() => {
                      const { view: viewFns, write: writeFns, all: allFns } = interactFunctions;
                      if (allFns.length === 0) return <div className="flex flex-col items-center justify-center py-12 text-[10px] text-neutral-600 text-center"><Zap className="w-6 h-6 mb-3 text-neutral-700" />Deploy a contract first.</div>;
                      return (
                        <>
                          {deploy.contractAddress && <div className="mb-3 px-2 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800"><div className="text-[9px] font-bold uppercase text-neutral-600 mb-1">Deployed</div><div className="text-[10px] font-mono text-amber-400 truncate">{deploy.contractAddress.slice(0, 20)}…</div></div>}
                          {viewFns.length > 0 && <div className="mb-2"><div className="px-2 py-1.5 text-[9px] font-black uppercase text-neutral-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />View ({viewFns.length})</div>{viewFns.map(fn => <button key={fn.name} onClick={() => setActiveInteractFn(fn.name)} className={clsx("w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all", activeInteractFn === fn.name ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent")}>{fn.name}</button>)}</div>}
                          {writeFns.length > 0 && <div><div className="px-2 py-1.5 text-[9px] font-black uppercase text-neutral-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" />Write ({writeFns.length})</div>{writeFns.map(fn => <button key={fn.name} onClick={() => setActiveInteractFn(fn.name)} className={clsx("w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all", activeInteractFn === fn.name ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent")}>{fn.name}</button>)}</div>}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {explorer.contextMenu && (
          <div className="fixed z-50 min-w-[180px] rounded-lg border border-border/60 bg-black/80 backdrop-blur-xl p-1 shadow-[0_16px_40px_rgba(0,0,0,0.7)]" style={{ left: explorer.contextMenu.x, top: explorer.contextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <ContextMenuButton icon={FilePlus} label="New File" onClick={() => { explorer.createFile(); explorer.setContextMenu(null); }} />
            {explorer.contextMenuFile?.kind === "source" && (
              <><ContextMenuButton icon={Edit2} label="Rename" onClick={() => { if (explorer.contextMenuFile) { explorer.setEditingFileId(explorer.contextMenuFile.id); explorer.setRenameValue(explorer.contextMenuFile.filename); } explorer.setContextMenu(null); }} /><ContextMenuButton icon={Trash2} label="Delete" danger disabled={files.length <= 1} onClick={() => { if (explorer.contextMenuFile && files.length > 1) explorer.deleteFile(null as any, explorer.contextMenuFile.id); explorer.setContextMenu(null); }} /></>
            )}
          </div>
        )}

        {/* ── CENTER AREA ── */}
        <div ref={centerPaneRef} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#050505] relative cursor-text">
          {activeSidebarTab === "interact" ? (
            <div className="flex-1 overflow-y-auto p-12">
              <InteractPanel contractAddress={deploy.contractAddress} abi={explorer.activeBuildData?.abi ?? []} account={wallet.starknetAccount} szWallet={wallet.szWallet} walletType={wallet.walletType} walletAddress={wallet.walletAddress} strkBalance={wallet.strkBalance} isFetchingBalance={wallet.isFetchingBalance} fetchStrkBalance={wallet.fetchStrkBalance} network={network} handleNetworkSwitch={handleNetworkSwitch} addLog={terminal.addLog} provider={sdkRef.current?.getProvider() as unknown as ProviderInterface | null} netConfig={netConfig} logTransaction={history.logTransaction} onRequestWallet={() => wallet.setShowAuthModal(true)} recentDeployments={history.history.deployments} layout="fullscreen" activeFileName={explorer.activeFile?.filename} notify={toasts.pushToast} onGetStarterApp={handleGenerateApp} />
            </div>
          ) : (
            <>
              <div className="flex h-10 bg-black/20 backdrop-blur-sm border-b border-neutral-800 overflow-x-auto flex-shrink-0 items-end px-2">
                {[explorer.activeFile].filter(Boolean).map(f => (<div key={f!.id} className="px-3 py-1.5 bg-black/40 rounded-t-md border-t border-x border-neutral-800 flex items-center gap-2 min-w-[140px]"><FileCode className={clsx("w-3.5 h-3.5", f!.readonly ? "text-sky-400" : accentColor)} /><span className="text-xs text-foreground/90 font-medium truncate">{f!.filename}</span></div>))}
              </div>
              <div className="flex-1 min-h-0 relative group">
                  <div className="absolute inset-0 overflow-auto">
                    <Editor
                      value={explorer.currentSource}
                      onChange={(val) => explorer.updateSource(val)}
                      readOnly={!!explorer.activeFile?.readonly}
                      settings={persistence.settings}
                      onBuild={compiler.handleBuild}
                    />
                  </div>
                <div className="absolute top-4 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><div className="flex items-center gap-1.5 p-1 rounded-lg bg-neutral-900/80 backdrop-blur-md border border-neutral-800"><button onClick={compiler.handleBuild} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-amber-500 transition-colors">Build</button><div className="w-px h-3 bg-neutral-800" /><CopyButton text={explorer.currentSource} label="Copy" onCopy={() => toasts.pushToast({ tone: "success", title: "Source copied" })} /></div></div>
              </div>
              <div onMouseDown={() => layout.setIsResizingTerminal(true)} className={clsx("h-1 cursor-row-resize border-t border-neutral-800", layout.isResizingTerminal ? "bg-amber-500/40" : "bg-neutral-900 hover:bg-amber-500/30")} />
              <div className="flex flex-col border-t border-neutral-800 bg-black/30 backdrop-blur-sm" style={{ height: layout.terminalHeight }}>
                <div className="flex items-center h-9 px-3 border-b border-neutral-800 justify-between bg-black/20">
                  <div className="flex items-center h-full gap-0.5"><Button variant="ghost" size="sm" onClick={() => setActiveBottomTab("terminal")} className={clsx("h-7 text-[11px] px-2.5 rounded-sm", activeBottomTab === "terminal" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5")}><Terminal className="w-3 h-3" />Terminal</Button><Button variant="ghost" size="sm" onClick={() => setActiveBottomTab("problems")} className={clsx("h-7 text-[11px] px-2.5 rounded-sm", activeBottomTab === "problems" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5")}><AlertCircle className="w-3 h-3" />Problems{explorer.problemCount > 0 && <Badge className="ml-1 h-4 px-1 text-[9px] bg-red-500/20 text-red-400">{explorer.problemCount}</Badge>}</Button></div>
                  <Button variant="ghost" size="icon" onClick={() => terminal.clearLogs()} className="h-7 w-7 text-muted-foreground hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
                  {activeBottomTab === "terminal" && (<div className="space-y-0.5">{terminal.terminalLogs.map((log) => (<div key={log.slice(0, 50)} className="flex gap-2 group py-0.5"><div className="flex-1 break-all">{renderLogLine(log)}</div></div>))}{compiler.compilerOutput && <pre className="mt-4 whitespace-pre-wrap rounded border border-neutral-900 bg-black/30 p-3 text-neutral-400">{renderLogLine(compiler.compilerOutput)}</pre>}</div>)}
                  {activeBottomTab === "problems" && (<div className="space-y-3">{explorer.liveDiagnostics.map((issue, i) => (<div key={`live-${i}`} className="rounded border border-neutral-800 bg-black/20 p-2"><div className="text-[10px] font-bold text-neutral-500 uppercase">{issue.severity} at line {issue.line}</div><div className="mt-1 text-[12px] text-neutral-300">{issue.message}</div></div>))}{compiler.errors.map((err, idx) => (<DiagnosticCard key={idx} error={err} index={idx} onAiFix={compiler.handleAiFix} isFixing={compiler.isAiFixing} suggestion={compiler.aiFixSuggestion?.index === idx ? compiler.aiFixSuggestion : null} onApplyFix={compiler.applyAiFix} />))}</div>)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <AnimatePresence initial={false}>
          {isRightPanelOpen && activeSidebarTab !== "interact" && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: layout.rightPanelWidth, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex flex-shrink-0 min-h-0 overflow-hidden">
              <div onMouseDown={() => layout.setIsResizingRightPanel(true)} className={clsx("w-1 cursor-col-resize", layout.isResizingRightPanel ? "bg-amber-500/40" : "bg-neutral-800 hover:bg-amber-500/50")} />
              <div className="flex flex-col flex-1 min-h-0 border-l border-neutral-800 bg-black/20 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center h-10 px-5 bg-black/40 border-b border-neutral-800 justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">Deploy</span><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /><span className="text-[9px] text-muted-foreground uppercase tracking-wider">Live</span></div></div>
                <DeployPanel activeFile={explorer.activeFile} activeBuildData={explorer.activeBuildData} buildStatus={buildStatus} network={network} netConfig={netConfig} handleNetworkSwitch={handleNetworkSwitch} starknetAccount={wallet.starknetAccount} walletAddress={wallet.walletAddress} walletType={wallet.walletType} disconnectWallet={wallet.disconnectWallet} strkBalance={wallet.strkBalance} isFetchingBalance={wallet.isFetchingBalance} fetchStrkBalance={wallet.fetchStrkBalance} setShowAuthModal={wallet.setShowAuthModal} deployStatus={deploy.deployStatus} deploySteps={deploy.deploySteps} classHash={deploy.classHash} contractAddress={deploy.contractAddress} constructorInputs={deploy.constructorInputs} setConstructorInputs={deploy.setConstructorInputs} salt={deploy.salt} setSalt={deploy.setSalt} handleDeclare={deploy.handleDeclare} handleDeploy={deploy.handleDeploy} onReset={deploy.resetDeployState} isWalletConnecting={wallet.isWalletConnecting} notify={toasts.pushToast} onGetStarterApp={handleGenerateApp} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STATUS BAR ── */}
      <StatusBar
        network={network}
        accentColor={accentColor}
        problemCount={explorer.problemCount}
        walletAddress={wallet.walletAddress}
        walletType={wallet.walletType}
        onNetworkSwitch={handleNetworkSwitch}
        onShowProblems={() => setActiveBottomTab("problems")}
        onShowAccount={() => wallet.setShowAccountModal(true)}
        onShowAuth={() => wallet.setShowAuthModal(true)}
      />

      <AnimatePresence>
        {wallet.showAuthModal && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => wallet.setShowAuthModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]" /><motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md"><AuthModal authenticated={authenticated} isConnecting={wallet.isWalletConnecting} walletError={wallet.walletError} onPrivyConnect={wallet.connectPrivyWallet} onExtensionConnect={wallet.connectExtensionWallet} onClose={() => { wallet.setShowAuthModal(false); wallet.setWalletError(null); }} networkLabel={netConfig.label} /></motion.div></>)}
      </AnimatePresence>
      <AnimatePresence>
        {wallet.showAccountModal && wallet.walletAddress && (<><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => wallet.setShowAccountModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]" /><motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md"><AccountModal address={wallet.walletAddress} walletType={wallet.walletType === "privy" ? "privy" : "extension"} mainnetBalance={wallet.mainnetBalance} sepoliaBalance={wallet.sepoliaBalance} onDisconnect={() => { wallet.disconnectWallet(); wallet.setShowAccountModal(false); }} onClose={() => wallet.setShowAccountModal(false)} /></motion.div></>)}
      </AnimatePresence>
      <DeployAccountPrompt isOpen={showDeployAccountPrompt} onClose={() => setShowDeployAccountPrompt(false)} networkLabel={netConfig.label} walletAddress={wallet.walletAddress} isDeployingAccount={deploy.isDeployingAccount} onDeployAccount={deploy.handleDeployAccount} />
      <ToastViewport toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
      </div>
      </CursorProvider>
    </TooltipProvider>
  );
}
