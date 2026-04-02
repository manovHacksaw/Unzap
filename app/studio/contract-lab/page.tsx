"use client";

import { useState, useCallback, useRef, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import { WalletAccount, Account, hash, RpcProvider, type CairoAssembly, type CompiledSierra, type ProviderInterface } from "starknet";
import {
  Files,
  Settings,
  Search,
  Box,
  History,
  ChevronDown,
  ChevronRight,
  FileCode,
  Layout,
  Activity,
  Zap,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit2,
  FilePlus,
  FolderPlus,
  Play,
  XCircle,
  FileText,
  Terminal,

} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  COMPILER_URL,
  CONTRACT_LAB_DRAFT_KEY,
  CONTRACT_LAB_SETTINGS_KEY,
  CONTRACT_LAB_WALLET_SESSION_KEY,
  CONTRACT_LAB_DRAFT_VERSION,
  STRK_TOKEN,
  UDC_ADDRESS,
  UDC_ENTRYPOINT,
  INITIAL_FILES,
  DEFAULT_SETTINGS,
  type SzWalletType,
  type DeployStep,
  type DeployStepStatus,
  type IDESettings,
  type CompileError,
  type ExplorerContextMenuState,
  type ExplorerEntry,
  type AbiEntry,
  type CompileSuccess,
  type CompileFailure,
  type TransactionData,
  type DeploymentData,
  type ContractHistoryItem,
  type TransactionHistoryItem,
  type HistoryData,
  type BuildStatus,
  type DeployStatus,
  type ContractLabDraft,
  type StudioToast,
  type StudioToastInput,
} from "./types";
import { formatProblemsForCopy, getLiveDiagnostics, getSearchMatches, highlightCairo, normalizeAbiEntries } from "./utils";
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

export default function StarkzapIDE() {
  // --- Privy Auth ---
  const { ready: privyReady, authenticated, getAccessToken, login, logout } = usePrivy();

  // --- Network ---
  const { network, setNetwork } = useNetwork();
  const netConfig = useMemo(() => getNetworkConfig(network), [network]);
  const sdkRef = useRef<StarkZap | null>(null);
  useEffect(() => {
    sdkRef.current = new StarkZap({
      network: netConfig.network,
      paymaster: {
        headers: {
          "x-paymaster-api-key": process.env.NEXT_PUBLIC_AVNU_API_KEY ?? "",
        },
      },
    });
  }, [netConfig.network]);

  // --- Fetch history on auth & sync with cache ---
  useEffect(() => {
    const loadHistory = async () => {
      const cached = localStorage.getItem("unzap:history");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.deployments || parsed.transactions) setHistory(parsed);
        } catch { /* ignore bad cache */ }
      }

      if (privyReady && authenticated) {
        try {
          const token = await getAccessToken();
          const res = await fetch("/api/history", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setHistory(data);
            localStorage.setItem("unzap:history", JSON.stringify(data));
          }
        } catch (e) {
          console.error("Failed to sync history:", e);
        }
      }
    };
    loadHistory();
  }, [authenticated, getAccessToken, privyReady]);

  // --- Wallet state ---
  const [szWallet, setSzWallet] = useState<SzWalletType | null>(null);
  const [starknetAccount, setStarknetAccount] = useState<Account | WalletAccount | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletType, setWalletType] = useState<"privy" | "extension" | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [strkBalance, setStrkBalance] = useState<string | null>(null);
  const [mainnetBalance, setMainnetBalance] = useState<string | null>(null);
  const [sepoliaBalance, setSepoliaBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [constructorInputs, setConstructorInputs] = useState<Record<string, string>>({});
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([]);
  const [salt, setSalt] = useState("0");

  // --- State ---
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState(INITIAL_FILES[0].id);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [buildOutputsByFile, setBuildOutputsByFile] = useState<Record<string, CompileSuccess>>({});
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [compilerOutput, setCompilerOutput] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [classHash, setClassHash] = useState("");
  const [history, setHistory] = useState<HistoryData>({ deployments: [], transactions: [] });
  const [isAiFixing, setIsAiFixing] = useState<string | null>(null);
  const [aiFixSuggestion, setAiFixSuggestion] = useState<{ index: number; fix: { line: number; newContent: string; description?: string } } | null>(null);
  const [showDeployAccountPrompt, setShowDeployAccountPrompt] = useState(false);
  const [isDeployingAccount, setIsDeployingAccount] = useState(false);

  const [activeSidebarTab, setActiveSidebarTab] = useState("explorer");
  const [activeInteractFn, setActiveInteractFn] = useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState("terminal");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [isDraftHydrating, setIsDraftHydrating] = useState(true);

  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[system] Starkzap Dev Studio v0.1.0 ready."]);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  const [settings, setSettings] = useState<IDESettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<StudioToast[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const centerPaneRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const draftHydratedRef = useRef(false);
  const walletReconnectAttemptRef = useRef<string | null>(null);

  const sourceFiles = useMemo<ExplorerEntry[]>(
    () => files.map((file) => ({ ...file, kind: "source" as const })),
    [files]
  );
  const artifactFiles = useMemo<ExplorerEntry[]>(() => {
    return files.flatMap((file) => {
      const buildOutput = buildOutputsByFile[file.id];
      if (!buildOutput) return [];
      const artifactBaseName = file.filename.replace(/\.cairo$/, "");
      return [
        { id: `artifact-${file.id}-abi`, filename: `${artifactBaseName}.abi.json`, source: JSON.stringify(buildOutput.abi, null, 2), readonly: true, kind: "artifact" as const, sourceFileId: file.id },
        { id: `artifact-${file.id}-sierra`, filename: `${artifactBaseName}.sierra.json`, source: JSON.stringify(buildOutput.sierra, null, 2), readonly: true, kind: "artifact" as const, sourceFileId: file.id },
        { id: `artifact-${file.id}-casm`, filename: `${artifactBaseName}.casm.json`, source: JSON.stringify(buildOutput.casm, null, 2), readonly: true, kind: "artifact" as const, sourceFileId: file.id },
      ];
    });
  }, [buildOutputsByFile, files]);
  const explorerFiles = useMemo<ExplorerEntry[]>(() => [...sourceFiles, ...artifactFiles], [artifactFiles, sourceFiles]);
  const activeFile = useMemo(() => explorerFiles.find((f) => f.id === activeFileId) || explorerFiles[0], [activeFileId, explorerFiles]);
  const activeSourceFileId = activeFile?.kind === "artifact" ? activeFile.sourceFileId ?? null : activeFile?.id ?? null;
  const activeBuildData = activeSourceFileId ? buildOutputsByFile[activeSourceFileId] ?? null : null;
  const activeSourceFile = useMemo(
    () => (activeSourceFileId ? sourceFiles.find((file) => file.id === activeSourceFileId) ?? null : null),
    [activeSourceFileId, sourceFiles]
  );
  const contextMenuFile = useMemo(() => explorerFiles.find((f) => f.id === contextMenu?.fileId) ?? null, [contextMenu?.fileId, explorerFiles]);
  const currentSource = activeFile?.source || "";
  const highlightedSource = useMemo(() => highlightCairo(currentSource, settings.theme), [currentSource, settings.theme]);
  const liveDiagnostics = useMemo(() => getLiveDiagnostics(currentSource), [currentSource]);
  const problemCount = errors.length + liveDiagnostics.length;

  const addLog = useCallback((log: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setTerminalLogs((prev) => [...prev, `[${time}] ${log}`]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: StudioToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextToast: StudioToast = {
      id,
      title: toast.title,
      description: toast.description,
      tone: toast.tone ?? "info",
    };

    setToasts([nextToast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== id));
    }, 3600);
  }, []);

  const appendCompilerOutput = useCallback((output: string) => {
    if (!output) return;
    const normalized = output.replace(/\n\n+/g, "\n").trim();
    setCompilerOutput(normalized);
  }, []);

  const persistWalletSession = useCallback((type: "privy" | "extension", address: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CONTRACT_LAB_WALLET_SESSION_KEY,
        JSON.stringify({
          type,
          address,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // Ignore storage write failures so wallet connection still succeeds.
    }
  }, []);

  const clearWalletSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(CONTRACT_LAB_WALLET_SESSION_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }, []);

  const getStoredWalletSession = useCallback((): { type: "privy" | "extension"; address?: string } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(CONTRACT_LAB_WALLET_SESSION_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as { type?: unknown; address?: unknown };
      if (parsed.type !== "privy" && parsed.type !== "extension") return null;

      return {
        type: parsed.type,
        address: typeof parsed.address === "string" ? parsed.address : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  const codeSearchMatches = useMemo(() => getSearchMatches(currentSource, codeSearchQuery), [codeSearchQuery, currentSource]);
  const diagnosticLineMap = useMemo(() => {
    const map = new Map<number, "error" | "warning" | "hint">();
    for (const err of errors) {
      if (err.line > 0) map.set(err.line, "error");
    }
    for (const d of liveDiagnostics) {
      if (!map.has(d.line)) map.set(d.line, d.severity);
    }
    return map;
  }, [errors, liveDiagnostics]);

  // --- Handlers ---
  const updateSource = useCallback((val: string) => {
    if (activeFile?.readonly) return;
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, source: val } : f)));
  }, [activeFile?.readonly, activeFileId]);

  const jumpToLineCol = useCallback((line: number, col: number) => {
    if (!textareaRef.current) return;
    const lines = currentSource.split("\n");
    let absoluteIndex = 0;
    for (let i = 0; i < Math.max(line - 1, 0); i += 1) {
      absoluteIndex += (lines[i]?.length ?? 0) + 1;
    }
    absoluteIndex += Math.max(col - 1, 0);
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(absoluteIndex, absoluteIndex);
  }, [currentSource]);

  const createFile = () => {
    const newId = `file-${Date.now()}`;
    const newFile = { id: newId, filename: "untitled.cairo", source: "// New Cairo Contract\n" };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
    setEditingFileId(newId);
    setRenameValue("untitled.cairo");
  };

  const deleteFile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const newFiles = files.filter((f) => f.id !== id);
    setFiles(newFiles);
    if (activeFileId === id) setActiveFileId(newFiles[0].id);
  };

  const startRename = (e: React.MouseEvent, file: ExplorerEntry) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setRenameValue(file.filename);
  };

  const confirmRename = () => {
    if (!editingFileId) return;
    setFiles(files.map(f => f.id === editingFileId ? { ...f, filename: renameValue } : f));
    setEditingFileId(null);
  };

  const openContextMenu = (e: ReactMouseEvent, fileId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileId) setActiveFileId(fileId);
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  const handleBuild = useCallback(async () => {
    if (buildStatus === "building" || !activeSourceFile) return;
    setBuildStatus("building");
    setErrors([]);
    setCompilerOutput("");
    addLog(`Starting build for ${activeSourceFile.filename}...`);
    setActiveBottomTab("terminal");

    try {
      const res = await fetch(`${COMPILER_URL}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: activeSourceFile.source }),
      });
      const json = (await res.json()) as CompileSuccess & CompileFailure;

      if (!res.ok || json.errors) {
        setBuildStatus("error");
        setErrors(json.errors ?? []);
        appendCompilerOutput(json.logs);
        addLog(`Build failed: ${json.errors?.length || 1} error(s) found.`);
        setActiveBottomTab("problems");
        pushToast({
          tone: "error",
          title: "Build failed",
          description: `${json.errors?.length || 1} compiler issue${json.errors?.length === 1 ? "" : "s"} found in ${activeSourceFile.filename}.`,
        });
      } else {
        setBuildStatus("success");
        setBuildOutputsByFile((prev) => ({ ...prev, [activeSourceFile.id]: json as CompileSuccess }));
        appendCompilerOutput(json.logs);
        addLog(`Build successful! Sierra and ABI generated.`);
        setClassHash("");
        setDeploySteps([]);
        setSalt(Math.floor(Math.random() * 1_000_000_000).toString());
        pushToast({
          tone: "success",
          title: "Build complete",
          description: `${activeSourceFile.filename} compiled successfully and artifacts are ready.`,
        });
      }
    } catch (e) {
      setBuildStatus("error");
      setErrors([{ message: e instanceof Error ? e.message : "Network error", line: 0, col: 0 }]);
      addLog(`Build failed: Network or server error.`);
      pushToast({
        tone: "error",
        title: "Build request failed",
        description: "The compiler could not be reached. Check the compiler service and try again.",
      });
    }
  }, [buildStatus, activeSourceFile, addLog, appendCompilerOutput, pushToast]);

  const handleAiFix = useCallback(async (error: CompileError, index: number) => {
    if (isAiFixing || !activeSourceFile) return;
    setIsAiFixing(index.toString());
    setAiFixSuggestion(null);
    addLog(`AI is analyzing the error at line ${error.line}...`);
    try {
      const res = await fetch("/api/ai/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: activeSourceFile.source, error }),
      });
      const data = await res.json();
      if (data.fix || data.suggestion) {
        setAiFixSuggestion({ index, fix: data.fix || data });
        addLog("AI found a potential fix!");
        pushToast({
          tone: "info",
          title: "AI suggestion ready",
          description: `A proposed fix is available for line ${error.line}.`,
        });
      } else {
        addLog(`AI: ${data.error || "No specific fix found."}`);
      }
    } catch {
      addLog("AI Fixing failed: Network or server error.");
    } finally {
      setIsAiFixing(null);
    }
  }, [activeSourceFile, addLog, isAiFixing, pushToast]);
  const applyAiFix = useCallback((fix: { line: number, newContent: string }) => {
    if (!fix || !activeSourceFile || !fix.newContent) return;
    const lines = activeSourceFile.source.split("\n");
    lines[fix.line - 1] = fix.newContent;
    const newSource = lines.join("\n");
    setFiles((prev) => prev.map((f) => (f.id === activeSourceFile.id ? { ...f, source: newSource } : f)));
    setAiFixSuggestion(null);
    addLog("AI Fix applied! Recompiling...");
    pushToast({
      tone: "success",
      title: "AI fix applied",
      description: "The suggested change was written to the editor and a rebuild is starting.",
    });
    setTimeout(() => handleBuild(), 100);
  }, [activeSourceFile, addLog, handleBuild, pushToast]);

  const fetchStrkBalance = useCallback(async (address: string) => {
    setIsFetchingBalance(true);
    try {
      const provider = sdkRef.current!.getProvider();
      const result = await provider.callContract({
        contractAddress: STRK_TOKEN,
        entrypoint: "balanceOf",
        calldata: [address],
      });
      const low = BigInt(result[0] ?? "0x0");
      const high = BigInt(result[1] ?? "0x0");
      const raw = low + high * (BigInt(2) ** BigInt(128));
      setStrkBalance((Number(raw) / 1e18).toFixed(4));
    } catch {
      setStrkBalance(null);
    } finally {
      setIsFetchingBalance(false);
    }
  }, []);

  const fetchDualBalances = useCallback(async (address: string) => {
    const mainnetCfg = getNetworkConfig("mainnet");
    const sepoliaCfg = getNetworkConfig("sepolia");
    
    const mainProvider = new RpcProvider({ nodeUrl: mainnetCfg.rpcUrl });
    const sepProvider = new RpcProvider({ nodeUrl: sepoliaCfg.rpcUrl });

    const fetchBal = async (prov: RpcProvider) => {
      try {
        const res = await prov.callContract({
          contractAddress: STRK_TOKEN,
          entrypoint: "balanceOf",
          calldata: [address],
        });
        const val = BigInt(res[0] ?? 0) + (BigInt(res[1] ?? 0) << 128n);
        return (Number(val) / 1e18).toFixed(4);
      } catch { return "0.0000"; }
    };

    const [main, sep] = await Promise.all([fetchBal(mainProvider), fetchBal(sepProvider)]);
    setMainnetBalance(main);
    setSepoliaBalance(sep);
    // sync current balance too
    setStrkBalance(network === "mainnet" ? main : sep);
  }, [network]);

  type WalletConnectOptions = {
    silent?: boolean;
    restore?: boolean;
  };

  // --- Wallet connection helpers ---
  const connectPrivyWallet = useCallback(async ({ silent = false, restore = false }: WalletConnectOptions = {}) => {
    if (!privyReady) return;
    if (!authenticated) {
      if (!silent) login();
      return;
    }
    if (!sdkRef.current) return;

    setIsWalletConnecting(true);
    if (!silent) setWalletError(null);

    try {
      const accessToken = await getAccessToken();
      const { wallet: connectedWallet } = await sdkRef.current.onboard({
        strategy: OnboardStrategy.Privy,
        privy: {
          resolve: async () => {
            const res = await fetch("/api/signer-context", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error((data as { error?: string }).error ?? "Signer context failed");
            return data;
          },
        },
        accountPreset: accountPresets.argentXV050,
        feeMode: "user_pays",
        deploy: "never",
      });

      setSzWallet(connectedWallet);
      setStarknetAccount(connectedWallet.getAccount() as unknown as Account);
      setWalletAddress(connectedWallet.address);
      setWalletType("privy");
      setShowAuthModal(false);
      persistWalletSession("privy", connectedWallet.address);
      addLog(
        `${restore ? "Restored" : "Connected"} Privy wallet: ${connectedWallet.address.slice(0, 10)}...`
      );
      if (!restore) {
        pushToast({
          tone: "success",
          title: "Privy wallet connected",
          description: "Gasless execution is ready in the studio.",
        });
      }
      fetchStrkBalance(connectedWallet.address);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Connection failed";
      if (!silent) {
        setWalletError(message);
        pushToast({
          tone: "error",
          title: "Privy connection failed",
          description: message,
        });
      }
      else console.warn("Silent Privy restore failed:", message);
    } finally {
      setIsWalletConnecting(false);
    }
  }, [addLog, authenticated, fetchStrkBalance, getAccessToken, login, persistWalletSession, privyReady, pushToast]);

  const connectExtensionWallet = useCallback(async ({ silent = false, restore = false }: WalletConnectOptions = {}) => {
    if (!sdkRef.current) return;

    setIsWalletConnecting(true);
    if (!silent) setWalletError(null);

    try {
      const swo = (window as unknown as { starknet?: { id?: string; name?: string; request: (args: { type: string; params?: unknown }) => Promise<string[]> } }).starknet;
      if (!swo) throw new Error("No Starknet browser extension found. Install ArgentX or Braavos.");

      const provider = sdkRef.current.getProvider();
      const walletAccount = await WalletAccount.connect(provider, swo as Parameters<typeof WalletAccount.connect>[1]);
      setStarknetAccount(walletAccount);
      setWalletAddress(walletAccount.address);
      setWalletType("extension");
      setShowAuthModal(false);
      persistWalletSession("extension", walletAccount.address);
      addLog(
        `${restore ? "Restored" : "Connected"} extension wallet: ${walletAccount.address.slice(0, 10)}...`
      );
      if (!restore) {
        pushToast({
          tone: "success",
          title: "Extension wallet connected",
          description: "Self-managed execution is ready in the studio.",
        });
      }
      fetchStrkBalance(walletAccount.address);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Extension connection failed";
      if (!silent) {
        setWalletError(message);
        pushToast({
          tone: "error",
          title: "Extension connection failed",
          description: message,
        });
      }
      else console.warn("Silent extension restore failed:", message);
    } finally {
      setIsWalletConnecting(false);
    }
  }, [addLog, fetchStrkBalance, persistWalletSession, pushToast]);

  useEffect(() => {
    if (!privyReady || !sdkRef.current || starknetAccount || isWalletConnecting) return;

    const session = getStoredWalletSession();
    if (!session) return;
    if (session.type === "privy" && !authenticated) return;

    const attemptKey = `${session.type}:${network}:${authenticated}`;
    if (walletReconnectAttemptRef.current === attemptKey) return;
    walletReconnectAttemptRef.current = attemptKey;

    if (session.type === "privy") {
      void connectPrivyWallet({ silent: true, restore: true });
      return;
    }

    void connectExtensionWallet({ silent: true, restore: true });
  }, [
    authenticated,
    connectExtensionWallet,
    connectPrivyWallet,
    getStoredWalletSession,
    isWalletConnecting,
    network,
    privyReady,
    starknetAccount,
  ]);

  useEffect(() => {
    if (!privyReady || authenticated || walletType !== "privy") return;

    clearWalletSession();
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setStrkBalance(null);
  }, [authenticated, clearWalletSession, privyReady, walletType]);

  const disconnectWallet = () => {
    if (walletType === "privy") logout();
    clearWalletSession();
    walletReconnectAttemptRef.current = null;
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setStrkBalance(null);
    setDeploySteps([]);
    setHistory({ deployments: [], transactions: [] });
    addLog("Wallet disconnected.");
    pushToast({
      tone: "info",
      title: "Wallet disconnected",
      description: "Studio execution has been disconnected for this session.",
    });
  };

  const logTransaction = async (data: TransactionData) => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "transaction", data }),
      });
      const hRes = await fetch("/api/history", { headers: { Authorization: `Bearer ${token}` } });
      if (hRes.ok) {
        const data = await hRes.json();
        setHistory(data);
        localStorage.setItem("unzap:history", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Log transaction error:", e);
    }
  };

  const logDeployment = async (data: DeploymentData) => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "deployment", data }),
      });
      const hRes = await fetch("/api/history", { headers: { Authorization: `Bearer ${token}` } });
      if (hRes.ok) {
        const data = await hRes.json();
        setHistory(data);
        localStorage.setItem("unzap:history", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Log deployment error:", e);
    }
  };

  const setDeployStep = (id: string, status: DeployStepStatus, detail?: string) => {
    setDeploySteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s))
    );
  };

  const handleNetworkSwitch = (n: "mainnet" | "sepolia") => {
    if (n === network) return;
    setSzWallet(null); setStarknetAccount(null); setWalletAddress(""); setWalletType(null); setWalletError(null); setStrkBalance(null);
    setDeployStatus("idle"); setDeploySteps([]); setClassHash(""); setContractAddress(""); setConstructorInputs({});
    setHistory({ deployments: [], transactions: [] });
    addLog(`[network] Switched to ${n === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia"}.`);
    setNetwork(n);
    pushToast({
      tone: "info",
      title: `Switched to ${n === "mainnet" ? "Mainnet" : "Sepolia"}`,
      description: "Wallet context and deploy state were reset for the new network.",
    });
  };

  const handleDeployAccount = async () => {
    if (!szWallet) return;
    setIsDeployingAccount(true);
    try {
      addLog("Deploying account on-chain...");
      await szWallet.deploy();
      addLog("Account deployed successfully.");
      setShowDeployAccountPrompt(false);
      fetchStrkBalance(walletAddress);
      pushToast({
        tone: "success",
        title: "Account deployed",
        description: "Your Privy account is now live on-chain.",
      });
    } catch (e) {
      addLog(`Account deploy failed: ${e instanceof Error ? e.message : String(e)}`);
      pushToast({
        tone: "error",
        title: "Account deployment failed",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsDeployingAccount(false);
    }
  };

  // Polls every 5s; resolves when confirmed, rejects with "timeout" after `ms` ms
  const waitForTx = useCallback(async (txHash: string, ms = 120_000) => {
    const account = starknetAccount as Account;
    return Promise.race([
      account.waitForTransaction(txHash, { retryInterval: 5000 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
    ]);
  }, [starknetAccount]);

  const handleDeclare = async () => {
    if (!starknetAccount) {
      setShowAuthModal(true);
      pushToast({
        tone: "warning",
        title: "Connect a wallet first",
        description: "A wallet is required before you can declare this contract.",
      });
      return;
    }
    if (!activeBuildData) {
      addLog("Build the contract first (Ctrl+S).");
      pushToast({
        tone: "warning",
        title: "Build required",
        description: "Compile the current contract before declaring it on-chain.",
      });
      return;
    }
    if (deployStatus !== "idle") return;

    if (walletType === "privy" && szWallet) {
      const isDeployed = await szWallet.isDeployed();
      if (!isDeployed) { setShowDeployAccountPrompt(true); return; }
    }

    const steps: DeployStep[] = [
      { id: "check", label: "Checking wallet", status: "idle" },
      { id: "sign", label: "Signing declare tx", status: "idle" },
      { id: "broadcast", label: `Confirmed on ${netConfig.label}`, status: "idle" },
      { id: "confirm", label: "Class hash ready", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("declaring");
    setActiveBottomTab("terminal");
    addLog(`Declaring contract on ${netConfig.label}...`);

    try {
      setDeployStep("check", "active");
      addLog(`Using wallet: ${walletAddress.slice(0, 14)}...`);
      setDeployStep("check", "done");
      setDeployStep("sign", "active");
      addLog("Sending declare transaction (sierra + casm)...");

      const declareResult = await (starknetAccount as Account).declare({
        contract: activeBuildData.sierra as CompiledSierra,
        casm: activeBuildData.casm as CairoAssembly,
      });
      setDeployStep("sign", "done", `tx: ${declareResult.transaction_hash.slice(0, 10)}...`);
      addLog(`Declare tx: ${declareResult.transaction_hash}`);
      setDeployStep("broadcast", "active");
      try {
        await waitForTx(declareResult.transaction_hash);
      } catch (waitErr) {
        if ((waitErr as Error).message === "timeout") {
          throw new Error(`Transaction timed out after 2 minutes. The paymaster may be out of gas or the network is congested. Check the tx on explorer: ${netConfig.explorer}/tx/${declareResult.transaction_hash}`);
        }
        throw waitErr;
      }
      setDeployStep("broadcast", "done");
      const cHash = declareResult.class_hash;
      setDeployStep("confirm", "active");
      setClassHash(cHash);
      setDeployStep("confirm", "done", `class hash: ${cHash.slice(0, 10)}...`);
      setDeployStatus("declared");
      addLog(`Declare success! Class Hash: ${cHash}`);
      addLog(`Explorer: ${netConfig.explorer}/class/${cHash}`);
      logTransaction({ hash: declareResult.transaction_hash, type: "declare", status: "success" });
      pushToast({
        tone: "success",
        title: "Contract declared",
        description: `Class hash ${cHash.slice(0, 10)}... is ready to deploy.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("CLASS_ALREADY_DECLARED") || msg.includes("already declared") || msg.includes("already exists")) {
        try {
          const cHash = hash.computeSierraContractClassHash(activeBuildData.sierra as CompiledSierra);
          setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "done", detail: "already declared" } : s));
          setClassHash(cHash);
          setDeployStatus("declared");
          addLog("Class already declared on-chain — reusing existing class hash.");
          addLog(`Class Hash: ${cHash}`);
          pushToast({
            tone: "info",
            title: "Class already declared",
            description: "The existing class hash was recovered and reused.",
          });
          return;
        } catch { /* fall through to error */ }
      }
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("idle");
      addLog(`Declare failed: ${msg}`);
      if (msg.includes("timed out after 2 minutes")) {
        pushToast({
          tone: "error",
          title: "Declare timed out",
          description: "No confirmation after 2 min. The paymaster may be out of gas or the network is congested. Check the terminal for the tx link.",
        });
      } else {
        pushToast({
          tone: "error",
          title: "Declare failed",
          description: msg.slice(0, 140),
        });
      }
    }
  };

  const handleDeploy = async () => {
    if (!starknetAccount || !classHash || deployStatus !== "declared") return;

    const newSalt = "0x" + Math.floor(Math.random() * 1000000).toString(16);
    setSalt(newSalt);

    const constructorAbi = activeBuildData?.abi?.find((entry: { type: string; name: string }) => entry.type === "constructor");
    const constructorParams: Array<{ name: string; type: string }> = constructorAbi?.inputs ?? [];
    const calldata = constructorParams.map((p: { name: string; type: string }) => constructorInputs[p.name] ?? "0");
    const effectiveSalt = newSalt;
    const predictedAddress = hash.calculateContractAddressFromHash(
      hash.computePedersenHash(walletAddress, effectiveSalt),
      classHash,
      calldata,
      UDC_ADDRESS,
    );

    const steps: DeployStep[] = [
      { id: "check", label: "Address availability", status: "idle" },
      { id: "udc", label: walletType === "privy" ? "Preparing sponsored UDC call" : "Preparing UDC call", status: "idle" },
      { id: "sign", label: walletType === "privy" ? "Gasless via AVNU paymaster" : "Signing deploy transaction", status: "idle" },
      { id: "broadcast", label: `Broadcasting to ${netConfig.label}`, status: "idle" },
      { id: "confirm", label: "Contract deployed", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("deploying");
    addLog(`Deploying via UDC${walletType === "privy" ? " (gasless — AVNU paymaster)" : ""}...`);

    try {
      setDeployStep("check", "active");
      addLog(`Checking if contract already exists at ${predictedAddress.slice(0, 10)}...`);
      try {
        await (starknetAccount as Account).getClassHashAt(predictedAddress);
        addLog(`Error: Contract already deployed at ${predictedAddress.slice(0, 12)}... Use a different salt.`);
        setDeployStep("check", "error", "Already deployed");
        setDeployStatus("declared");
        return;
      } catch (e: unknown) {
        const msg = String(e);
        if (msg.includes("Contract not found") || msg.includes("20")) {
          setDeployStep("check", "done", "Address is available");
        } else {
          addLog(`Note: Could not verify address status (network error). Proceeding anyway.`);
          setDeployStep("check", "done", "Bypassed");
        }
      }
      setDeployStep("udc", "active");
      addLog(`Class hash: ${classHash}`);
      addLog(`Constructor args: [${calldata.join(", ")}]`);
      addLog(`Predicted address: ${predictedAddress}`);
      setDeployStep("udc", "done");
      setDeployStep("sign", "active");

      let txHash = "";
      if (walletType === "privy" && szWallet) {
        const udcCall = {
          contractAddress: UDC_ADDRESS,
          entrypoint: UDC_ENTRYPOINT,
          calldata: [classHash, effectiveSalt, "1", String(calldata.length), ...calldata],
        };
        const tx = await szWallet.execute([udcCall], { feeMode: "sponsored" });
        txHash = tx.hash;
        setDeployStep("sign", "done", `tx: ${tx.hash.slice(0, 10)}...`);
        addLog(`Deploy tx (gasless): ${tx.hash}`);
        setDeployStep("broadcast", "active");
        try {
          await Promise.race([
            tx.wait(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 120_000)),
          ]);
        } catch (waitErr) {
          if ((waitErr as Error).message === "timeout") {
            throw new Error(`Transaction timed out after 2 minutes. The paymaster may be out of gas or the network is congested. Check the tx on explorer: ${netConfig.explorer}/tx/${tx.hash}`);
          }
          throw waitErr;
        }
        setDeployStep("broadcast", "done");
      } else {
        const deployResult = await (starknetAccount as Account).deployContract({
          classHash,
          constructorCalldata: calldata,
          salt: effectiveSalt,
          unique: true,
        });
        txHash = deployResult.transaction_hash;
        setDeployStep("sign", "done", `tx: ${deployResult.transaction_hash.slice(0, 10)}...`);
        addLog(`Deploy tx: ${deployResult.transaction_hash}`);
        setDeployStep("broadcast", "active");
        try {
          await waitForTx(deployResult.transaction_hash);
        } catch (waitErr) {
          if ((waitErr as Error).message === "timeout") {
            throw new Error(`Transaction timed out after 2 minutes. The paymaster may be out of gas or the network is congested. Check the tx on explorer: ${netConfig.explorer}/tx/${deployResult.transaction_hash}`);
          }
          throw waitErr;
        }
        setDeployStep("broadcast", "done");
      }

      setDeployStep("confirm", "active");
      setContractAddress(predictedAddress);
      setDeployStep("confirm", "done", `address: ${predictedAddress.slice(0, 10)}...`);
      setDeployStatus("deployed");
      addLog(`Deploy success! Contract: ${predictedAddress}`);
      addLog(`View on explorer: ${netConfig.explorer}/contract/${predictedAddress}`);
      setActiveSidebarTab("interact");
      setIsSidebarOpen(true);
      setActiveInteractFn(null);
      pushToast({
        tone: "success",
        title: "Contract deployed",
        description: `${predictedAddress.slice(0, 10)}... is live and ready to interact with.`,
      });

      logDeployment({
        contractAddress: predictedAddress,
        classHash,
        abi: activeBuildData?.abi || [],
        name: activeFile?.filename || "Unknown",
        network,
      });
      logTransaction({ hash: txHash, type: "deploy", status: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("declared");
      if (msg.includes("timed out after 2 minutes")) {
        addLog(`Deploy failed: ${msg}`);
        pushToast({
          tone: "error",
          title: "Deploy timed out",
          description: "No confirmation after 2 min. The paymaster may be out of gas or the network is congested. Check the terminal for the tx link.",
        });
      } else if (msg.includes("contract already deployed") || msg.includes("already deployed") || msg.includes("already exists")) {
        addLog(`Deploy failed: Address collision. Change the salt and try again.`);
        pushToast({
          tone: "warning",
          title: "Address collision detected",
          description: "That predicted address is already deployed. Regenerate the salt and try again.",
        });
      } else {
        addLog(`Deploy failed: ${msg}`);
        pushToast({
          tone: "error",
          title: "Deploy failed",
          description: msg.slice(0, 140),
        });
      }
    }
  };

  const updateCursorPosition = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = ta.value.slice(0, ta.selectionStart);
    const lines = text.split("\n");
    setCursorLine(lines.length);
    setCursorCol(lines[lines.length - 1].length + 1);
  }, []);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleBuild();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta || activeFile?.readonly) return;
      const { selectionStart, selectionEnd, value } = ta;
      if (!e.shiftKey) {
        const next = value.slice(0, selectionStart) + "    " + value.slice(selectionEnd);
        updateSource(next);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = selectionStart + 4; });
      } else {
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const leadingSpaces = value.slice(lineStart).match(/^ {1,4}/)?.[0]?.length ?? 0;
        if (leadingSpaces > 0) {
          const next = value.slice(0, lineStart) + value.slice(lineStart + leadingSpaces);
          updateSource(next);
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = Math.max(selectionStart - leadingSpaces, lineStart); });
        }
      }
    }
  }, [activeFile, handleBuild, updateSource]);

  const syncScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const lineCount = currentSource.split("\n").length || 0;

  useEffect(() => {
    if (!isResizingRightPanel) return;
    const onMouseMove = (event: MouseEvent) => setRightPanelWidth(Math.min(Math.max(window.innerWidth - event.clientX, 260), 520));
    const onMouseUp = () => setIsResizingRightPanel(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [isResizingRightPanel]);

  useEffect(() => {
    if (!isResizingTerminal) return;
    const onMouseMove = (event: MouseEvent) => {
      const pane = centerPaneRef.current;
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      const nextHeight = rect.bottom - event.clientY;
      const maxHeight = Math.max(220, rect.height - 180);
      setTerminalHeight(Math.min(Math.max(nextHeight, 160), maxHeight));
    };
    const onMouseUp = () => setIsResizingTerminal(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [isResizingTerminal]);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setContextMenu(null); };
    window.addEventListener("click", closeContextMenu);
    window.addEventListener("keydown", onEscape);
    return () => { window.removeEventListener("click", closeContextMenu); window.removeEventListener("keydown", onEscape); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawDraft = window.localStorage.getItem(CONTRACT_LAB_DRAFT_KEY);
      if (!rawDraft) { draftHydratedRef.current = true; setIsDraftHydrating(false); return; }

      const parsed = JSON.parse(rawDraft) as ContractLabDraft;
      if (
        parsed.version !== CONTRACT_LAB_DRAFT_VERSION ||
        !Array.isArray(parsed.files) ||
        parsed.files.length === 0 ||
        typeof parsed.activeFileId !== "string"
      ) { draftHydratedRef.current = true; setIsDraftHydrating(false); return; }

      const validFiles = parsed.files.filter(
        (file): file is (typeof INITIAL_FILES)[number] =>
          !!file && typeof file.id === "string" && typeof file.filename === "string" && typeof file.source === "string"
      );

      if (validFiles.length > 0) {
        setFiles(validFiles);
        setActiveFileId(validFiles.some((file) => file.id === parsed.activeFileId) ? parsed.activeFileId : validFiles[0].id);
        const restoredBuildOutputs = parsed.buildOutputsByFile && typeof parsed.buildOutputsByFile === "object" ? parsed.buildOutputsByFile : {};
        setBuildOutputsByFile(restoredBuildOutputs);
        const activeRestoredId = validFiles.some((f) => f.id === parsed.activeFileId) ? parsed.activeFileId : validFiles[0].id;
        if (restoredBuildOutputs[activeRestoredId]) setBuildStatus("success");
        setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Restored ${validFiles.length} file(s) from local browser draft.`]);
      }
    } catch { /* Ignore malformed drafts */ }
    finally { draftHydratedRef.current = true; setIsDraftHydrating(false); }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!draftHydratedRef.current) return;
    const draft: ContractLabDraft = {
      version: CONTRACT_LAB_DRAFT_VERSION,
      files,
      activeFileId: files.some((file) => file.id === activeFileId) ? activeFileId : files[0].id,
      buildOutputsByFile,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(CONTRACT_LAB_DRAFT_KEY, JSON.stringify(draft));
  }, [activeFileId, buildOutputsByFile, files]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONTRACT_LAB_SETTINGS_KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch { }
  }, []);

  useEffect(() => {
    localStorage.setItem(CONTRACT_LAB_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof IDESettings>(key: K, value: IDESettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const accentColor = { amber: "text-amber-500", emerald: "text-emerald-500", azure: "text-sky-500", mono: "text-white" }[settings.theme];
  const accentBg = { amber: "bg-amber-500", emerald: "bg-emerald-500", azure: "bg-sky-500", mono: "bg-white" }[settings.theme];
  const sidebarTitleMap: Record<string, string> = {
    explorer: "Explorer",
    interact: "Contract Interface",
    search: "Search",
    history: "History",
  };

  const workspaceSignals = [
    {
      label: "Network",
      value: netConfig.label,
      tone: network === "mainnet" ? "amber" : "emerald",
    },
    {
      label: "Wallet",
      value: walletType === "privy" ? "Privy gasless" : walletType === "extension" ? "Extension connected" : "No wallet",
      tone: walletType === "privy" ? "amber" : walletType === "extension" ? "sky" : "neutral",
    },
    {
      label: "State",
      value: contractAddress ? "Contract live" : classHash ? "Declared" : buildStatus === "success" ? "Ready to declare" : "Build required",
      tone: contractAddress ? "emerald" : classHash ? "sky" : buildStatus === "success" ? "amber" : "neutral",
    },
  ] as const;

  const renderSidebarActions = () => {
    if (activeSidebarTab === "explorer") {
      return (
        <div className="flex items-center gap-0.5">
          <button onClick={createFile} className="p-1 hover:bg-white/5 rounded transition-colors" title="New File"><FilePlus className="w-3.5 h-3.5 text-neutral-600" /></button>
          <button className="p-1 hover:bg-white/5 rounded transition-colors" title="New Folder"><FolderPlus className="w-3.5 h-3.5 text-neutral-600" /></button>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded transition-colors" title="Collapse sidebar"><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-0.5">
        <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded transition-colors" title="Collapse sidebar"><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
      </div>
    );
  };

  const renderLogLine = (log: string) => {
    const parts = log.split(/(\b0x[a-fA-F0-9]{40,64}\b|https?:\/\/[^\s,]+)/g);
    const logLower = log.toLowerCase();
    
    // Heuristic: determine the link type based on keywords in the line
    let type: "tx" | "contract" | "class" = "tx";
    if (logLower.includes("contract") || logLower.includes("address") || logLower.includes(" wallet")) {
      type = "contract";
    } else if (logLower.includes("class")) {
      type = "class";
    } else if (logLower.includes("tx") || logLower.includes("transaction") || logLower.includes("broadcast")) {
      type = "tx";
    }

    return (
      <div className="selection:bg-amber-500/40 selection:text-white cursor-text">
        {parts.map((part, index) => {
          if (part.startsWith("0x")) {
            const link = `${netConfig.explorer}/${type}/${part}`;
            return (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 font-mono underline decoration-amber-400/20 underline-offset-2 transition-colors cursor-pointer inline-block"
              >
                {part}
              </a>
            );
          } else if (part.startsWith("http")) {
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline decoration-sky-400/30 underline-offset-2 transition-colors cursor-pointer"
              >
                {part}
              </a>
            );
          }
          return <span key={index} className="opacity-90">{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-neutral-400 font-sans overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-neutral-800 bg-black/40 backdrop-blur-xl flex-shrink-0 z-20 gap-4">
        {/* Left: traffic lights + logo */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-neutral-700" />
            <div className="w-3 h-3 rounded-full bg-neutral-600" />
            <div className={clsx("w-3 h-3 rounded-full opacity-70", accentBg)} />
          </div>
          <div className="w-px h-4 bg-neutral-800" />
          <div className="flex items-center gap-3 min-w-0">
            <Zap className={clsx("w-3.5 h-3.5", accentColor, settings.theme !== 'mono' && "fill-current")} />
            <div className="text-sm font-semibold text-foreground/90">Starkzap Studio</div>
          </div>
          <div className="hidden xl:flex items-center gap-4 min-w-0">
            {workspaceSignals.map((signal) => (
              <div
                key={signal.label}
                className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
              >
                <span className="text-neutral-600">{signal.label}</span>
                <span
                  className={clsx(
                    signal.tone === "amber"
                      ? "text-amber-300"
                      : signal.tone === "emerald"
                      ? "text-emerald-300"
                      : signal.tone === "sky"
                      ? "text-sky-300"
                      : "text-neutral-300"
                  )}
                >
                  {signal.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: build button + status badge + settings */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-white/10 text-foreground/70 hover:text-foreground"
            onClick={handleBuild}
            disabled={buildStatus === "building"}
          >
            {buildStatus === "building"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Play className="w-4 h-4" />}
            Build
          </Button>
          {buildStatus === "success" && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15">
              <CheckCircle2 className="w-3 h-3 mr-1" />Build Success
            </Badge>
          )}
          {buildStatus === "error" && (
            <Badge className="bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/15">
              <XCircle className="w-3 h-3 mr-1" />Build Failed
            </Badge>
          )}
          {buildStatus === "building" && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/15">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5 inline-block" />Building
            </Badge>
          )}
          <div className="w-px h-4 bg-neutral-800 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10 text-foreground/50 hover:text-foreground"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} updateSetting={updateSetting} />

      <div className="flex flex-1 overflow-hidden">
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
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col border-r border-neutral-800 bg-black/20 backdrop-blur-sm overflow-hidden flex-shrink-0"
            >
              <PanelHeader title={sidebarTitleMap[activeSidebarTab] ?? activeSidebarTab}>
                {renderSidebarActions()}
              </PanelHeader>

              <ScrollArea className="flex-1" onContextMenu={(e) => openContextMenu(e, null)}>
                {activeSidebarTab === "explorer" && (
                  <div className="py-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02]">
                      <ChevronDown className="w-3 h-3" />
                      src
                    </div>
                    {sourceFiles.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => setActiveFileId(f.id)}
                        onContextMenu={(e) => openContextMenu(e, f.id)}
                        className={clsx(
                          "group w-full flex items-center gap-2 px-6 py-1 text-xs transition-colors cursor-pointer relative",
                          activeFileId === f.id ? clsx(settings.theme === 'mono' ? "bg-white/10 text-white" : `${accentBg}/10 ${accentColor}`) : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
                        )}
                      >
                        <Zap className={clsx("w-3.5 h-3.5 flex-shrink-0", activeFileId === f.id ? `${accentColor} ${settings.theme !== 'mono' ? 'fill-current' : ''}` : "text-neutral-700 group-hover:text-neutral-500")} />
                        {editingFileId === f.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={confirmRename}
                            onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                            className="bg-neutral-900 border border-amber-500/50 outline-none px-1 rounded text-neutral-200 w-full"
                          />
                        ) : (
                          <span className="truncate">{f.filename}</span>
                        )}
                        {!editingFileId && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => startRename(e, f)} className="p-0.5 hover:text-white"><Edit2 className="w-2.5 h-2.5" /></button>
                            <button onClick={(e) => deleteFile(e, f.id)} className="p-0.5 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="mt-4">
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02]">
                        <ChevronDown className="w-3 h-3" />
                        artifacts
                      </div>
                      {artifactFiles.length > 0 ? (
                        artifactFiles.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => setActiveFileId(f.id)}
                            className={clsx(
                              "group w-full flex items-center gap-2 px-6 py-1 text-xs transition-colors cursor-pointer relative",
                              activeFileId === f.id ? "bg-sky-500/10 text-sky-300" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
                            )}
                          >
                            <Box className={clsx("w-3.5 h-3.5 flex-shrink-0 transition-colors", activeFileId === f.id ? "text-sky-400" : "text-neutral-700 group-hover:text-neutral-500")} />
                            <span className="truncate">{f.filename}</span>
                          </div>
                        ))
                      ) : isDraftHydrating ? (
                        <div className="px-6 py-2 space-y-2">
                          {[0, 1, 2].map((item) => (
                            <div key={`artifact-skeleton-${item}`} className="flex items-center gap-2 py-1.5">
                              <div className="h-3.5 w-3.5 rounded bg-neutral-900 animate-pulse" />
                              <div className="h-3 w-full max-w-[150px] rounded bg-neutral-900 animate-pulse" />
                            </div>
                          ))}
                          <div className="pt-2 text-[10px] font-mono text-neutral-700">Fetching browser draft and generated files...</div>
                        </div>
                      ) : (
                        <div className="mx-4 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Saved in Browser</div>
                          <div className="mt-2 text-[10px] leading-relaxed text-neutral-600">Files and build artifacts are stored in this browser. Clearing storage or switching browsers will lose your work.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSidebarTab === "explorer" && authenticated && history.deployments.length > 0 && (
                  <div className="mt-4 border-t border-neutral-900 pt-4 px-2 pb-6">
                    <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase text-neutral-500 mb-1 group cursor-pointer hover:bg-white/[0.02]">
                      <ChevronDown className="w-3 h-3" />
                      recent deployments
                    </div>
                    {history.deployments.map((d: ContractHistoryItem) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          const restoredAbi = normalizeAbiEntries(d.abi);
                          setContractAddress(d.contractAddress);
                          setClassHash(d.classHash);
                          setDeployStatus("deployed");
                          setDeploySteps([]);
                          setConstructorInputs({});
                          addLog(
                            `[history] Loaded ${d.contractAddress.slice(0, 10)}... with ${restoredAbi.length || 0} ABI entr${restoredAbi.length === 1 ? "y" : "ies"}.`
                          );
                          pushToast({
                            tone: "info",
                            title: "Deployment restored",
                            description: `${d.name || "Contract"} is back in the deployment panel.`,
                          });
                        }}
                        className="group w-full flex items-center gap-2 px-6 py-1.5 text-[11px] transition-colors cursor-pointer text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
                      >
                        <Box className="w-3 h-3 flex-shrink-0 text-neutral-700 group-hover:text-amber-500/50" />
                        <div className="flex flex-col truncate">
                          <span className="truncate text-neutral-300 font-medium">{d.name || "Contract"}</span>
                          <span className="text-[9px] font-mono text-neutral-600 truncate">{d.contractAddress.slice(0, 10)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSidebarTab === "search" && (
                  <div className="p-3 space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Search In Current File</div>
                        <div className="text-[10px] font-mono text-neutral-700">{codeSearchMatches.length} matches</div>
                      </div>
                      <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
                        <input
                          value={codeSearchQuery}
                          onChange={(e) => setCodeSearchQuery(e.target.value)}
                          placeholder={`Search in ${activeFile?.filename || "file"}`}
                          className="w-full bg-transparent text-[12px] text-neutral-300 outline-none placeholder:text-neutral-700"
                        />
                      </div>
                      <div className="max-h-[280px] space-y-1 overflow-y-auto">
                        {codeSearchQuery.trim() ? (
                          codeSearchMatches.length > 0 ? (
                            codeSearchMatches.map((match) => (
                              <button
                                key={`match-${match.index}`}
                                onClick={() => jumpToLineCol(match.line, match.col)}
                                className="w-full rounded border border-neutral-800 bg-black/20 px-3 py-2 text-left transition-colors hover:border-neutral-700 hover:bg-white/[0.03]"
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Line {match.line}:{match.col}</div>
                                <div className="mt-1 truncate text-[11px] text-neutral-300">{match.preview}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-2 py-2 text-[10px] font-mono text-neutral-700">No matches in current file.</div>
                          )
                        ) : (
                          <div className="px-2 py-2 text-[10px] font-mono text-neutral-700">Type to search inside the current file.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeSidebarTab === "history" && (
                  <div className="p-4 overflow-y-auto h-full no-scrollbar space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent Deployments</div>
                        <Zap className="w-2.5 h-2.5 text-neutral-800" />
                      </div>
                      {history.deployments.length === 0 ? (
                        <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">No deployments found.</div>
                      ) : (
                        <div className="space-y-2">
                          {history.deployments.map((d: ContractHistoryItem) => (
                            <HistoryDeploymentCard
                              key={d.id}
                              deployment={d}
                              onInteract={() => {
                                const restoredAbi = normalizeAbiEntries(d.abi);
                                setContractAddress(d.contractAddress);
                                setClassHash(d.classHash);
                                setDeployStatus("deployed");
                                setDeploySteps([]);
                                setConstructorInputs({});
                                setActiveSidebarTab("interact");
                                setIsSidebarOpen(true);
                                addLog(
                                  `[history] Restored contract: ${d.contractAddress.slice(0, 10)}... (${restoredAbi.length || 0} ABI entr${restoredAbi.length === 1 ? "y" : "ies"})`
                                );
                                pushToast({
                                  tone: "info",
                                  title: "Interface restored",
                                  description: `${d.name || "Contract"} is ready in the interact workspace.`,
                                });
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent Transactions</div>
                        <button
                          onClick={() => {
                            setHistory({ deployments: [], transactions: [] });
                            pushToast({
                              tone: "info",
                              title: "History cleared",
                              description: "Local deployment and transaction history was cleared from the studio view.",
                            });
                          }}
                          className="p-1 hover:text-white transition-colors"
                          title="Clear history"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      {history.transactions.length === 0 ? (
                        <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">No transactions logged yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {history.transactions.map((tx: TransactionHistoryItem) => (
                            <div key={tx.id} className="p-2.5 rounded border border-neutral-800 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-neutral-300 uppercase">{tx.type}</span>
                                <span className="text-[9px] text-neutral-700">{new Date(tx.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="text-[9px] font-mono text-neutral-600 truncate mb-1.5">{tx.hash}</div>
                              <div className="flex justify-end gap-2">
                                <a href={`${netConfig.explorer}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors">View ↗</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSidebarTab === "interact" && (
                  <div className="p-3 space-y-1 overflow-y-auto h-full no-scrollbar">
                    {(() => {
                      const firstH = history.deployments[0];
                      const interactAbi: AbiEntry[] = activeBuildData?.abi ?? (typeof firstH?.abi === 'string' ? JSON.parse(firstH.abi) : []) ?? [];
                      const fns: AbiEntry[] = [];
                      for (const entry of interactAbi) {
                        if (entry.type === "function" && entry.state_mutability) fns.push(entry);
                        else if ((entry.type === "impl" || entry.type === "interface") && Array.isArray(entry.items)) {
                          for (const item of entry.items || []) { if (item.state_mutability) fns.push(item); }
                        }
                      }
                      const seen = new Set<string>();
                      const allFns = fns.filter(fn => { if (seen.has(fn.name)) return false; seen.add(fn.name); return true; });
                      const viewFns = allFns.filter(f => f.state_mutability === "view");
                      const writeFns = allFns.filter(f => f.state_mutability === "external" || f.state_mutability === "external_v0");

                      if (allFns.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                            <Zap className="w-6 h-6 text-neutral-700" />
                            <p className="text-[10px] text-neutral-600 text-center leading-relaxed">Deploy a contract first to interact with its functions.</p>
                          </div>
                        );
                      }
                      return (
                        <>
                          {contractAddress && (
                            <div className="mb-3 px-2 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 mb-1">Deployed</div>
                              <div className="text-[10px] font-mono text-amber-400 truncate">{contractAddress.slice(0, 20)}…</div>
                            </div>
                          )}
                          {viewFns.length > 0 && (
                            <div className="mb-2">
                              <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                View ({viewFns.length})
                              </div>
                              {viewFns.map((fn: AbiEntry) => (
                                <button key={fn.name} onClick={() => setActiveInteractFn(fn.name)} className={clsx("w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all", activeInteractFn === fn.name ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent")}>{fn.name}</button>
                              ))}
                            </div>
                          )}
                          {writeFns.length > 0 && (
                            <div>
                              <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Write ({writeFns.length})
                              </div>
                              {writeFns.map((fn: AbiEntry) => (
                                <button key={fn.name} onClick={() => setActiveInteractFn(fn.name)} className={clsx("w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all", activeInteractFn === fn.name ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent")}>{fn.name}</button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {contextMenu && (
          <div
            className="fixed z-50 min-w-[180px] rounded-lg border border-border/60 bg-black/80 backdrop-blur-xl p-1 shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuButton icon={FilePlus} label="New File" onClick={() => { createFile(); setContextMenu(null); }} />
            {contextMenuFile?.kind === "source" && (
              <ContextMenuButton icon={Edit2} label="Rename" onClick={() => { if (contextMenuFile) { setEditingFileId(contextMenuFile.id); setRenameValue(contextMenuFile.filename); } setContextMenu(null); }} />
            )}
            {contextMenuFile?.kind === "source" && (
              <ContextMenuButton icon={Trash2} label="Delete" danger disabled={files.length <= 1} onClick={() => { if (contextMenuFile && files.length > 1) { const nextFiles = files.filter((f) => f.id !== contextMenuFile.id); setFiles(nextFiles); if (activeFileId === contextMenuFile.id) setActiveFileId(nextFiles[0].id); } setContextMenu(null); }} />
            )}
          </div>
        )}

        {/* ── CENTER AREA ── */}
        <div ref={centerPaneRef} className="flex-1 flex flex-col overflow-hidden bg-[#050505] relative cursor-text">
          {activeSidebarTab === "interact" ? (
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                <InteractPanel
                  contractAddress={contractAddress}
                  abi={activeBuildData?.abi ?? []}
                  account={starknetAccount}
                  szWallet={szWallet}
                  walletType={walletType}
                  walletAddress={walletAddress}
                  strkBalance={strkBalance}
                  isFetchingBalance={isFetchingBalance}
                  fetchStrkBalance={fetchStrkBalance}
                  network={network}
                  handleNetworkSwitch={handleNetworkSwitch}
                  addLog={addLog}
                  provider={sdkRef.current?.getProvider() as unknown as ProviderInterface | null}
                  netConfig={getNetworkConfig(network)}
                  logTransaction={logTransaction}
                  onRequestWallet={() => setShowAuthModal(true)}
                  recentDeployments={history.deployments}
                  layout="fullscreen"
                  activeFileName={activeFile?.filename}
                  notify={pushToast}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex h-10 bg-black/20 backdrop-blur-sm border-b border-neutral-800 overflow-x-auto flex-shrink-0 no-scrollbar items-end px-2">
                {[activeFile].filter(Boolean).map(f => (
                  <div key={f.id} className="px-3 py-1.5 bg-black/40 rounded-t-md border-t border-x border-neutral-800 flex items-center gap-2 min-w-[140px]">
                    <FileCode className={clsx("w-3.5 h-3.5 flex-shrink-0", f.readonly ? "text-sky-400" : accentColor)} />
                    <span className="text-xs text-foreground/90 font-medium truncate">{f.filename}</span>
                  </div>
                ))}
              </div>

              {/* Code Editor */}
              <div className="flex-1 relative overflow-hidden group">
                <div className="absolute inset-0 flex font-mono text-[13px] leading-6 py-4">
                  {settings.showLineNumbers && (
                    <div ref={lineNumbersRef} className="w-14 text-right pr-3 text-neutral-700 bg-[#050505] select-none overflow-hidden border-r border-neutral-900/30 shrink-0">
                      {Array.from({ length: Math.max(lineCount, 50) }).map((_, i) => {
                        const severity = diagnosticLineMap.get(i + 1);
                        return (
                          <div key={i} className={clsx("h-6 flex items-center justify-end gap-1.5", i < lineCount ? "opacity-100" : "opacity-0")}>
                            {severity ? (
                              <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", severity === "error" ? "bg-red-500" : severity === "warning" ? "bg-amber-400" : "bg-neutral-600")} />
                            ) : <span className="w-1.5 h-1.5 flex-shrink-0" />}
                            <span style={{ fontSize: `${settings.fontSize - 3}px` }}>{i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="relative flex-1">
                    <pre
                      ref={highlightRef}
                      aria-hidden="true"
                      className={clsx("pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-4 leading-6 transition-all", settings.lineWrapping ? "whitespace-pre-wrap" : "whitespace-pre")}
                      style={{ fontSize: `${settings.fontSize}px` }}
                      dangerouslySetInnerHTML={{ __html: highlightedSource }}
                    />
                    <textarea
                      ref={textareaRef}
                      value={currentSource}
                      onChange={(e) => updateSource(e.target.value)}
                      onScroll={syncScroll}
                      onKeyDown={handleEditorKeyDown}
                      onSelect={updateCursorPosition}
                      onClick={updateCursorPosition}
                      onKeyUp={updateCursorPosition}
                      readOnly={!!activeFile?.readonly}
                      spellCheck={false}
                      className={clsx(
                        "absolute inset-0 resize-none bg-transparent px-4 text-transparent outline-none selection:bg-amber-500/20 leading-6 transition-all",
                        activeFile?.readonly ? "caret-transparent cursor-default" : settings.theme === 'azure' ? "caret-sky-500" : settings.theme === 'emerald' ? "caret-emerald-500" : settings.theme === 'mono' ? "caret-white" : "caret-amber-500",
                        settings.lineWrapping ? "whitespace-pre-wrap" : "whitespace-pre"
                      )}
                      style={{ tabSize: 4, fontSize: `${settings.fontSize}px` }}
                    />
                  </div>
                </div>
                <div className="absolute top-4 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-neutral-900/80 backdrop-blur-md border border-neutral-800">
                    <button onClick={handleBuild} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-amber-500 transition-colors">Build</button>
                    <div className="w-px h-3 bg-neutral-800" />
                    <CopyButton
                      text={currentSource}
                      label="Copy"
                      onCopy={() =>
                        pushToast({
                          tone: "success",
                          title: "Source copied",
                          description: `${activeFile?.filename || "Current file"} was copied to your clipboard.`,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between h-5 px-3 bg-[#0a0a0a] border-t border-neutral-800 flex-shrink-0 text-[10px] font-mono text-neutral-600 select-none">
                <div className="flex items-center gap-1.5"><span>Ln {cursorLine}, Col {cursorCol}</span></div>
                <div className="flex items-center gap-3">
                  <span className="uppercase tracking-wider">{activeFile?.filename?.split('.').pop()}</span>
                  <span>UTF-8</span>
                </div>
              </div>

              {/* Resize Handle */}
              <div
                onMouseDown={() => setIsResizingTerminal(true)}
                className={clsx("h-1 flex-shrink-0 cursor-row-resize transition-colors border-t border-neutral-800", isResizingTerminal ? "bg-amber-500/40" : "bg-neutral-900 hover:bg-amber-500/30")}
              />

              {/* BOTTOM PANEL */}
              <div className="flex flex-col border-t border-neutral-800 bg-black/30 backdrop-blur-sm flex-shrink-0" style={{ height: terminalHeight }}>
                <div className="flex items-center h-9 px-3 border-b border-neutral-800 justify-between bg-black/20">
                  <div className="flex items-center h-full gap-0.5">
                    <Button variant="ghost" size="sm" onClick={() => setActiveBottomTab("terminal")} className={clsx("h-7 px-2.5 text-[11px] gap-1.5 rounded-sm transition-colors", activeBottomTab === "terminal" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                      <Terminal className="w-3 h-3" />Terminal
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setActiveBottomTab("problems")} className={clsx("h-7 px-2.5 text-[11px] gap-1.5 rounded-sm transition-colors", activeBottomTab === "problems" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                      <AlertCircle className="w-3 h-3" />Problems
                      {problemCount > 0 && <Badge className="ml-0.5 h-4 px-1 text-[9px] bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/20">{problemCount}</Badge>}
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setTerminalLogs([])} className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>

                <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
                  {activeBottomTab === "terminal" && (
                    <div className="space-y-0.5 selection:bg-amber-500/20">
                      {terminalLogs.map((log) => {
                        const isError = log.includes("failed") || log.includes("error") || log.includes("Error");
                        const isSuccess = log.includes("success") || log.includes("Success") || log.includes("deployed") || log.includes("declared");
                        const isWarning = log.includes("warning") || log.includes("Note:");
                        return (
                          <div key={log.slice(0, 50)} className={clsx("flex gap-2 group py-0.5", isError ? "text-red-400" : isSuccess ? "text-emerald-400" : isWarning ? "text-amber-400/80" : "text-neutral-500")}>
                            {isError ? <XCircle className="w-3 h-3 shrink-0 mt-0.5 text-red-500/70" /> : isSuccess ? <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-emerald-500/70" /> : isWarning ? <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500/70" /> : <FileText className="w-3 h-3 shrink-0 mt-0.5 text-neutral-700" />}
                            <div className="flex-1 break-all cursor-text">{renderLogLine(log)}</div>
                          </div>
                        );
                      })}
                      {compilerOutput && (
                        <pre className="mt-4 whitespace-pre-wrap rounded border border-neutral-900 bg-black/30 p-3 text-neutral-400 cursor-text">
                          {renderLogLine(compilerOutput)}
                        </pre>
                      )}
                      {buildStatus === "building" && <div className="text-amber-500 animate-pulse select-none">$ Compiling project...</div>}
                    </div>
                  )}
                  {activeBottomTab === "problems" && (
                    <div className="space-y-3">
                      {(liveDiagnostics.length > 0 || errors.length > 0 || compilerOutput) && (
                        <div className="flex justify-end">
                          <CopyButton
                            text={formatProblemsForCopy(errors, liveDiagnostics, compilerOutput)}
                            label="Copy Problems"
                            onCopy={() =>
                              pushToast({
                                tone: "success",
                                title: "Problems copied",
                                description: "Diagnostics and compiler output were copied to your clipboard.",
                              })
                            }
                          />
                        </div>
                      )}
                      {liveDiagnostics.length > 0 && (
                        <div className="rounded border border-amber-500/10 bg-amber-500/5 p-3">
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">Live Editor Checks</div>
                          <div className="space-y-2">
                            {liveDiagnostics.map((issue, i) => (
                              <div key={`live-${i}`} className="rounded border border-neutral-800 bg-black/20 p-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{issue.severity} at line {issue.line}:{issue.col}</div>
                                <div className="mt-1 text-[12px] leading-relaxed text-neutral-300">{issue.message}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {errors.length > 0 ? (
                        <>
                          <div className="rounded border border-neutral-800 bg-black/20 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Diagnostic Summary</div>
                            <div className="text-[12px] leading-relaxed text-neutral-300">
                              {errors.length} compiler issue{errors.length === 1 ? "" : "s"} detected.
                              {errors[0]?.line > 0 && ` First stop: line ${errors[0].line}:${errors[0].col}.`}
                            </div>
                          </div>
                          {errors.map((err, idx) => (
                            <DiagnosticCard key={idx} error={err} index={idx} onAiFix={handleAiFix} isFixing={isAiFixing} suggestion={aiFixSuggestion?.index === idx ? aiFixSuggestion : null} onApplyFix={applyAiFix} />
                          ))}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-neutral-700">
                          <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                          <p>No problems detected in the current file.</p>
                        </div>
                      )}
                      {compilerOutput && (
                        <div className="rounded border border-neutral-800 bg-black/30 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Full Compiler Trace</div>
                            <CopyButton
                              text={compilerOutput}
                              label="Copy Logs"
                              onCopy={() =>
                                pushToast({
                                  tone: "success",
                                  title: "Logs copied",
                                  description: "The full compiler trace was copied to your clipboard.",
                                })
                              }
                            />
                          </div>
                          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded border border-neutral-900 bg-[#050505] p-3 text-[12px] leading-relaxed text-neutral-300">{compilerOutput}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <AnimatePresence initial={false}>
          {isRightPanelOpen && activeSidebarTab !== "interact" && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-shrink-0 overflow-hidden"
            >
              <div onMouseDown={() => setIsResizingRightPanel(true)} className={clsx("relative w-1 flex-shrink-0 cursor-col-resize transition-colors", isResizingRightPanel ? "bg-amber-500/40" : "bg-neutral-800 hover:bg-amber-500/50")} />
              <div className="flex flex-col h-full flex-1 border-l border-neutral-800 bg-black/20 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center h-10 px-5 bg-black/40 backdrop-blur-xl border-b border-neutral-800 flex-shrink-0 justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">Deploy</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Live</span>
                  </div>
                </div>
                <DeployPanel
                  activeFile={activeFile}
                  activeBuildData={activeBuildData}
                  buildStatus={buildStatus}
                  network={network}
                  netConfig={netConfig}
                  handleNetworkSwitch={handleNetworkSwitch}
                  starknetAccount={starknetAccount}
                  walletAddress={walletAddress}
                  walletType={walletType}
                  disconnectWallet={disconnectWallet}
                  strkBalance={strkBalance}
                  isFetchingBalance={isFetchingBalance}
                  fetchStrkBalance={fetchStrkBalance}
                  setShowAuthModal={setShowAuthModal}
                  deployStatus={deployStatus}
                  deploySteps={deploySteps}
                  classHash={classHash}
                  contractAddress={contractAddress}
                  constructorInputs={constructorInputs}
                  setConstructorInputs={setConstructorInputs}
                  salt={salt}
                  setSalt={setSalt}
                  handleDeclare={handleDeclare}
                  handleDeploy={handleDeploy}
                  onReset={() => { setDeployStatus("idle"); setClassHash(""); setContractAddress(""); setDeploySteps([]); setConstructorInputs({}); }}
                  isWalletConnecting={isWalletConnecting}
                  notify={pushToast}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md">
              <AuthModal
                authenticated={authenticated}
                isConnecting={isWalletConnecting}
                walletError={walletError}
                onPrivyConnect={connectPrivyWallet}
                onExtensionConnect={connectExtensionWallet}
                onClose={() => { setShowAuthModal(false); setWalletError(null); }}
                networkLabel={netConfig.label}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAccountModal && walletAddress && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAccountModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md">
              <AccountModal
                address={walletAddress}
                walletType={walletType === "privy" ? "privy" : "extension"}
                mainnetBalance={mainnetBalance}
                sepoliaBalance={sepoliaBalance}
                onDisconnect={() => { disconnectWallet(); setShowAccountModal(false); }}
                onClose={() => setShowAccountModal(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DeployAccountPrompt
        isOpen={showDeployAccountPrompt}
        onClose={() => setShowDeployAccountPrompt(false)}
        networkLabel={netConfig.label}
        isDeployingAccount={isDeployingAccount}
        onDeployAccount={handleDeployAccount}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      {/* ── STATUS BAR ── */}
      <div className="flex items-center justify-between h-7 px-3 text-[10px] border-t border-neutral-800 bg-black/40 backdrop-blur-xl text-muted-foreground select-none transition-colors">
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-1.5 h-full px-2 hover:bg-white/5 cursor-pointer transition-colors group" onClick={() => handleNetworkSwitch(network === "mainnet" ? "sepolia" : "mainnet")} title={`Switch to ${network === "mainnet" ? "Sepolia testnet" : "Mainnet"}`}>
            <Box className={clsx("w-3 h-3 group-hover:scale-110 transition-transform", accentColor)} />
            <span className="font-medium group-hover:text-neutral-400">{network === "mainnet" ? "Mainnet" : "Sepolia"}</span>
          </div>
          <div className="flex items-center gap-1.5 h-full px-2 hover:bg-white/5 cursor-pointer transition-colors group">
            <Activity className="w-3 h-3 group-hover:scale-110 transition-transform" />
            <span className="font-medium group-hover:text-neutral-400">main*</span>
          </div>
          <div className="flex items-center gap-1.5 h-full px-2 hover:bg-white/5 cursor-pointer transition-colors group" onClick={() => setActiveBottomTab("problems")}>
            <AlertCircle className={clsx("w-3 h-3 transition-transform", problemCount > 0 ? "text-red-500" : "text-neutral-700")} />
            <span className={clsx("font-medium", problemCount > 0 ? "text-neutral-400" : "text-neutral-700")}>{problemCount}</span>
          </div>
          <div className="w-px h-3 bg-neutral-800/50" />
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-500"><span>Ln {cursorLine}, Col {cursorCol}</span></div>
        </div>
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase tracking-widest font-bold">UTF-8</span>
            <div className="w-px h-3 bg-neutral-800/50" />
            <span className={clsx("text-[9px] font-black uppercase tracking-[0.2em]", accentColor)}>Cairo</span>
          </div>
          <div className="w-px h-3 bg-neutral-800/50" />
          {walletType ? (
            <button onClick={() => { setShowAccountModal(true); fetchDualBalances(walletAddress); }} className={clsx("flex items-center gap-1.5 font-bold hover:opacity-80 transition-opacity", walletType === "privy" ? "text-amber-400/90" : "text-sky-400/90")}>
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span>{walletType === "privy" ? "Privy" : "Extension"} · {walletAddress.slice(0, 8)}...</span>
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 font-bold text-neutral-600 hover:text-amber-400 transition-colors">
              <Shield className="w-3 h-3" />
              <span>No Wallet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
