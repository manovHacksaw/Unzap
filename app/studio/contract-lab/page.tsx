"use client";

import { useState, useCallback, useRef, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";
import { WalletAccount, Account, hash, shortString, ProviderInterface, type CairoAssembly, type CompiledSierra, type CompiledContract } from "starknet";

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
  RefreshCw,
  X,
  Copy,
  Check,
  Edit2,
  FilePlus,
  FolderPlus,
  Hash as LucideHash,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";

// ── Types & Constants ─────────────────────────────────────────────────────────

const COMPILER_URL = process.env.NEXT_PUBLIC_COMPILER_URL ?? "https://unzap.onrender.com";
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

interface AbiEntry {
  type: string;
  name: string;
  inputs?: { name: string; type: string }[];
  outputs?: { type: string }[];
  state_mutability?: string;
  items?: AbiEntry[];
}

interface CompileSuccess {
  sierra: unknown;
  casm: unknown;
  abi: AbiEntry[];
  logs: string;
}

interface TransactionData {
  hash: string;
  type: string;
  status?: string;
}

interface DeploymentData {
  contractAddress: string;
  classHash: string;
  abi: AbiEntry[];
  name: string;
  network?: string;
}

interface ContractHistoryItem {
  id: string;
  contractAddress: string;
  classHash: string;
  abi: string; // JSON string
  name: string;
  network: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionHistoryItem {
  id: string;
  hash: string;
  type: string;
  status: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface HistoryData {
  deployments: ContractHistoryItem[];
  transactions: TransactionHistoryItem[];
}

interface CompileFailure {
  errors?: CompileError[];
  logs?: string;
}

interface LiveDiagnostic extends CompileError {
  severity: "warning" | "hint";
}

// ── Components ────────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  title: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}

const PanelHeader = ({ title, children, icon: Icon }: PanelHeaderProps) => (
  <div className="flex items-center justify-between px-4 h-9 bg-[#0d0d0d] border-b border-neutral-900 flex-shrink-0 select-none">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-500" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{title}</span>
    </div>
    <div className="flex items-center gap-1">{children}</div>
  </div>
);

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number | string;
  theme?: "amber" | "emerald" | "azure" | "mono";
}

const TabButton = ({ active, onClick, label, badge, theme = "amber" }: TabButtonProps) => {
  const accentClass = {
    amber: "after:bg-amber-500",
    emerald: "after:bg-emerald-500",
    azure: "after:bg-sky-500",
    mono: "after:bg-white",
  }[theme];

  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative px-4 h-full text-[10px] font-bold uppercase tracking-widest transition-all duration-200 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-200",
        active
          ? clsx("text-neutral-100", accentClass, "after:opacity-100")
          : "text-neutral-500 hover:text-neutral-400 after:opacity-0"
      )}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {badge !== undefined && (
          <span className="bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full text-[9px]">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
};

interface DiagnosticCardProps {
  error: CompileError;
  index: number;
  onAiFix: (err: CompileError, idx: number) => void;
  isFixing: string | null;
  suggestion: { index: number; fix: { line: number; newContent: string; description?: string } } | null;
  onApplyFix: (fix: { line: number; newContent: string }) => void;
}

const DiagnosticCard = ({
  error,
  index,
  onAiFix,
  isFixing,
  suggestion,
  onApplyFix
}: DiagnosticCardProps) => (
  <div className="rounded border border-red-500/10 bg-red-500/5 p-3 text-red-300 relative group overflow-hidden">
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Line {error.line}</span>
      </div>
      {!suggestion && (
        <button
          onClick={() => onAiFix(error, index)}
          disabled={isFixing !== null}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
        >
          {isFixing === index.toString() ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {isFixing === index.toString() ? "Fixing..." : "Fix with AI"}
        </button>
      )}
    </div>
    <p className="text-[11px] font-mono leading-relaxed text-neutral-300 mb-2">{error.message}</p>
    {suggestion && (
      <div className="mt-3 space-y-2 border-t border-amber-500/10 pt-3 bg-amber-500/5 -mx-3 -mb-3 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">AI REPAIR SUGGESTION</span>
        </div>
        <div className="rounded bg-black/40 border border-neutral-800 p-2 font-mono text-[11px] overflow-x-auto text-neutral-400">
          <div className="text-red-400/60 line-through opacity-50">{suggestion.fix.line || "..."}</div>
          <div className="text-emerald-400">{suggestion.fix.newContent}</div>
        </div>
        <p className="text-[10px] text-neutral-500 italic leading-relaxed">{suggestion.fix.description}</p>
        {suggestion.fix.newContent && (
          <button
            onClick={() => onApplyFix(suggestion.fix)}
            className="w-full py-1.5 rounded bg-emerald-500 text-black font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all"
          >
            Apply Fix & Recompile
          </button>
        )}
      </div>
    )}
  </div>
);


interface HistoryDeploymentCardProps {
  deployment: ContractHistoryItem;
  onInteract: () => void;
}

const HistoryDeploymentCard = ({ deployment, onInteract }: HistoryDeploymentCardProps) => (
  <button
    onClick={onInteract}
    className="w-full p-2.5 rounded border border-neutral-800 bg-[#0a0a0a] group hover:border-amber-500/20 transition-all text-left"
  >
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold text-amber-500/80 uppercase">{deployment.name || "Contract"}</span>
      <span className="text-[9px] text-neutral-700">{new Date(deployment.createdAt).toLocaleDateString()}</span>
    </div>
    <div className="text-[9px] font-mono text-neutral-600 truncate">{deployment.contractAddress}</div>
  </button>
);


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

  const themeMap = {
    amber: { attr: "text-amber-400", kw: "text-amber-300", type: "text-sky-300", str: "text-emerald-400" },
    emerald: { attr: "text-emerald-400", kw: "text-emerald-300", type: "text-neutral-100", str: "text-sky-300" },
    azure: { attr: "text-sky-400", kw: "text-sky-300", type: "text-emerald-300", str: "text-fuchsia-400" },
  };

  const colors = themeMap[theme as keyof typeof themeMap] || themeMap.amber;

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

function highlightCairo(source: string, theme: "amber" | "emerald" | "azure" | "mono" = "amber") {
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

// ── Utilities ────────────────────────────────────────────────────────────────

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
  const { authenticated, getAccessToken, login, logout } = usePrivy();

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

      if (authenticated) {
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
  }, [authenticated, getAccessToken]);

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
  const [activeRightTab, setActiveRightTab] = useState("deploy");
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

  const addLog = useCallback((log: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setTerminalLogs((prev) => [...prev, `[${time}] ${log}`]);
  }, []);

  const appendCompilerOutput = useCallback((output: string) => {
    if (!output) return;
    const normalized = output.replace(/\n\n+/g, "\n").trim();
    setCompilerOutput(normalized);
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
      } else {
        setBuildStatus("success");
        setBuildOutputsByFile((prev) => ({ ...prev, [activeSourceFile.id]: json as CompileSuccess }));
        appendCompilerOutput(json.logs);
        addLog(`Build successful! Sierra and ABI generated.`);
        setClassHash("");
        setDeploySteps([]);
        setSalt(Math.floor(Math.random() * 1_000_000_000).toString());
      }
    } catch (e) {
      setBuildStatus("error");
      setErrors([{ message: e instanceof Error ? e.message : "Network error", line: 0, col: 0 }]);
      addLog(`Build failed: Network or server error.`);
    }
  }, [buildStatus, activeSourceFile, addLog, appendCompilerOutput]);

  const handleAiFix = async (error: CompileError, index: number) => {
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
      } else {
        addLog(`AI: ${data.error || "No specific fix found."}`);
      }
    } catch {
      addLog("AI Fixing failed: Network or server error.");
    } finally {
      setIsAiFixing(null);
    }
  };

  const applyAiFix = useCallback((fix: { line: number, newContent: string }) => {
    if (!fix || !activeSourceFile || !fix.newContent) return;
    const lines = activeSourceFile.source.split("\n");
    lines[fix.line - 1] = fix.newContent;
    const newSource = lines.join("\n");

    setFiles((prev) => prev.map((f) => (f.id === activeSourceFile.id ? { ...f, source: newSource } : f)));
    setAiFixSuggestion(null);
    addLog("AI Fix applied! Recompiling...");

    // Auto re-build
    setTimeout(() => handleBuild(), 100);
  }, [activeSourceFile, addLog, handleBuild]);

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
        deploy: "never",
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


  const logTransaction = async (data: TransactionData) => {
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

  // --- Network switch with full reset ---
  const handleNetworkSwitch = (n: "mainnet" | "sepolia") => {
    if (n === network) return;
    // Reset wallet
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setWalletError(null);
    setStrkBalance(null);
    // Reset deployment state
    setDeployStatus("idle");
    setDeploySteps([]);
    setClassHash("");
    setContractAddress("");
    setConstructorInputs({});
    // Reset history & logs
    setHistory({ deployments: [], transactions: [] });
    addLog(`[network] Switched to ${n === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia"}.`);
    setNetwork(n);
  };

  // --- Deploy account on-chain (Privy only) ---
  const handleDeployAccount = async () => {
    if (!szWallet) return;
    setIsDeployingAccount(true);
    try {
      addLog("Deploying account on-chain...");
      await szWallet.deploy();
      addLog("Account deployed successfully.");
      setShowDeployAccountPrompt(false);
      fetchStrkBalance(walletAddress);
    } catch (e) {
      addLog(`Account deploy failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsDeployingAccount(false);
    }
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

    // For Privy wallets, check if the account is deployed on-chain first
    if (walletType === "privy" && szWallet) {
      const isDeployed = await szWallet.isDeployed();
      if (!isDeployed) {
        setShowDeployAccountPrompt(true);
        return;
      }
    }

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
        contract: activeBuildData.sierra as CompiledSierra,
        casm: activeBuildData.casm as CairoAssembly,
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
      addLog(`Explorer: ${netConfig.voyager}/class/${cHash}`);
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
          const cHash = hash.computeSierraContractClassHash(activeBuildData.sierra as CompiledSierra);
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

    // Generate a fresh random salt for every deployment attempt to avoid address collisions
    const newSalt = "0x" + Math.floor(Math.random() * 1000000).toString(16);
    setSalt(newSalt);

    const constructorAbi = activeBuildData?.abi?.find((entry: { type: string; name: string }) => entry.type === "constructor");
    const constructorParams: Array<{ name: string; type: string }> = constructorAbi?.inputs ?? [];
    const calldata = constructorParams.map((p: { name: string; type: string }) => constructorInputs[p.name] ?? "0");
    const effectiveSalt = newSalt;
    // unique=true: address = calculateContractAddressFromHash(hash(account, salt), classHash, calldata, UDC_ADDRESS)
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
        // If we reach here, code exists!
        addLog(`Error: Contract already deployed at ${predictedAddress.slice(0, 12)}... Use a different salt.`);
        setDeployStep("check", "error", "Already deployed");
        setDeployStatus("declared");
        return;
      } catch (e: unknown) {
        // If it throws "Contract not found", we are good to go
        const msg = String(e);
        if (msg.includes("Contract not found") || msg.includes("20")) {
          setDeployStep("check", "done", "Address is available");
        } else {
          // Genuine error (network etc)
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
      addLog(`View on explorer: ${netConfig.voyager}/contract/${predictedAddress}`);
      setActiveSidebarTab("interact");
      setIsSidebarOpen(true);
      setActiveInteractFn(null);

      logDeployment({
        contractAddress: predictedAddress,
        classHash: classHash,
        abi: activeBuildData?.abi || [],
        name: activeFile?.filename || "Unknown",
      });
      logTransaction({
        hash: txHash,
        type: "deploy",
        status: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDeploySteps((prev) => prev.map((s) => s.status === "active" ? { ...s, status: "error", detail: msg.slice(0, 60) } : s));
      setDeployStatus("declared"); // so they can retry
      if (msg.includes("contract already deployed") || msg.includes("already deployed") || msg.includes("already exists")) {
        addLog(`Deploy failed: Address collision. Change the salt and try again.`);
      } else {
        addLog(`Deploy failed: ${msg}`);
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

  const renderLogLine = (log: string) => {
    // Regex for Starknet Addresses/Hashes (0x + 40-64 hex chars) and HTTP links
    const parts = log.split(/(\b0x[a-fA-F0-9]{40,64}\b|https?:\/\/[^\s,]+)/g);
    return (
      <div className="selection:bg-amber-500/40 selection:text-white cursor-text">
        {parts.map((part, index) => {
          if (part.startsWith("0x")) {
            const isAddress = part.length <= 44; // Simple heuristic: addresses are shorter than tx hashes
            const link = isAddress 
              ? `${netConfig.voyager}/contract/${part}` 
              : `${netConfig.voyager}/tx/${part}`;
            return (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 font-mono underline decoration-amber-400/20 underline-offset-2 transition-colors cursor-pointer"
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
          <ActivityIcon icon={Files} active={activeSidebarTab === "explorer"} onClick={() => { setActiveSidebarTab("explorer"); setIsSidebarOpen(true); setIsRightPanelOpen(true); }} />
          <ActivityIcon icon={Zap} active={activeSidebarTab === "interact"} onClick={() => { setActiveSidebarTab("interact"); setIsSidebarOpen(true); }} />
          <ActivityIcon icon={Search} active={activeSidebarTab === "search"} onClick={() => { setActiveSidebarTab("search"); setIsSidebarOpen(true); setIsRightPanelOpen(true); }} />
          <ActivityIcon icon={History} active={activeSidebarTab === "history"} onClick={() => { setActiveSidebarTab("history"); setIsSidebarOpen(true); setIsRightPanelOpen(true); }} />
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
                        <div className="mx-4 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            Saved in Browser
                          </div>
                          <div className="mt-2 text-[10px] leading-relaxed text-neutral-600">
                            Files and build artifacts are stored in this browser. Clearing storage or switching browsers will lose your work.
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
                    {history.deployments.map((d: ContractHistoryItem) => (
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
                  <div className="p-4 overflow-y-auto h-full no-scrollbar space-y-8">
                    {/* Deployments Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent Deployments</div>
                        <Zap className="w-2.5 h-2.5 text-neutral-800" />
                      </div>
                      {history.deployments.length === 0 ? (
                        <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">
                          No deployments found.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {history.deployments.map((d: ContractHistoryItem) => (
                            <HistoryDeploymentCard
                              key={d.id}
                              deployment={d}
                              onInteract={() => {
                                setContractAddress(d.contractAddress);
                                setDeployStatus("deployed");
                                addLog(`[history] Restored contract: ${d.contractAddress.slice(0, 10)}...`);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Transactions Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">Recent Transactions</div>
                        <button onClick={() => setHistory({ deployments: [], transactions: [] })} className="p-1 hover:text-white transition-colors" title="Clear history">
                          <RefreshCw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      {history.transactions.length === 0 ? (
                        <div className="text-[10px] text-neutral-700 italic border border-dashed border-neutral-900 rounded-lg p-6 text-center">
                          No transactions logged yet.
                        </div>
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
                                <a
                                  href={`${netConfig.voyager}/tx/${tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-neutral-700 hover:text-amber-500 transition-colors"
                                >
                                  View ↗
                                </a>
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
                                <button
                                  key={fn.name}
                                  onClick={() => setActiveInteractFn(fn.name)}
                                  className={clsx(
                                    "w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all",
                                    activeInteractFn === fn.name
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent"
                                  )}
                                >
                                  {fn.name}
                                </button>
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
                                <button
                                  key={fn.name}
                                  onClick={() => setActiveInteractFn(fn.name)}
                                  className={clsx(
                                    "w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono transition-all",
                                    activeInteractFn === fn.name
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent"
                                  )}
                                >
                                  {fn.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
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

        {/* ── CENTER AREA (Editor + Dashboard + Terminal) ── */}
        <div ref={centerPaneRef} className="flex-1 flex flex-col overflow-hidden bg-[#050505] relative cursor-text">
          {activeSidebarTab === "interact" ? (
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                <InteractPanel
                  contractAddress={contractAddress}
                  abi={(activeFileId && buildOutputsByFile[activeFileId]) ? buildOutputsByFile[activeFileId].abi : []}
                  account={starknetAccount}
                  addLog={addLog}
                  provider={sdkRef.current?.getProvider() as unknown as ProviderInterface | null}
                  netConfig={getNetworkConfig(network)}
                  logTransaction={logTransaction}
                  onRequestWallet={() => setShowAuthModal(true)}
                  recentDeployments={history.deployments}
                  layout="fullscreen"
                  activeFileName={activeFile?.filename}
                />
              </div>
            </div>
          ) : (
            <>
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
                    <button onClick={handleBuild} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-amber-500 transition-colors">Build</button>
                    <div className="w-px h-3 bg-neutral-800" />
                    <CopyButton text={currentSource} label="Copy" />
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between h-5 px-3 bg-[#0a0a0a] border-t border-neutral-900/60 flex-shrink-0 text-[10px] font-mono text-neutral-600 select-none">
                <div className="flex items-center gap-1.5">
                  <span>Ln {cursorLine}, Col {cursorCol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="uppercase tracking-wider">{activeFile?.filename?.split('.').pop()}</span>
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
                  </div>
                </div>

                <div className="flex-1 overflow-auto bg-[#050505] p-4 font-mono text-[11px] leading-relaxed">
                  {activeBottomTab === "terminal" && (
                    <div className="space-y-1 selection:bg-amber-500/20">
                      {terminalLogs.map((log) => (
                        <div key={log.slice(0, 50)} className={clsx(
                          "flex gap-2 group",
                          log.includes("failed") ? "text-red-400" : log.includes("success") ? "text-emerald-400" : "text-neutral-500"
                        )}>
                          <span className="text-neutral-700 select-none shrink-0">$</span>
                          <div className="flex-1 break-all cursor-text">
                            {renderLogLine(log)}
                          </div>
                        </div>
                      ))}
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
                          {errors.map((err, idx) => (
                            <DiagnosticCard
                              key={idx}
                              error={err}
                              index={idx}
                              onAiFix={handleAiFix}
                              isFixing={isAiFixing}
                              suggestion={aiFixSuggestion?.index === idx ? aiFixSuggestion : null}
                              onApplyFix={applyAiFix}
                            />
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL (Intelligence Layer) ── */}
        <AnimatePresence initial={false}>
          {isRightPanelOpen && activeSidebarTab !== "interact" && (
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
                <div className="flex items-center h-10 px-5 bg-black/40 backdrop-blur-md border-b border-neutral-900/50 flex-shrink-0 justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Deploy & Config</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-amber-500">Live</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 pb-12">
                  <div className="-m-5 divide-y divide-neutral-900 border-b border-neutral-900/50">
                    <div className="px-5 py-6 bg-black/40 border-b border-neutral-900/30">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <FileCode className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Contract Ready</span>
                          <span className="text-xs text-white font-bold">{activeFile?.filename || "No file selected"}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Metadata / ABI</span>
                        {buildOutputsByFile[activeFileId] ? (
                          <div className="flex items-center gap-1.5 text-[9px] text-emerald-500 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Generated
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[9px] text-neutral-700 italic">
                            Waiting for build
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="-m-5 divide-y divide-neutral-900">
                    {/* Network row */}
                    <div className="flex items-center justify-between px-5 py-4 bg-black/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className={clsx("w-2 h-2 rounded-full", network === "mainnet" ? "bg-amber-500" : "bg-emerald-500")} />
                            <div className={clsx("absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-40", network === "mainnet" ? "bg-amber-500" : "bg-emerald-500")} />
                          </div>
                          <div className="flex flex-col -gap-1">
                            <span className="text-[10px] text-neutral-200 font-bold tracking-tight">{netConfig.label}</span>
                            <span className="text-[8px] text-neutral-600 font-medium uppercase tracking-widest">Active Link</span>
                          </div>
                        </div>
                        <div className="flex items-center p-0.5 rounded-lg bg-neutral-900/50 border border-neutral-800/50 overflow-hidden text-[8px] font-black uppercase tracking-widest gap-0.5">
                          <button
                            onClick={() => handleNetworkSwitch("mainnet")}
                            className={clsx("px-3 py-1.5 rounded-md transition-all", network === "mainnet" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300")}
                          >
                            Main
                          </button>
                          <button
                            onClick={() => handleNetworkSwitch("sepolia")}
                            className={clsx("px-3 py-1.5 rounded-md transition-all", network === "sepolia" ? "bg-emerald-500 text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300")}
                          >
                            Test
                          </button>
                        </div>
                      </div>

                      {/* Wallet section (STRK Only) */}
                      {starknetAccount ? (
                        <div className="px-5 py-5 space-y-4 bg-black/40">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-[8px] text-neutral-600 uppercase tracking-[0.3em] font-black">
                                {walletType === "privy" ? "Privy Protocol" : "Starknet Identity"}
                              </span>
                              <div className="flex items-center gap-1.5" onClick={() => { navigator.clipboard.writeText(walletAddress); }}>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                <span className="font-mono text-[11px] text-neutral-200 group-hover:text-amber-500 transition-colors cursor-copy active:scale-95">
                                  {walletAddress.slice(0, 12)}…{walletAddress.slice(-8)}
                                </span>
                              </div>
                            </div>
                            <button onClick={disconnectWallet} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-red-500/30 hover:bg-red-500/5 text-neutral-600 hover:text-red-400 transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="relative overflow-hidden p-[1px] rounded-xl bg-gradient-to-br from-neutral-800/50 to-transparent">
                            <div className="relative flex items-center justify-between p-4 rounded-[11px] bg-neutral-950/80 backdrop-blur-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                  <Zap className={clsx("w-3.5 h-3.5 fill-amber-500 text-amber-500")} />
                                </div>
                                <div className="flex flex-col -gap-0.5">
                                  <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-wider">STRK Balance</span>
                                  <div className="flex items-center gap-2">
                                    {isFetchingBalance ? (
                                      <div className="h-4 w-16 bg-neutral-900 animate-pulse rounded" />
                                    ) : (
                                      <span className="text-[14px] font-mono text-white font-bold tracking-tight"> {strkBalance || "0.00"}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => fetchStrkBalance(walletAddress)}
                                className="p-2 rounded-lg hover:bg-white/5 text-neutral-700 hover:text-neutral-400 transition-colors"
                              >
                                <RefreshCw className={clsx("w-3.5 h-3.5", isFetchingBalance && "animate-spin")} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-4">
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                          >
                            Connect Wallet
                          </button>
                        </div>
                      )}

                      {/* Fee note */}
                      <div className="px-6 py-4 bg-neutral-950/20">
                        <div className="flex gap-3">
                          <Info className="w-3.5 h-3.5 text-neutral-600 mt-0.5" />
                          <p className="text-[10px] text-neutral-600 leading-relaxed font-medium">
                            Declare & Deploy require <span className="text-neutral-400">STRK</span> for on-chain fees. Starknet no longer uses ETH for standard contract execution. Sponsored writes remain gasless via AVNU.
                          </p>
                        </div>
                      </div>

                      {/* Contract Selection / Ready Metadata */}
                      {activeBuildData && (
                        <div className="px-5 py-4 bg-amber-500/5 mb-4 border-b border-amber-500/10 animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <Box className="w-4 h-4 text-amber-500" />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-amber-500/70 tracking-widest leading-none">Contract Ready</span>
                                <span className="text-sm font-bold text-neutral-200 mt-0.5">{activeFile?.filename}</span>
                             </div>
                          </div>
                          <div className="mt-4 flex items-center gap-4">
                             <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-neutral-600 uppercase">ABI Entries</span>
                                <span className="text-xs font-mono text-neutral-400">{activeBuildData.abi?.length || 0}</span>
                             </div>
                             <div className="w-px h-4 bg-neutral-900" />
                             <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-neutral-600 uppercase">Build Size</span>
                                <span className="text-xs font-mono text-neutral-400">{(JSON.stringify(activeBuildData.casm || {}).length / 1024).toFixed(1)} KB</span>
                             </div>
                          </div>
                        </div>
                      )}

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
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-mono text-neutral-600">salt <span className="text-neutral-700">felt252</span></label>
                              <button
                                onClick={() => setSalt(Math.floor(Math.random() * 1000000).toString())}
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
                              className="w-full mt-1 bg-transparent border-b border-neutral-800 py-1 text-[11px] font-mono outline-none focus:border-amber-500/40 text-neutral-300 placeholder:text-neutral-800"
                            />
                          </div>
                        );
                      })()}

                      {/* Deployment Pipeline (Execution) */}
                      {deploySteps.length > 0 && (
                        <div className="px-6 py-8 bg-black/40 border-y border-neutral-900/50">
                          <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-neutral-600">Execution Pipeline</span>
                          </div>

                          <div className="relative pl-1">
                            {/* Trace Line */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-neutral-900" />

                            <div className="space-y-8">
                              {deploySteps.map((step) => (
                                <div key={step.id} className="relative pl-8">
                                  {/* Node */}
                                  <div className={clsx(
                                    "absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-black z-10 transition-all duration-500",
                                    step.status === "done" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                                      step.status === "active" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                                        step.status === "error" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                          "bg-neutral-800"
                                  )}>
                                    {step.status === "active" && (
                                      <div className="absolute inset-0 rounded-full animate-ping bg-amber-500 opacity-20" />
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <div className={clsx(
                                      "text-[11px] font-bold tracking-tight transition-colors",
                                      step.status === "idle" ? "text-neutral-600" : "text-neutral-200"
                                    )}>
                                      {step.label}
                                    </div>
                                    {step.detail && (
                                      <div className="text-[9px] font-mono text-neutral-500 bg-neutral-900/40 px-1.5 py-0.5 rounded w-fit border border-neutral-800/50">
                                        {step.detail}
                                      </div>
                                    )}
                                    {step.status === "error" && (
                                      <div className="mt-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-[9px] text-red-400 font-medium leading-relaxed italic animate-in fade-in slide-in-from-top-1">
                                        Transaction failed or address occupied. Double check your salt or contract state.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
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
                networkLabel={netConfig.label}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DEPLOY ACCOUNT PROMPT ── */}
      <AnimatePresence>
        {showDeployAccountPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeployAccountPrompt(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm"
            >
              <div className="rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Account Not Deployed</h2>
                  </div>
                  <button onClick={() => setShowDeployAccountPrompt(false)} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-4 h-4 text-neutral-600" />
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mb-6 leading-relaxed">
                  Your wallet is connected but the account contract hasn&apos;t been deployed on {netConfig.label} yet. You need to deploy it once before you can sign transactions.
                </p>
                <p className="text-[10px] text-amber-500/80 mb-6 leading-relaxed">
                  Make sure your wallet has enough STRK/ETH on {netConfig.label} to cover the deployment fee.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeployAccountPrompt(false)}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 font-bold text-[11px] uppercase tracking-widest hover:border-neutral-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeployAccount}
                    disabled={isDeployingAccount}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px] uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isDeployingAccount ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deploying...</> : "Deploy Account"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── STATUS BAR ── */}
      <div className="flex items-center justify-between h-7 px-3 text-[10px] border-t border-neutral-900 bg-[#0a0a0a] text-neutral-600 select-none transition-colors">
        <div className="flex items-center gap-4 h-full">
          <div
            className="flex items-center gap-1.5 h-full px-2 hover:bg-white/5 cursor-pointer transition-colors group"
            onClick={() => handleNetworkSwitch(network === "mainnet" ? "sepolia" : "mainnet")}
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

function ActivityIcon({ icon: Icon, active, onClick }: { icon: LucideIcon; active: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex items-center justify-center w-full h-12 transition-colors group",
        active ? "text-neutral-200" : "text-neutral-600 hover:text-neutral-400"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
      <Icon className={clsx("w-5 h-5 transition-transform", active ? "scale-110" : "group-hover:scale-105")} strokeWidth={1.5} />
    </button>
  );
}

function ContextMenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: LucideIcon;
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
  networkLabel,
}: {
  authenticated: boolean;
  isConnecting: boolean;
  walletError: string | null;
  onPrivyConnect: () => void;
  onExtensionConnect: () => void;
  onClose: () => void;
  networkLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-neutral-800 bg-[#080808] p-1 shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
      {/* Background Decor */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px]" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/5 blur-[100px]" />

      <div className="relative p-8 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/50 flex items-center justify-center mb-6 shadow-2xl">
          <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight text-center">Identity Layer</h2>
        <p className="text-[12px] text-neutral-500 mt-2 text-center max-w-[280px]">
          Connect your Starknet identity to sign transactions on <span className="text-neutral-300 font-bold">{networkLabel}</span>
        </p>

        {/* Connection Options */}
        <div className="w-full grid grid-cols-1 gap-4 mt-10">

          {/* Privy Option (The Modern Way) */}
          <button
            onClick={onPrivyConnect}
            disabled={isConnecting}
            className="group relative flex flex-col p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 hover:border-amber-500/30 transition-all duration-300 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-sm font-bold text-white">Cloud Authentication</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-amber-500 text-[8px] font-black uppercase tracking-widest text-black">
                Fastest
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
              Log in with Email, Google, or Social. No extension needed. Gasless experience powered by AVNU Paymaster.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
              {isConnecting ? "Initiating..." : "Launch Cloud Login"}
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Extension Option (The Classic Way) */}
          <button
            onClick={onExtensionConnect}
            disabled={isConnecting}
            className="group flex flex-col p-5 rounded-2xl bg-neutral-950/20 border border-neutral-800 hover:border-neutral-700 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Globe className="w-4 h-4 text-neutral-400" />
              </div>
              <span className="text-sm font-bold text-neutral-300">Local Extensions</span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-medium">
              Use your existing ArgentX or Braavos browser wallet. Best for heavy users.
            </p>
            <div className="mt-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              {isConnecting ? "Polling..." : "Connect Extension"}
            </div>
          </button>
        </div>

        {walletError && (
          <div className="mt-6 w-full p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-3 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Handshake Failed</span>
              <p className="text-[10px] text-red-300/80 leading-tight font-medium">{walletError}</p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <button
          onClick={onClose}
          className="mt-8 text-[11px] font-bold text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
        >
          Nevermind
        </button>
      </div>
    </div>
  );
}

interface CallLogEntry {
  id: string;
  fnName: string;
  type: "read" | "write";
  inputs: Record<string, string>;
  result?: string;
  error?: string;
  txHash?: string;
  timestamp: number;
  confirmed?: boolean;
}

interface FnResult {
  raw: string[];
  decoded: string;
  extra?: string;
}

function InteractPanel({
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
}: {
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
}) {
  // --- custom target state ---
  const [customAddress, setCustomAddress] = useState("");
  const [customAbiText, setCustomAbiText] = useState("");
  const [customAbiError, setCustomAbiError] = useState("");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [showCustomTarget, setShowCustomTarget] = useState(false);

  // --- function interaction state ---
  const [funcInputs, setFuncInputs] = useState<Record<string, Record<string, string>>>({});
  const [funcResults, setFuncResults] = useState<Record<string, FnResult>>({});
  const [funcLoading, setFuncLoading] = useState<Record<string, boolean>>({});
  const [funcErrors, setFuncErrors] = useState<Record<string, string>>({});

  // --- call log ---
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);

  // --- sub-tab ---
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

  // --- ABI function extraction ---
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
    // Deduplicate by name
    const seen = new Set<string>();
    return fns.filter(fn => {
      if (seen.has(fn.name)) return false;
      seen.add(fn.name);
      return true;
    });
  }, [effectiveAbi]);

  const viewFunctions = externalFunctions.filter((fn: AbiEntry) => fn.state_mutability === "view");
  const writeFunctions = externalFunctions.filter((fn: AbiEntry) => fn.state_mutability === "external");

  // --- Starknet type helpers ---
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
    if (isBool(type)) {
      return [value === "true" || value === "1" ? "1" : "0"];
    }
    if (isArray(type)) {
      const items = value.split(",").map(s => s.trim()).filter(Boolean);
      return [items.length.toString(), ...items];
    }
    if (isOption(type)) {
      if (!value || value === "None") return ["1"];
      return ["0", value];
    }
    if (isByteArray(type)) {
      return [value || "0"]; // Starknet.js handles string -> ByteArray internally
    }
    // felt252 / default: handle short strings if value is not a hex or decimal number
    const isHex = /^0x[a-fA-F0-9]+$/.test(value);
    const isDecimal = /^[0-9]+$/.test(value);
    if (!isHex && !isDecimal && value.length > 0 && value.length <= 31) {
      try {
        return [shortString.encodeShortString(value)];
      } catch { return [value || "0"]; }
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
    // felt252 / address / generic
    const v = raw[0];
    try {
      const n = BigInt(v);
      if (n === BigInt(0)) return { raw, decoded: "0" };
      const dec = n.toString(10);
      const hex = "0x" + n.toString(16).padStart(64, "0");
      // Check if it looks like a short string (felt252 as text)
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

  // --- Call handlers ---
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

  // --- Render single input field ---
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

  // --- Render function card ---
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

  // --- Empty state ---
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
        {/* --- Dashboard Header --- */}
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

          {/* --- External Contract Form (Fullscreen) --- */}
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
                            onClick={() => {
                              setCustomAddress(d.contractAddress);
                              // Auto-fill ABI if possible? (not available in this simplified history)
                            }}
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

        {/* --- Dashboard Content --- */}
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

  return (
    <div className="-m-5 flex flex-col" style={{ minHeight: 0 }}>
      {/* ── Contract bar ── */}
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

        {/* Custom target form */}
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

        {/* Sub-tab bar */}
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

      {/* ── Content ── */}
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

