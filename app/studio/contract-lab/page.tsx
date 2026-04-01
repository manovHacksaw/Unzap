"use client";

import { useState, useCallback, useRef, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import { useNetwork, NetworkProvider } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import { WalletAccount, RpcProvider, Account, hash, Contract } from "starknet";

// UDC constants (starknet.js re-exports locally but doesn't export at package level)
const UDC_ADDRESS = "0x02ceed65a4bd731034c01113685c831b01c15d7d432f71afb1cf1634b53a2125";
const UDC_ENTRYPOINT = "deploy_contract";
import {
  Files,
  Settings,
  Search,
  Box,
  History,
  Info,
  ChevronDown,
  FileCode,
  Layout,
  Activity,
  Maximize2,
  MoreVertical,
  Cpu,
  Globe,
  Zap,
  Shield,
  Code2,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Database,
  RefreshCw,
  X,
  Copy,
  Check,
  Edit2,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { clsx } from "clsx";

// ── Types & Constants ─────────────────────────────────────────────────────────

const COMPILER_URL = process.env.NEXT_PUBLIC_COMPILER_URL ?? "http://localhost:3001";
const CONTRACT_LAB_DRAFT_KEY = "unzap:contract-lab:draft";
const CONTRACT_LAB_SETTINGS_KEY = "unzap:contract-lab:settings";
const CONTRACT_LAB_DRAFT_VERSION = 2;
const STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

type SzWalletType = Awaited<ReturnType<StarkZap["onboard"]>>["wallet"];

type DeployStepStatus = "idle" | "active" | "done" | "error";
interface DeployStep {
  id: string;
  label: string;
  detail?: string;
  status: DeployStepStatus;
}

interface IDESettings {
  theme: "amber" | "emerald" | "azure" | "mono";
  fontSize: number;
  showLineNumbers: boolean;
  autoSave: boolean;
  lineWrapping: boolean;
}

const DEFAULT_SETTINGS: IDESettings = {
  theme: "amber",
  fontSize: 13,
  showLineNumbers: true,
  autoSave: true,
  lineWrapping: false,
};

const INITIAL_FILES = [
  {
    id: "storage-1",
    filename: "simple_storage.cairo",
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
];

interface CompileError {
  message: string;
  line: number;
  col: number;
}

interface ExplorerContextMenuState {
  x: number;
  y: number;
  fileId: string | null;
}

interface ExplorerEntry {
  id: string;
  filename: string;
  source: string;
  readonly?: boolean;
  kind: "source" | "artifact";
  sourceFileId?: string;
}

interface SearchMatch {
  index: number;
  line: number;
  col: number;
  preview: string;
}

interface ContractLabDraft {
  version: number;
  files: typeof INITIAL_FILES;
  activeFileId: string;
  buildOutputsByFile: Record<string, CompileSuccess>;
  updatedAt: number;
}

interface CompileSuccess {
  sierra: any;
  casm: any;
  abi: any[];
  logs: string;
}

interface CompileFailure {
  errors?: CompileError[];
  logs?: string;
}

interface LiveDiagnostic extends CompileError {
  severity: "warning" | "hint";
}

type BuildStatus = "idle" | "building" | "success" | "error";
type DeployStatus = "idle" | "declaring" | "declared" | "deploying" | "deployed";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function classifyToken(token: string, theme: "amber" | "emerald" | "azure" | "mono" = "amber") {
  const isMono = theme === "mono";
  if (token.startsWith("//")) return "text-neutral-600";

  if (isMono) {
    if (token.startsWith("#[")) return "text-white opacity-80 underline decoration-neutral-700";
    if (token.startsWith("'") || token.startsWith("\"")) return "text-neutral-200 font-bold";
    if (/^(fn|trait|mod|struct|impl|use|let|ref|const|enum|match|if|else|assert|return|of|self)$/.test(token)) {
      return "text-white font-black underline decoration-white/20";
    }
    if (/^(felt252|u64|u128|u256|bool|ContractState|ContractAddress|Map)$/.test(token)) {
      return "text-neutral-300 font-bold italic";
    }
    if (/^\d/.test(token)) return "text-neutral-400";
    return "text-neutral-400";
  }

  const colors = {
    amber: { attr: "text-amber-400", kw: "text-amber-300", type: "text-sky-300", str: "text-emerald-400" },
    emerald: { attr: "text-emerald-400", kw: "text-emerald-300", type: "text-neutral-100", str: "text-sky-300" },
    azure: { attr: "text-sky-400", kw: "text-sky-300", type: "text-emerald-300", str: "text-fuchsia-400" },
  }[(theme === "mono" ? "amber" : theme) as "amber"];

  if (token.startsWith("#[")) return colors.attr;
  if (token.startsWith("'") || token.startsWith("\"")) return colors.str;
  if (/^(fn|trait|mod|struct|impl|use|let|ref|const|enum|match|if|else|assert|return|of|self)$/.test(token)) {
    return colors.kw;
  }
  if (/^(felt252|u64|u128|u256|bool|ContractState|ContractAddress|Map)$/.test(token)) {
    return colors.type;
  }
  if (/^\d/.test(token)) return "text-fuchsia-300";
  if (/^[A-Z][A-Za-z0-9_]*$/.test(token)) return "text-neutral-100";
  if (/^[{}[\]();,.<>:+\-*/=&!@]+$/.test(token)) return "text-neutral-500";
  return "text-neutral-300";
}

function highlightCairo(source: string, theme: any) {
  const tokenRegex =
    /(\/\/.*$|#\[[^\]]*\]|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:fn|trait|mod|struct|impl|use|let|ref|const|enum|match|if|else|assert|return|of|self)\b|\b(?:felt252|u64|u128|u256|bool|ContractState|ContractAddress|Map)\b|\b\d+(?:_\d+)*\b|[A-Z][A-Za-z0-9_]*|[{}[\]();,.<>:+\-*/=&!@]+)/gm;

  let cursor = 0;
  let html = "";
  for (const match of source.matchAll(tokenRegex)) {
    const index = match.index ?? 0;
    const token = match[0];
    html += escapeHtml(source.slice(cursor, index));
    html += `<span class="${classifyToken(token, theme)}">${escapeHtml(token)}</span>`;
    cursor = index + token.length;
  }
  html += escapeHtml(source.slice(cursor));
  return `${html}${source.endsWith("\n") ? " " : ""}`;
}

function getLiveDiagnostics(source: string): LiveDiagnostic[] {
  const diagnostics: LiveDiagnostic[] = [];
  const lines = source.split("\n");
  const stack: Array<{ symbol: string; line: number; col: number }> = [];
  const openToClose: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const closeToOpen: Record<string, string> = { ")": "(", "}": "{", "]": "[" };

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    if (line.trim().startsWith("#[") && !line.trim().endsWith("]")) {
      diagnostics.push({
        message: "Attribute looks incomplete. Did you forget the closing ']'?",
        line: lineNumber,
        col: Math.max(line.length, 1),
        severity: "warning",
      });
    }

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char in openToClose) stack.push({ symbol: char, line: lineNumber, col: i + 1 });
      if (char in closeToOpen) {
        const previous = stack.pop();
        if (!previous || previous.symbol !== closeToOpen[char]) {
          diagnostics.push({
            message: `Unexpected '${char}'`,
            line: lineNumber,
            col: i + 1,
            severity: "warning",
          });
        }
      }
    }

    if (/\t/.test(line)) {
      diagnostics.push({
        message: "Tab indentation can make Cairo formatting inconsistent. Prefer spaces.",
        line: lineNumber,
        col: line.indexOf("\t") + 1,
        severity: "hint",
      });
    }

    if (/\s+$/.test(line) && line.trim()) {
      diagnostics.push({
        message: "Trailing whitespace",
        line: lineNumber,
        col: line.length,
        severity: "hint",
      });
    }
  });

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) break;
    diagnostics.push({
      message: `Missing '${openToClose[item.symbol]}' to close '${item.symbol}'`,
      line: item.line,
      col: item.col,
      severity: "warning",
    });
  }

  if (!source.includes("#[starknet::contract]")) {
    diagnostics.push({
      message: "Missing #[starknet::contract] attribute.",
      line: 1,
      col: 1,
      severity: "hint",
    });
  }

  if (!source.includes("#[storage]")) {
    diagnostics.push({
      message: "No #[storage] block found. Stateful contracts usually define storage.",
      line: 1,
      col: 1,
      severity: "hint",
    });
  }

  return diagnostics;
}

function getSearchMatches(source: string, query: string): SearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const lines = source.split("\n");
  const matches: SearchMatch[] = [];

  lines.forEach((line, lineIndex) => {
    const haystack = line.toLowerCase();
    let fromIndex = 0;
    while (fromIndex < haystack.length) {
      const hit = haystack.indexOf(normalizedQuery, fromIndex);
      if (hit === -1) break;
      matches.push({
        index: matches.length,
        line: lineIndex + 1,
        col: hit + 1,
        preview: line.trim() || "(blank line)",
      });
      fromIndex = hit + normalizedQuery.length;
    }
  });

  return matches;
}

// ── Components ────────────────────────────────────────────────────────────────

const PanelHeader = ({ title, children, icon: Icon }: any) => (
  <div className="flex items-center justify-between px-4 h-9 bg-[#0d0d0d] border-b border-neutral-900 flex-shrink-0 select-none">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-500" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</span>
    </div>
    <div className="flex items-center gap-1">{children}</div>
  </div>
);

const TabButton = ({ active, onClick, label, badge, theme = "amber" }: any) => {
  const accentClass = {
    amber: "after:bg-amber-500",
    emerald: "after:bg-emerald-500",
    azure: "after:bg-sky-500",
    mono: "after:bg-white",
  }[theme as "amber"];

  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 h-full text-[10px] font-bold uppercase tracking-widest relative transition-colors",
        active
          ? "text-neutral-200 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] " + accentClass
          : "text-neutral-600 hover:text-neutral-400"
      )}
    >
      {label}
      {badge && (
        <span className="ml-1.5 px-1 rounded-full bg-neutral-800 text-[8px] text-neutral-500">{badge}</span>
      )}
    </button>
  );
};

const CopyButton = ({ text, label }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-neutral-400 flex items-center gap-1.5"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {label && <span className="text-[9px] uppercase font-mono">{copied ? "Copied" : label}</span>}
    </button>
  );
};

const DiagnosticCard = ({ error }: { error: CompileError }) => (
  <div className="rounded border border-red-500/10 bg-red-500/5 p-3 text-red-300">
    <div className="mb-2 flex items-center gap-2">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <div className="text-[10px] font-bold uppercase tracking-wider">
        {error.line > 0 ? `Error at line ${error.line}:${error.col}` : "Compiler error"}
      </div>
    </div>
    <div className="whitespace-pre-wrap text-[12px] leading-relaxed">{error.message}</div>
  </div>
);

function formatProblemsForCopy(errors: CompileError[], liveDiagnostics: LiveDiagnostic[], compilerOutput: string) {
  const sections: string[] = [];

  if (liveDiagnostics.length > 0) {
    sections.push(
      [
        "LIVE EDITOR CHECKS",
        ...liveDiagnostics.map(
          (issue) => `[${issue.severity.toUpperCase()}] Line ${issue.line}:${issue.col} ${issue.message}`
        ),
      ].join("\n")
    );
  }

  if (errors.length > 0) {
    sections.push(
      [
        "COMPILER DIAGNOSTICS",
        ...errors.map((error) => `Line ${error.line}:${error.col} ${error.message}`),
      ].join("\n")
    );
  }

  if (compilerOutput.trim()) {
    sections.push(`FULL COMPILER TRACE\n${compilerOutput.trim()}`);
  }

  return sections.join("\n\n");
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StarkzapIDE() {
  // --- Privy Auth ---
  const { login, logout, authenticated, getAccessToken, user } = usePrivy();

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

  // --- Wallet state ---
  const [szWallet, setSzWallet] = useState<SzWalletType | null>(null);
  const [starknetAccount, setStarknetAccount] = useState<Account | WalletAccount | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletType, setWalletType] = useState<"privy" | "extension" | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [strkBalance, setStrkBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [constructorInputs, setConstructorInputs] = useState<Record<string, string>>({});
  const [deploySteps, setDeploySteps] = useState<DeployStep[]>([]);
  const [salt, setSalt] = useState("0");

  // --- State ---
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState(INITIAL_FILES[0].id);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [buildOutputsByFile, setBuildOutputsByFile] = useState<Record<string, CompileSuccess>>({});
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [compilerOutput, setCompilerOutput] = useState("");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [contractAddress, setContractAddress] = useState("");
  const [classHash, setClassHash] = useState("");
  const [history, setHistory] = useState<{ deployments: any[], transactions: any[] }>({ deployments: [], transactions: [] });
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeSidebarTab, setActiveSidebarTab] = useState("explorer");
  const [activeRightTab, setActiveRightTab] = useState("deploy");
  const [activeBottomTab, setActiveBottomTab] = useState("terminal");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [isDraftHydrating, setIsDraftHydrating] = useState(true);
  const [draftStorageMode, setDraftStorageMode] = useState<"local" | "restored-local">("local");

  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[system] Starkzap Dev Studio v0.1.0 ready."]);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [explorerSearchQuery, setExplorerSearchQuery] = useState("");
  const [codeSearchQuery, setCodeSearchQuery] = useState("");
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  const [settings, setSettings] = useState<IDESettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const centerPaneRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const draftHydratedRef = useRef(false);

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
        {
          id: `artifact-${file.id}-abi`,
          filename: `${artifactBaseName}.abi.json`,
          source: JSON.stringify(buildOutput.abi, null, 2),
          readonly: true,
          kind: "artifact" as const,
          sourceFileId: file.id,
        },
        {
          id: `artifact-${file.id}-sierra`,
          filename: `${artifactBaseName}.sierra.json`,
          source: JSON.stringify(buildOutput.sierra, null, 2),
          readonly: true,
          kind: "artifact" as const,
          sourceFileId: file.id,
        },
        {
          id: `artifact-${file.id}-casm`,
          filename: `${artifactBaseName}.casm.json`,
          source: JSON.stringify(buildOutput.casm, null, 2),
          readonly: true,
          kind: "artifact" as const,
          sourceFileId: file.id,
        },
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
  const filteredExplorerFiles = useMemo(() => {
    const query = explorerSearchQuery.trim().toLowerCase();
    if (!query) return explorerFiles;
    return explorerFiles.filter((file) => file.filename.toLowerCase().includes(query));
  }, [explorerFiles, explorerSearchQuery]);
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
  const addLog = (msg: string) => setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const appendCompilerOutput = (logs?: string) => {
    const normalized = logs?.trim();
    if (!normalized) return;
    setCompilerOutput(normalized);
  };

  const updateSource = (val: string) => {
    if (activeFile?.readonly) return;
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, source: val } : f)));
  };

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
    const newFile = {
      id: newId,
      filename: "untitled.cairo",
      source: "// New Cairo Contract\n",
    };
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
    if (activeFileId === id) {
      setActiveFileId(newFiles[0].id);
    }
  };

  const startRename = (e: React.MouseEvent, file: any) => {
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

  const handleBuild = async () => {
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
      } else {
        setBuildStatus("success");
        setBuildOutputsByFile((prev) => ({ ...prev, [activeSourceFile.id]: json as CompileSuccess }));
        appendCompilerOutput(json.logs);
        addLog(`Build successful! Sierra and ABI generated.`);
      }
    } catch (e) {
      setBuildStatus("error");
      setErrors([{ message: e instanceof Error ? e.message : "Network error", line: 0, col: 0 }]);
      addLog(`Build failed: Network or server error.`);
    }
  };

  // --- Wallet connection helpers ---
  const connectPrivyWallet = async () => {
    if (!authenticated) {
      login();
      return;
    }
    setIsWalletConnecting(true);
    setWalletError(null);
    try {
      const accessToken = await getAccessToken();
      const { wallet: szWallet } = await sdkRef.current!.onboard({
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
        deploy: "if_needed",
      });
      setSzWallet(szWallet);
      setStarknetAccount(szWallet.getAccount() as unknown as Account);
      setWalletAddress(szWallet.address);
      setWalletType("privy");
      setShowAuthModal(false);
      addLog(`Privy wallet connected: ${szWallet.address.slice(0, 10)}...`);
      fetchStrkBalance(szWallet.address);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const connectExtensionWallet = async () => {
    setIsWalletConnecting(true);
    setWalletError(null);
    try {
      const swo = (window as unknown as { starknet?: { id?: string; name?: string; request: (args: { type: string; params?: unknown }) => Promise<string[]> } }).starknet;
      if (!swo) throw new Error("No Starknet browser extension found. Install ArgentX or Braavos.");
      const provider = sdkRef.current!.getProvider();
      const walletAccount = await WalletAccount.connect(provider, swo as Parameters<typeof WalletAccount.connect>[1]);
      setStarknetAccount(walletAccount);
      setWalletAddress(walletAccount.address);
      setWalletType("extension");
      setShowAuthModal(false);
      addLog(`Extension wallet connected: ${walletAccount.address.slice(0, 10)}...`);
      fetchStrkBalance(walletAccount.address);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Extension connection failed");
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const fetchStrkBalance = async (address: string) => {
    setIsFetchingBalance(true);
    try {
      const provider = sdkRef.current!.getProvider();
      const result = await provider.callContract({
        contractAddress: STRK_TOKEN,
        entrypoint: "balanceOf",
        calldata: [address],
      });
      // u256 serialises as [low, high] — both are hex strings in starknet.js v9
      const low = BigInt(result[0] ?? "0x0");
      const high = BigInt(result[1] ?? "0x0");
      const raw = low + high * (BigInt(2) ** BigInt(128));
      setStrkBalance((Number(raw) / 1e18).toFixed(4));
    } catch {
      setStrkBalance(null);
    } finally {
      setIsFetchingBalance(false);
    }
  };

  const disconnectWallet = () => {
    if (walletType === "privy") logout();
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setStrkBalance(null);
    setDeploySteps([]);
    setHistory({ deployments: [], transactions: [] });
    addLog("Wallet disconnected.");
  };

  const syncToCloud = async () => {
    if (!authenticated) return;
    setIsSyncing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Default Project",
          files: files,
        }),
      });
      if (!res.ok) throw new Error("Sync failed");
      addLog("Project synced to cloud.");
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchCloudData = async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      // Fetch projects
      const pRes = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pRes.ok) {
        const projects = await pRes.json();
        if (projects.length > 0) {
          const latest = projects[0];
          setFiles(latest.files);
          setActiveFileId(latest.files[0].id);
          addLog("Restored project from cloud.");
        }
      }
      // Fetch history
      const hRes = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (hRes.ok) {
        setHistory(await hRes.json());
      }
    } catch (e) {
      console.error("Fetch cloud data error:", e);
    }
  };

  const logTransaction = async (data: any) => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "transaction", data }),
      });
      // Refresh local history
      const hRes = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (hRes.ok) setHistory(await hRes.json());
    } catch (e) {
      console.error("Log transaction error:", e);
    }
  };

  const logDeployment = async (data: any) => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "deployment", data }),
      });
      // Refresh local history
      const hRes = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (hRes.ok) setHistory(await hRes.json());
    } catch (e) {
      console.error("Log deployment error:", e);
    }
  };

  const setDeployStep = (id: string, status: DeployStepStatus, detail?: string) => {
    setDeploySteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, ...(detail ? { detail } : {}) } : s))
    );
  };

  // --- Real declare ---
  const handleDeclare = async () => {
    if (!starknetAccount) {
      setShowAuthModal(true);
      return;
    }
    if (!activeBuildData) {
      addLog("Build the contract first (Ctrl+S).");
      return;
    }
    if (deployStatus !== "idle") return;

    const steps: DeployStep[] = [
      { id: "check", label: "Checking wallet", status: "idle" },
      { id: "sign", label: "Signing declare tx", status: "idle" },
      { id: "broadcast", label: `Confirmed on ${netConfig.label}`, status: "idle" },
      { id: "confirm", label: "Class hash ready", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("declaring");
    setActiveRightTab("deploy");
    setActiveBottomTab("terminal");
    addLog(`Declaring contract on ${netConfig.label}...`);

    try {
      setDeployStep("check", "active");
      addLog(`Using wallet: ${walletAddress.slice(0, 14)}...`);
      setDeployStep("check", "done");

      setDeployStep("sign", "active");

      addLog("Sending declare transaction (sierra + casm)...");
      const declareResult = await (starknetAccount as Account).declare({
        contract: activeBuildData.sierra,
        casm: activeBuildData.casm,
      });
      setDeployStep("sign", "done", `tx: ${declareResult.transaction_hash.slice(0, 10)}...`);
      addLog(`Declare tx: ${declareResult.transaction_hash}`);
      setDeployStep("broadcast", "active");
      await (starknetAccount as Account).waitForTransaction(declareResult.transaction_hash);
      setDeployStep("broadcast", "done");
      const cHash = declareResult.class_hash;

      setDeployStep("confirm", "active");
      setClassHash(cHash);
      setDeployStep("confirm", "done", `class hash: ${cHash.slice(0, 10)}...`);
      setDeployStatus("declared");
      addLog(`Declare success! Class Hash: ${cHash}`);
      addLog(`Explorer: ${netConfig.starkscan}/class/${cHash}`);
      logTransaction({
        hash: declareResult.transaction_hash,
        type: "declare",
        status: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Class already declared — recover by computing the hash locally
      if (msg.includes("CLASS_ALREADY_DECLARED") || msg.includes("already declared") || msg.includes("already exists")) {
        try {
          const cHash = hash.computeSierraContractClassHash(activeBuildData.sierra);
          setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "done", detail: "already declared" } : s));
          setClassHash(cHash);
          setDeployStatus("declared");
          addLog("Class already declared on-chain — reusing existing class hash.");
          addLog(`Class Hash: ${cHash}`);
          return;
        } catch { /* fall through to error */ }
      }
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("idle");
      addLog(`Declare failed: ${msg}`);
    }
  };

  // --- Real deploy via UDC ---
  const handleDeploy = async () => {
    if (!starknetAccount || !classHash || deployStatus !== "declared") return;

    const constructorAbi = activeBuildData?.abi?.find((entry: { type: string; name: string }) => entry.type === "constructor");
    const constructorParams: Array<{ name: string; type: string }> = constructorAbi?.inputs ?? [];
    const calldata = constructorParams.map((p: { name: string; type: string }) => constructorInputs[p.name] ?? "0");
    const effectiveSalt = salt || "0";
    // unique=true: address = calculateContractAddressFromHash(hash(account, salt), classHash, calldata, UDC_ADDRESS)
    const predictedAddress = hash.calculateContractAddressFromHash(
      hash.computePedersenHash(walletAddress, effectiveSalt),
      classHash,
      calldata,
      UDC_ADDRESS,
    );

    const steps: DeployStep[] = [
      { id: "udc", label: walletType === "privy" ? "Preparing sponsored UDC call" : "Preparing UDC call", status: "idle" },
      { id: "sign", label: walletType === "privy" ? "Gasless via AVNU paymaster" : "Signing deploy transaction", status: "idle" },
      { id: "broadcast", label: `Broadcasting to ${netConfig.label}`, status: "idle" },
      { id: "confirm", label: "Contract deployed", status: "idle" },
    ];
    setDeploySteps(steps);
    setDeployStatus("deploying");
    addLog(`Deploying via UDC${walletType === "privy" ? " (gasless — AVNU paymaster)" : ""}...`);

    try {
      setDeployStep("udc", "active");
      addLog(`Class hash: ${classHash}`);
      addLog(`Constructor args: [${calldata.join(", ")}]`);
      addLog(`Predicted address: ${predictedAddress}`);
      setDeployStep("udc", "done");

      setDeployStep("sign", "active");

      let txHash = "";
      if (walletType === "privy" && szWallet) {
        // Gasless path: call UDC via starkzap wallet with sponsored fee mode
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
        await tx.wait();
        setDeployStep("broadcast", "done");
      } else {
        // Extension wallet: user pays, use starknet.js deployContract
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
        await (starknetAccount as Account).waitForTransaction(deployResult.transaction_hash);
        setDeployStep("broadcast", "done");
      }

      setDeployStep("confirm", "active");
      setContractAddress(predictedAddress);
      setDeployStep("confirm", "done", `address: ${predictedAddress.slice(0, 10)}...`);
      setDeployStatus("deployed");
      addLog(`Deploy success! Contract: ${predictedAddress}`);
      addLog(`View on explorer: ${netConfig.starkscan}/contract/${predictedAddress}`);
      setActiveRightTab("interact");

      logDeployment({
        contractAddress: predictedAddress,
        classHash: classHash,
        abi: activeBuildData?.abi,
        name: activeFile?.filename,
      });
      logTransaction({
        hash: txHash,
        type: "deploy",
        status: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("declared");
      addLog(`Deploy failed: ${msg}`);
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
    // Ctrl/Cmd+S → build
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
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = selectionStart + 4;
        });
      } else {
        const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        const leadingSpaces = value.slice(lineStart).match(/^ {1,4}/)?.[0]?.length ?? 0;
        if (leadingSpaces > 0) {
          const next = value.slice(0, lineStart) + value.slice(lineStart + leadingSpaces);
          updateSource(next);
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = Math.max(selectionStart - leadingSpaces, lineStart);
          });
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

    const onMouseMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      setRightPanelWidth(Math.min(Math.max(nextWidth, 260), 520));
    };

    const onMouseUp = () => setIsResizingRightPanel(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
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
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizingTerminal]);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawDraft = window.localStorage.getItem(CONTRACT_LAB_DRAFT_KEY);
      if (!rawDraft) {
        draftHydratedRef.current = true;
        setIsDraftHydrating(false);
        return;
      }

      const parsed = JSON.parse(rawDraft) as ContractLabDraft;
      if (
        parsed.version !== CONTRACT_LAB_DRAFT_VERSION ||
        !Array.isArray(parsed.files) ||
        parsed.files.length === 0 ||
        typeof parsed.activeFileId !== "string"
      ) {
        draftHydratedRef.current = true;
        setIsDraftHydrating(false);
        return;
      }

      const validFiles = parsed.files.filter(
        (file): file is (typeof INITIAL_FILES)[number] =>
          !!file &&
          typeof file.id === "string" &&
          typeof file.filename === "string" &&
          typeof file.source === "string"
      );

      if (validFiles.length > 0) {
        setFiles(validFiles);
        setActiveFileId(
          validFiles.some((file) => file.id === parsed.activeFileId)
            ? parsed.activeFileId
            : validFiles[0].id
        );
        const restoredBuildOutputs =
          parsed.buildOutputsByFile && typeof parsed.buildOutputsByFile === "object"
            ? parsed.buildOutputsByFile
            : {};
        setBuildOutputsByFile(restoredBuildOutputs);
        // Mark build as success if the active file already has artifacts
        const activeRestoredId = validFiles.some((f) => f.id === parsed.activeFileId)
          ? parsed.activeFileId
          : validFiles[0].id;
        if (restoredBuildOutputs[activeRestoredId]) {
          setBuildStatus("success");
        }
        setDraftStorageMode("restored-local");
        setTerminalLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Restored ${validFiles.length} file(s) from local browser draft.`,
        ]);
      }
    } catch {
      // Ignore malformed drafts and continue with defaults.
    } finally {
      draftHydratedRef.current = true;
      setIsDraftHydrating(false);
    }
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

  useEffect(() => {
    if (authenticated) {
      fetchCloudData();
    }
  }, [authenticated]);

  // Periodic autosave to cloud if authenticated
  useEffect(() => {
    if (!authenticated || files.length === 0) return;
    const timer = setTimeout(() => {
      syncToCloud();
    }, 10000); // Autosave every 10s of inactivity
    return () => clearTimeout(timer);
  }, [files, authenticated]);

  const accentColor = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    azure: "text-sky-500",
    mono: "text-white",
  }[settings.theme];

  const accentBg = {
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    azure: "bg-sky-500",
    mono: "bg-white",
  }[settings.theme];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-neutral-400 font-sans select-none overflow-hidden">
      {/* ── TOP WORKFLOW CONTROL ── */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-neutral-900 bg-[#0a0a0a] flex-shrink-0 z-20">
        <div className="flex items-center gap-8 h-full">
          <div className="flex items-center gap-2.5 group cursor-pointer pr-4 border-r border-neutral-900/50 h-6">
            <Zap className={clsx("w-3.5 h-3.5 transition-colors", accentColor, settings.theme !== 'mono' && "fill-current")} />
            <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase opacity-80 group-hover:opacity-100 transition-opacity">Starkzap Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={clsx(
            "h-6 px-2.5 rounded-md border text-[9px] font-mono flex items-center gap-2 transition-all",
            buildStatus === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80" :
              buildStatus === "error" ? "border-red-500/20 bg-red-500/5 text-red-400/80" :
                buildStatus === "building" ? "border-amber-500/20 bg-amber-500/5 text-amber-400/80" :
                  "border-neutral-800/50 bg-neutral-900/30 text-neutral-600"
          )}>
            <div className={clsx(
              "w-1 h-1 rounded-full",
              buildStatus === "success" ? "bg-emerald-500" :
                buildStatus === "error" ? "bg-red-500" :
                  buildStatus === "building" ? "bg-amber-500 animate-pulse" : "bg-neutral-700"
            )} />
            {buildStatus === "idle" ? "IDLE" : buildStatus.toUpperCase()}
          </div>

          <div className="h-4 w-[1px] bg-neutral-800" />

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-neutral-400"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90]"
            />
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="fixed right-0 top-0 bottom-0 w-[380px] bg-[#0d0d0d] border-l border-neutral-900 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <Settings className={clsx("w-5 h-5", accentColor)} />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">IDE Settings</h2>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-neutral-600" />
                </button>
              </div>

              <div className="flex-1 space-y-12 overflow-y-auto no-scrollbar pb-10">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Interface Theme</span>
                  <div className="grid grid-cols-2 gap-3">
                    {(["amber", "emerald", "azure", "mono"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateSetting("theme", t)}
                        className={clsx(
                          "p-3 rounded-xl border transition-all text-left group",
                          settings.theme === t ? "border-white/20 bg-white/5" : "border-neutral-900 bg-black/20 hover:border-neutral-800"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={clsx(
                            "w-2 h-2 rounded-full",
                            t === "amber" ? "bg-amber-500" :
                              t === "emerald" ? "bg-emerald-500" :
                                t === "azure" ? "bg-sky-500" : "bg-white"
                          )} />
                          <span className={clsx("text-xs font-bold capitalize", settings.theme === t ? "text-white" : "text-neutral-500")}>{t}</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                          <div className={clsx("h-full w-1/2",
                            t === "amber" ? "bg-amber-500/30" :
                              t === "emerald" ? "bg-emerald-500/30" :
                                t === "azure" ? "bg-sky-500/30" : "bg-white/30"
                          )} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor Preferences */}
                <div className="space-y-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Editor Configuration</span>

                  <div className="p-5 rounded-2xl bg-black/20 border border-neutral-900 space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-neutral-400">Font Size</label>
                        <span className="text-[11px] font-mono text-white">{settings.fontSize}px</span>
                      </div>
                      <input
                        type="range" min="10" max="24" step="1"
                        value={settings.fontSize}
                        onChange={(e) => updateSetting("fontSize", parseInt(e.target.value))}
                        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[11px] text-neutral-400">Line Numbers</label>
                        <p className="text-[9px] text-neutral-600">Display gutter line count</p>
                      </div>
                      <button
                        onClick={() => updateSetting("showLineNumbers", !settings.showLineNumbers)}
                        className={clsx("w-9 h-5 rounded-full relative transition-colors", settings.showLineNumbers ? accentBg : "bg-neutral-800")}
                      >
                        <motion.div
                          animate={{ x: settings.showLineNumbers ? 18 : 2 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-[11px] text-neutral-400">Word Wrap</label>
                        <p className="text-[9px] text-neutral-600">Wrap long lines to viewport</p>
                      </div>
                      <button
                        onClick={() => updateSetting("lineWrapping", !settings.lineWrapping)}
                        className={clsx("w-9 h-5 rounded-full relative transition-colors", settings.lineWrapping ? accentBg : "bg-neutral-800")}
                      >
                        <motion.div
                          animate={{ x: settings.lineWrapping ? 18 : 2 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Automation */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Automation</span>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-900 bg-black/20">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-neutral-600" />
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-neutral-400">Auto Save</div>
                        <p className="text-[9px] text-neutral-600">Sync drafts to browser local storage</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting("autoSave", !settings.autoSave)}
                      className={clsx("w-8 h-4 rounded-full relative transition-colors", settings.autoSave ? accentBg : "bg-neutral-800")}
                    >
                      <motion.div
                        animate={{ x: settings.autoSave ? 18 : 2 }}
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-neutral-900">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className={clsx("w-full py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all", accentBg, settings.theme === 'mono' ? "text-black" : "text-black")}
                >
                  Apply Settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* ── ACTIVITY BAR ── */}
        <div className="flex flex-col items-center w-12 border-r border-neutral-900 bg-[#0a0a0a] py-4 gap-4 flex-shrink-0">
          <ActivityIcon icon={Files} active={activeSidebarTab === "explorer"} onClick={() => { setActiveSidebarTab("explorer"); setIsSidebarOpen(true); }} />
          <ActivityIcon icon={Search} active={activeSidebarTab === "search"} onClick={() => { setActiveSidebarTab("search"); setIsSidebarOpen(true); }} />
          <ActivityIcon icon={Database} active={activeSidebarTab === "deployments"} onClick={() => { setActiveSidebarTab("deployments"); setIsSidebarOpen(true); }} />
          <ActivityIcon icon={History} active={activeSidebarTab === "history"} onClick={() => { setActiveSidebarTab("history"); setIsSidebarOpen(true); }} />
          <div className="flex-1" />
          <ActivityIcon icon={Layout} active={isRightPanelOpen} onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} />
        </div>

        {/* ── LEFT SIDEBAR (Explorer) ── */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-col border-r border-neutral-900 bg-[#0d0d0d] overflow-hidden flex-shrink-0"
            >
              <PanelHeader title={activeSidebarTab === "explorer" ? "Explorer" : activeSidebarTab}>
                <div className="flex items-center gap-0.5">
                  <button onClick={createFile} className="p-1 hover:bg-white/5 rounded transition-colors" title="New File">
                    <FilePlus className="w-3.5 h-3.5 text-neutral-600" />
                  </button>
                  <button className="p-1 hover:bg-white/5 rounded transition-colors" title="New Folder">
                    <FolderPlus className="w-3.5 h-3.5 text-neutral-600" />
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded transition-colors">
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </PanelHeader>

              <div className="flex-1 overflow-y-auto" onContextMenu={(e) => openContextMenu(e, null)}>
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
                            <button onClick={(e) => startRename(e, f)} className="p-0.5 hover:text-white">
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button onClick={(e) => deleteFile(e, f.id)} className="p-0.5 hover:text-red-400">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
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
                          <div className="pt-2 text-[10px] font-mono text-neutral-700">
                            Fetching browser draft and generated files...
                          </div>
                        </div>
                      ) : (
                        <div className="mx-4 rounded-lg border border-amber-500/10 bg-amber-500/[0.04] px-3 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                            Browser Draft Only
                          </div>
                          <div className="mt-2 text-[10px] leading-relaxed text-neutral-500">
                            You are not logged in, so files and build artifacts are being loaded from this browser only.
                          </div>
                          <div className="mt-2 text-[10px] leading-relaxed text-neutral-600">
                            Save your work locally or log in before switching browsers or clearing storage, otherwise it can be lost.
                          </div>
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
                    {history.deployments.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setContractAddress(d.contractAddress);
                          setActiveRightTab("interact");
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
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                  Line {match.line}:{match.col}
                                </div>
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

                {activeSidebarTab === "deployments" && (
                  <div className="p-4">
                    <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold mb-4">Active Contracts</div>
                    <div className="space-y-3">
                      {contractAddress ? (
                        <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-amber-500 font-bold">SimpleStorage</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          </div>
                          <div className="text-[9px] font-mono text-neutral-500 break-all">{contractAddress}</div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-neutral-700 italic text-center py-8">No deployed contracts</p>
                      )}
                    </div>
                  </div>
                )}
                {activeSidebarTab === "history" && (
                  <div className="p-4 overflow-y-auto h-full no-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent History</div>
                      <button onClick={() => fetchCloudData()} className="p-1 hover:text-white transition-colors">
                        <RefreshCw className={clsx("w-2.5 h-2.5", isSyncing && "animate-spin")} />
                      </button>
                    </div>
                    {history.transactions.length === 0 ? (
                      <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">
                        No transactions logged yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {history.transactions.map((tx: any) => (
                          <div key={tx.id} className="p-2.5 rounded border border-neutral-800 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-neutral-300 uppercase">{tx.type}</span>
                              <span className="text-[9px] text-neutral-700">{new Date(tx.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[9px] font-mono text-neutral-600 truncate mb-1.5">{tx.hash}</div>
                            <div className="flex justify-end gap-2">
                              <a
                                href={`${netConfig.starkscan}/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-neutral-700 hover:text-amber-500"
                              >
                                View ↗
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {contextMenu && (
          <div
            className="fixed z-50 min-w-[180px] rounded-lg border border-neutral-800 bg-[#111111] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuButton
              icon={FilePlus}
              label="New File"
              onClick={() => {
                createFile();
                setContextMenu(null);
              }}
            />
            {contextMenuFile?.kind === "source" && (
              <ContextMenuButton
                icon={Edit2}
                label="Rename"
                onClick={() => {
                  if (contextMenuFile) {
                    setEditingFileId(contextMenuFile.id);
                    setRenameValue(contextMenuFile.filename);
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {contextMenuFile?.kind === "source" && (
              <ContextMenuButton
                icon={Trash2}
                label="Delete"
                danger
                disabled={files.length <= 1}
                onClick={() => {
                  if (contextMenuFile && files.length > 1) {
                    const nextFiles = files.filter((f) => f.id !== contextMenuFile.id);
                    setFiles(nextFiles);
                    if (activeFileId === contextMenuFile.id) setActiveFileId(nextFiles[0].id);
                  }
                  setContextMenu(null);
                }}
              />
            )}
          </div>
        )}

        {/* ── CENTER AREA (Editor + Terminal) ── */}
        <div ref={centerPaneRef} className="flex-1 flex flex-col overflow-hidden bg-[#050505] relative">
          {/* Tabs */}
          <div className="flex h-9 bg-[#0d0d0d] border-b border-neutral-900 overflow-x-auto flex-shrink-0 no-scrollbar">
            {[activeFile].filter(Boolean).map(f => (
              <div key={f.id} className={clsx(
                "flex items-center px-4 border-r border-neutral-900 bg-[#050505] min-w-[160px] relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px]",
                `after:${accentBg}`
              )}>
                <FileCode className={clsx("w-3.5 h-3.5 mr-2", f.readonly ? "text-sky-400" : accentColor)} />
                <span className="text-xs text-neutral-300 font-medium truncate">{f.filename}</span>
                <button className="ml-auto p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
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
                          <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0",
                            severity === "error" ? "bg-red-500" :
                              severity === "warning" ? "bg-amber-400" : "bg-neutral-600"
                          )} />
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
                  className={clsx(
                    "pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-4 leading-6 transition-all",
                    settings.lineWrapping ? "whitespace-pre-wrap" : "whitespace-pre"
                  )}
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
                <button
                  onClick={handleBuild}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-amber-500 transition-colors"
                >
                  Build
                </button>
                <div className="w-px h-3 bg-neutral-800" />
                <CopyButton text={currentSource} label="Copy" />
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between h-5 px-3 bg-[#0a0a0a] border-t border-neutral-900/60 flex-shrink-0 text-[9px] font-mono text-neutral-600 select-none">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-500">
              <span>Ln {cursorLine}, Col {cursorCol}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="uppercase tracking-wider">
                {activeFile?.filename?.endsWith(".cairo") ? "Cairo" : activeFile?.filename?.endsWith(".json") ? "JSON" : ""}
              </span>
              <span>UTF-8</span>
              <span>UTF-8</span>
            </div>
          </div>

          <div
            onMouseDown={() => setIsResizingTerminal(true)}
            className={clsx(
              "relative h-2 flex-shrink-0 cursor-row-resize border-t border-neutral-900 bg-[#0b0b0b] group",
              isResizingTerminal && "bg-amber-500/10"
            )}
          >
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-800 transition-colors group-hover:bg-amber-500/40" />
            <div className="absolute left-1/2 top-1/2 h-1 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-700 transition-colors group-hover:bg-amber-500/60" />
          </div>

          {/* BOTTOM PANEL (Terminal) */}
          <div className="flex flex-col border-t border-neutral-900 bg-[#0d0d0d] flex-shrink-0" style={{ height: terminalHeight }}>
            <div className="flex items-center h-9 px-4 border-b border-neutral-900 justify-between">
              <div className="flex items-center h-full gap-1">
                <TabButton active={activeBottomTab === "terminal"} onClick={() => setActiveBottomTab("terminal")} label="Terminal" />
                <TabButton active={activeBottomTab === "problems"} onClick={() => setActiveBottomTab("problems")} label="Problems" badge={problemCount || undefined} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setTerminalLogs([])} className="p-1.5 hover:bg-white/5 rounded text-neutral-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-white/5 rounded text-neutral-600 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#050505] p-4 font-mono text-[11px] leading-relaxed">
              {activeBottomTab === "terminal" && (
                <div className="space-y-1">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className={clsx(log.includes("failed") ? "text-red-400" : log.includes("success") ? "text-emerald-400" : "text-neutral-500")}>
                      <span className="text-neutral-700 mr-2">$</span>
                      {log}
                    </div>
                  ))}
                  {compilerOutput && (
                    <pre className="mt-4 whitespace-pre-wrap rounded border border-neutral-900 bg-black/30 p-3 text-neutral-400">
                      {compilerOutput}
                    </pre>
                  )}
                  {buildStatus === "building" && <div className="text-amber-500 animate-pulse">$ Compiling project...</div>}
                </div>
              )}
              {activeBottomTab === "problems" && (
                <div className="space-y-3">
                  {(liveDiagnostics.length > 0 || errors.length > 0 || compilerOutput) && (
                    <div className="flex justify-end">
                      <CopyButton
                        text={formatProblemsForCopy(errors, liveDiagnostics, compilerOutput)}
                        label="Copy Problems"
                      />
                    </div>
                  )}
                  {liveDiagnostics.length > 0 && (
                    <div className="rounded border border-amber-500/10 bg-amber-500/5 p-3">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">Live Editor Checks</div>
                      <div className="space-y-2">
                        {liveDiagnostics.map((issue, i) => (
                          <div key={`live-${i}`} className="rounded border border-neutral-800 bg-black/20 p-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              {issue.severity} at line {issue.line}:{issue.col}
                            </div>
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
                      {errors.map((err, i) => (
                        <DiagnosticCard key={i} error={err} />
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
                        <CopyButton text={compilerOutput} label="Copy Logs" />
                      </div>
                      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded border border-neutral-900 bg-[#050505] p-3 text-[12px] leading-relaxed text-neutral-300">
                        {compilerOutput}
                      </pre>
                      <div className="mt-2 text-[10px] text-neutral-600">
                        This is the raw Scarb output. Use it when the summarized error card is still too vague.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (Intelligence Layer) ── */}
        <AnimatePresence initial={false}>
          {isRightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex flex-shrink-0 overflow-hidden"
            >
              <div
                onMouseDown={() => setIsResizingRightPanel(true)}
                className={clsx(
                  "relative w-2 cursor-col-resize border-l border-neutral-900 bg-[#0b0b0b] group",
                  isResizingRightPanel && "bg-amber-500/10"
                )}
              >
                <div className="absolute left-1/2 top-1/2 h-16 w-px -translate-x-1/2 -translate-y-1/2 bg-neutral-900 transition-colors group-hover:bg-neutral-700" />
              </div>
              <div className="flex flex-col h-full flex-1 border-l border-neutral-900 bg-[#0d0d0d] overflow-hidden">
                <div className="flex h-9 bg-[#0d0d0d] border-b border-neutral-900 flex-shrink-0 overflow-x-auto no-scrollbar">
                  <TabButton active={activeRightTab === "explain"} onClick={() => setActiveRightTab("explain")} label="Explain" />
                  <TabButton active={activeRightTab === "deploy"} onClick={() => setActiveRightTab("deploy")} label="Deploy" />
                  <TabButton active={activeRightTab === "interact"} onClick={() => setActiveRightTab("interact")} label="Interact" />
                  <TabButton active={activeRightTab === "state"} onClick={() => setActiveRightTab("state")} label="State" />
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {activeRightTab === "explain" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">AI Insights</span>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <h4 className="text-xs font-bold text-white mb-2">Contract Overview</h4>
                          <p className="text-[11px] text-neutral-500 leading-relaxed font-mono">
                            This contract implements a simple storage pattern in Cairo. It allows for a single
                            <span className="text-amber-400"> felt252 </span> value to be stored and retrieved from the
                            Starknet state.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-bold uppercase text-neutral-600 tracking-wider">Key Concepts</h5>
                          <ul className="space-y-2">
                            <li className="flex gap-3 text-[11px] text-neutral-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                              <span><b className="text-neutral-300">#[storage]</b>: Defines the persistent state variables.</span>
                            </li>
                            <li className="flex gap-3 text-[11px] text-neutral-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                              <span><b className="text-neutral-300">embed_v0</b>: Exposes functions to the Starknet ABI.</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRightTab === "deploy" && (
                    <div className="-m-5 divide-y divide-neutral-900">

                      {/* Network row */}
                      <div className="flex items-center justify-between px-5 py-3 bg-[#0a0a0a]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                          <span className="text-[11px] text-neutral-200 font-bold tracking-tight">{netConfig.label}</span>
                        </div>
                        <div className="px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[8px] font-black uppercase tracking-widest">
                          testnet
                        </div>
                      </div>

                      {/* Wallet section */}
                      {starknetAccount ? (
                        <div className="px-5 py-4 space-y-3 bg-[#0d0d0d]">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] text-neutral-600 uppercase tracking-[0.2em] font-black">
                                {walletType === "privy" ? "Privy Embedded" : "Browser Extension"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] text-neutral-200">
                                  {walletAddress.slice(0, 10)}…{walletAddress.slice(-6)}
                                </span>
                                <CopyButton text={walletAddress} />
                              </div>
                            </div>
                            <button onClick={disconnectWallet} className="px-2 py-1 rounded bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500/60 hover:text-red-500 transition-all text-[9px] font-bold uppercase tracking-widest">
                              Disconnect
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-neutral-900">
                            <div className="flex items-center gap-2">
                              <Zap className={clsx("w-3 h-3", accentColor)} />
                              <span className="text-[10px] text-neutral-500 font-medium">STRK Balance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isFetchingBalance ? (
                                <Loader2 className="w-3 h-3 animate-spin text-neutral-700" />
                              ) : strkBalance !== null ? (
                                <span className="text-[11px] font-mono text-white font-bold">{strkBalance} <span className="text-neutral-600 font-normal">STRK</span></span>
                              ) : null}
                              <button
                                onClick={() => fetchStrkBalance(walletAddress)}
                                className="p-1 text-neutral-600 hover:text-neutral-400 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-3">
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full py-2.5 rounded font-medium text-[11px] transition-all bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15"
                          >
                            Connect Wallet to Deploy
                          </button>
                        </div>
                      )}

                      {/* STRK fee note */}
                      <div className="px-5 py-3 flex items-start gap-2">
                        <Zap className="w-3 h-3 text-neutral-700 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-neutral-600 leading-relaxed">
                          Declare &amp; Deploy require <span className="text-neutral-500">STRK</span> for fees — they&apos;re on-chain transactions through system contracts that don&apos;t support fee abstraction. Reads are free; sponsored writes use AVNU paymaster.
                        </p>
                      </div>

                      {/* Artifacts */}
                      <div className="px-5 py-3 space-y-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-600">Class Hash</span>
                          {classHash ? (
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-neutral-400">
                                {classHash.slice(0, 14)}…{classHash.slice(-6)}
                              </span>
                              <div className="flex items-center gap-2">
                                <CopyButton text={classHash} />
                                <a href={`${netConfig.starkscan}/class/${classHash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors font-mono">starkscan ↗</a>
                                <a href={`${netConfig.voyager}/class/${classHash}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors font-mono">voyager ↗</a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-neutral-700 italic">not declared</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-600">Contract Address</span>
                          {contractAddress ? (
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] text-neutral-400">
                                {contractAddress.slice(0, 14)}…{contractAddress.slice(-6)}
                              </span>
                              <div className="flex items-center gap-2">
                                <CopyButton text={contractAddress} />
                                <a href={`${netConfig.starkscan}/contract/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors font-mono">starkscan ↗</a>
                                <a href={`${netConfig.voyager}/contract/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors font-mono">voyager ↗</a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-neutral-700 italic">not deployed</p>
                          )}
                        </div>
                      </div>

                      {/* Constructor args */}
                      {deployStatus === "declared" && (() => {
                        const ctorAbi = activeBuildData?.abi?.find((e: { type: string }) => e.type === "constructor");
                        const ctorInputs: Array<{ name: string; type: string }> = ctorAbi?.inputs ?? [];
                        if (ctorInputs.length === 0) return null;
                        return (
                          <div className="px-5 py-3 space-y-3">
                            <span className="text-[9px] uppercase tracking-widest text-neutral-600">Constructor</span>
                            {ctorInputs.map((inp: { name: string; type: string }) => (
                              <div key={inp.name}>
                                <label className="text-[9px] font-mono text-neutral-600">
                                  {inp.name} <span className="text-neutral-700">{inp.type}</span>
                                </label>
                                <input
                                  value={constructorInputs[inp.name] ?? ""}
                                  onChange={(e) => setConstructorInputs((prev) => ({ ...prev, [inp.name]: e.target.value }))}
                                  placeholder="0x... or decimal"
                                  className="w-full mt-1 bg-transparent border-b border-neutral-800 py-1 text-[11px] font-mono outline-none focus:border-amber-500/40 text-neutral-300 placeholder:text-neutral-800"
                                />
                              </div>
                            ))}
                            <div>
                              <label className="text-[9px] font-mono text-neutral-600">salt <span className="text-neutral-700">felt252</span></label>
                              <input
                                value={salt}
                                onChange={(e) => setSalt(e.target.value)}
                                placeholder="0"
                                className="w-full mt-1 bg-transparent border-b border-neutral-800 py-1 text-[11px] font-mono outline-none focus:border-amber-500/40 text-neutral-300 placeholder:text-neutral-800"
                              />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Execution steps */}
                      {deploySteps.length > 0 && (
                        <div className="px-5 py-3 space-y-2">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-600">Execution</span>
                          <div>
                            {deploySteps.map((step, i) => (
                              <div key={step.id} className="flex items-start gap-3">
                                <div className="flex flex-col items-center pt-1.5">
                                  <motion.div
                                    className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0",
                                      step.status === "done" ? "bg-emerald-500" :
                                        step.status === "active" ? "bg-amber-400" :
                                          step.status === "error" ? "bg-red-500" : "bg-neutral-800"
                                    )}
                                    animate={step.status === "active" ? { opacity: [1, 0.3, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                  />
                                  {i < deploySteps.length - 1 && (
                                    <div className={clsx("w-px mt-1", step.status === "done" ? "bg-emerald-900" : "bg-neutral-900")} style={{ minHeight: 18 }} />
                                  )}
                                </div>
                                <div className="pb-3.5">
                                  <div className={clsx("text-[10px]",
                                    step.status === "done" ? "text-emerald-400" :
                                      step.status === "active" ? "text-amber-300" :
                                        step.status === "error" ? "text-red-400" : "text-neutral-700"
                                  )}>
                                    {step.label}
                                  </div>
                                  {step.detail && <div className="text-[9px] font-mono text-neutral-700 mt-0.5">{step.detail}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="px-5 py-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleDeclare}
                            disabled={(!activeBuildData && buildStatus !== "success") || deployStatus !== "idle"}
                            className={clsx(
                              "py-2 rounded font-medium text-[11px] transition-all flex items-center justify-center gap-1.5",
                              deployStatus === "idle" && buildStatus === "success"
                                ? "bg-amber-500 text-black hover:bg-amber-400"
                                : deployStatus === "declared" || deployStatus === "deployed"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900"
                                  : "bg-neutral-900 text-neutral-700 cursor-not-allowed"
                            )}
                          >
                            {deployStatus === "declaring" ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Declaring</>
                            ) : deployStatus === "declared" || deployStatus === "deployed" ? (
                              <><CheckCircle2 className="w-3 h-3" /> Declared</>
                            ) : "Declare"}
                          </button>
                          <button
                            onClick={handleDeploy}
                            disabled={deployStatus !== "declared" || isWalletConnecting}
                            className={clsx(
                              "py-2 rounded font-medium text-[11px] transition-all flex items-center justify-center gap-1.5",
                              deployStatus === "declared"
                                ? "bg-white text-black hover:bg-neutral-100"
                                : deployStatus === "deployed"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900"
                                  : "bg-neutral-900 text-neutral-700 cursor-not-allowed"
                            )}
                          >
                            {deployStatus === "deploying" ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Deploying</>
                            ) : deployStatus === "deployed" ? (
                              <><CheckCircle2 className="w-3 h-3" /> Deployed</>
                            ) : "Deploy"}
                          </button>
                        </div>
                        {(deployStatus === "declared" || deployStatus === "deployed") && (
                          <button
                            onClick={() => {
                              setDeployStatus("idle");
                              setClassHash("");
                              setContractAddress("");
                              setDeploySteps([]);
                              setConstructorInputs({});
                            }}
                            className="w-full py-1.5 text-[10px] text-neutral-700 hover:text-neutral-500 transition-colors"
                          >
                            reset
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {activeRightTab === "interact" && (
                    <InteractPanel
                      deployStatus={deployStatus}
                      contractAddress={contractAddress}
                      abi={activeBuildData?.abi ?? []}
                      account={starknetAccount}
                      addLog={addLog}
                      provider={sdkRef.current?.getProvider() ?? new RpcProvider({ nodeUrl: netConfig.rpcUrl })}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── AUTH MODAL ── */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md"
            >
              <AuthModal
                authenticated={authenticated}
                isConnecting={isWalletConnecting}
                walletError={walletError}
                onPrivyConnect={connectPrivyWallet}
                onExtensionConnect={connectExtensionWallet}
                onClose={() => { setShowAuthModal(false); setWalletError(null); }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── STATUS BAR ── */}
      <div className="flex items-center justify-between h-7 px-3 text-[10px] border-t border-neutral-900 bg-[#0a0a0a] text-neutral-600 select-none transition-colors">
        <div className="flex items-center gap-4 h-full">
          <div
            className="flex items-center gap-1.5 h-full px-2 hover:bg-white/5 cursor-pointer transition-colors group"
            onClick={() => setNetwork(network === "mainnet" ? "sepolia" : "mainnet")}
            title={`Switch to ${network === "mainnet" ? "Sepolia testnet" : "Mainnet"}`}
          >
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
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-500">
            <span>Ln {cursorLine}, Col {cursorCol}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 h-full">
          <div className="flex items-center gap-3">
            <span className="text-[9px] uppercase tracking-widest font-bold">UTF-8</span>
            <div className="w-px h-3 bg-neutral-800/50" />
            <span className={clsx("text-[9px] font-black uppercase tracking-[0.2em]", accentColor)}>Cairo</span>
          </div>
          <div className="w-px h-3 bg-neutral-800/50" />
          {walletType ? (
            <button onClick={() => setShowAuthModal(true)} className={clsx("flex items-center gap-1.5 font-bold hover:opacity-80 transition-opacity", walletType === "privy" ? "text-amber-400/90" : "text-sky-400/90")}>
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
    </div >
  );
}

// ── Helper Components ──

function ContextMenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] transition-colors",
        danger ? "text-red-400 hover:bg-red-500/10" : "text-neutral-300 hover:bg-white/5",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

function AuthModal({
  authenticated,
  isConnecting,
  walletError,
  onPrivyConnect,
  onExtensionConnect,
  onClose,
}: {
  authenticated: boolean;
  isConnecting: boolean;
  walletError: string | null;
  onPrivyConnect: () => void;
  onExtensionConnect: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Connect Wallet</h2>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-4 h-4 text-neutral-600" />
        </button>
      </div>

      <p className="text-[11px] text-neutral-500 mb-6 leading-relaxed">
        A connected wallet is required to sign declare and deploy transactions on {netConfig.label}.
      </p>

      {/* Privy option */}
      <div className="space-y-3 mb-5">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">Privy Embedded Wallet</span>
            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-400 uppercase tracking-wider">Recommended</span>
          </div>
          <ul className="space-y-1.5">
            {[
              "No browser extension required",
              "Email / Google / social login",
              "Non-custodial — Privy never sees your key",
              "Gasless transactions via AVNU paymaster",
              "Works in any browser or mobile device",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2 text-[10px] text-neutral-400">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <button
            onClick={onPrivyConnect}
            disabled={isConnecting}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-[11px] uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isConnecting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...</>
            ) : authenticated ? (
              "Connect Privy Wallet"
            ) : (
              "Log in with Privy"
            )}
          </button>
        </div>

        {/* Extension option */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-bold text-neutral-300">Browser Extension</span>
          </div>
          <p className="text-[10px] text-neutral-600 leading-relaxed">
            Use ArgentX or Braavos wallet extension. Must be installed and have a {network === "mainnet" ? "Mainnet" : "Sepolia"} account.
          </p>
          <button
            onClick={onExtensionConnect}
            disabled={isConnecting}
            className="w-full py-2.5 rounded-xl border border-neutral-700 text-neutral-300 font-bold text-[11px] uppercase tracking-widest hover:border-neutral-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isConnecting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...</>
            ) : "Connect ArgentX / Braavos"}
          </button>
        </div>
      </div>

      {walletError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[11px] text-red-300">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-bold uppercase text-[10px] tracking-wider">Error</span>
          </div>
          {walletError}
        </div>
      )}
    </div>
  );
}

function InteractPanel({
  deployStatus,
  contractAddress,
  abi,
  account,
  addLog,
  provider,
}: {
  deployStatus: DeployStatus;
  contractAddress: string;
  abi: any[];
  account: any;
  addLog: (msg: string) => void;
  provider: any;
}) {
  const [funcInputs, setFuncInputs] = useState<Record<string, Record<string, string>>>({});
  const [funcResults, setFuncResults] = useState<Record<string, string>>({});
  const [funcLoading, setFuncLoading] = useState<Record<string, boolean>>({});
  const [funcErrors, setFuncErrors] = useState<Record<string, string>>({});

  const externalFunctions = useMemo(() => {
    return abi.filter(
      (e: any) => (e.type === "function" || e.type === "interface") && e.state_mutability !== undefined
    ).concat(
      abi.flatMap((e: any) =>
        e.type === "impl" && Array.isArray(e.items)
          ? e.items.filter((fn: any) => fn.state_mutability !== undefined)
          : []
      )
    );
  }, [abi]);

  const viewFunctions = externalFunctions.filter((fn: any) => fn.state_mutability === "view");
  const writeFunctions = externalFunctions.filter((fn: any) => fn.state_mutability === "external");

  const callFn = async (fn: any) => {
    if (!contractAddress) return;
    const fnName = fn.name as string;
    setFuncLoading((prev) => ({ ...prev, [fnName]: true }));
    setFuncErrors((prev) => ({ ...prev, [fnName]: "" }));
    setFuncResults((prev) => ({ ...prev, [fnName]: "" }));
    try {
      const calldata = (fn.inputs ?? []).map((inp: any) => funcInputs[fnName]?.[inp.name] ?? "0");
      const result = await provider.callContract({
        contractAddress,
        entrypoint: fnName,
        calldata,
      });
      setFuncResults((prev) => ({ ...prev, [fnName]: JSON.stringify(result, null, 2) }));
      addLog(`read ${fnName}: ${JSON.stringify(result).slice(0, 60)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFuncErrors((prev) => ({ ...prev, [fnName]: msg }));
    } finally {
      setFuncLoading((prev) => ({ ...prev, [fnName]: false }));
    }
  };

  const executeFn = async (fn: any) => {
    if (!account || !contractAddress) return;
    const fnName = fn.name as string;
    setFuncLoading((prev) => ({ ...prev, [fnName]: true }));
    setFuncErrors((prev) => ({ ...prev, [fnName]: "" }));
    setFuncResults((prev) => ({ ...prev, [fnName]: "" }));
    try {
      const calldata = (fn.inputs ?? []).map((inp: any) => funcInputs[fnName]?.[inp.name] ?? "0");
      const call = { contractAddress, entrypoint: fnName, calldata };
      const tx = await account.execute([call]);
      addLog(`executed ${fnName}: tx ${tx.transaction_hash}`);
      await account.waitForTransaction(tx.transaction_hash);
      setFuncResults((prev) => ({ ...prev, [fnName]: `tx: ${tx.transaction_hash}` }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFuncErrors((prev) => ({ ...prev, [fnName]: msg }));
    } finally {
      setFuncLoading((prev) => ({ ...prev, [fnName]: false }));
    }
  };

  if (deployStatus !== "deployed") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-30">
        <Activity className="w-12 h-12" />
        <p className="text-xs font-mono">Deploy a contract to interact.</p>
      </div>
    );
  }

  const renderFnCard = (fn: any, isView: boolean) => {
    const fnName = fn.name as string;
    const inputs: Array<{ name: string; type: string }> = fn.inputs ?? [];
    return (
      <div key={fnName} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
        <div className="flex items-center gap-2">
          <div className={clsx("w-1.5 h-1.5 rounded-full", isView ? "bg-emerald-500" : "bg-amber-500")} />
          <span className="text-[11px] font-bold text-white font-mono">{fnName}</span>
          <span className="ml-auto text-[9px] uppercase tracking-wider text-neutral-600">{isView ? "view" : "write"}</span>
        </div>
        {inputs.map((inp) => (
          <div key={inp.name} className="space-y-0.5">
            <label className="text-[9px] font-mono text-neutral-600">{inp.name}: {inp.type}</label>
            <input
              placeholder="0x... or decimal"
              value={funcInputs[fnName]?.[inp.name] ?? ""}
              onChange={(e) => setFuncInputs((prev) => ({
                ...prev,
                [fnName]: { ...prev[fnName], [inp.name]: e.target.value },
              }))}
              className="w-full bg-black border border-neutral-800 rounded px-2 py-1 text-[11px] font-mono outline-none focus:border-amber-500/50 text-neutral-300"
            />
          </div>
        ))}
        <button
          onClick={() => isView ? callFn(fn) : executeFn(fn)}
          disabled={funcLoading[fnName] || (!account && !isView)}
          className={clsx(
            "w-full py-2 text-[10px] font-bold uppercase rounded transition-all flex items-center justify-center gap-1.5",
            isView
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20",
            (funcLoading[fnName] || (!account && !isView)) && "opacity-50 cursor-not-allowed"
          )}
        >
          {funcLoading[fnName] ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {isView ? "Read State" : "Execute Call"}
        </button>
        {funcResults[fnName] && (
          <pre className="text-[10px] font-mono text-emerald-400/80 bg-black/30 rounded p-2 overflow-auto max-h-20 whitespace-pre-wrap">{funcResults[fnName]}</pre>
        )}
        {funcErrors[fnName] && (
          <div className="text-[10px] text-red-400 font-mono break-words">{funcErrors[fnName]}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-[9px] font-mono text-neutral-600 break-all">@ {contractAddress}</div>

      {viewFunctions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase text-neutral-600 tracking-wider">Read</div>
          {viewFunctions.map((fn: any) => renderFnCard(fn, true))}
        </div>
      )}
      {writeFunctions.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase text-neutral-600 tracking-wider">Write</div>
          {writeFunctions.map((fn: any) => renderFnCard(fn, false))}
        </div>
      )}
      {viewFunctions.length === 0 && writeFunctions.length === 0 && (
        <div className="text-center text-[11px] text-neutral-600 font-mono py-8">No external functions in ABI.</div>
      )}
    </div>
  );
}

function ActivityIcon({ icon: Icon, active, onClick }: { icon: any; active: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex items-center justify-center w-full h-12 transition-colors group",
        active ? "text-neutral-200" : "text-neutral-600 hover:text-neutral-400"
      )}
    >
      {active && <div className="absolute left-0 top- 0 bottom-0 w-[2px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
      <Icon className={clsx("w-5 h-5 transition-transform", active ? "scale-110" : "group-hover:scale-105")} strokeWidth={1.5} />
    </button>
  );
}
