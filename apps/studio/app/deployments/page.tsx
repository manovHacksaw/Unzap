"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import {
  Download,
  Copy,
  ClipboardCheck,
  Search,
  Loader2,
  LayoutGrid,
  List,
  MoreHorizontal,
  Zap,
  Settings,
  RefreshCw,
  Box,
  ArrowUpRight,
  FlaskConical,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Code2,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────

type Deployment = {
  id: string;
  contractAddress: string;
  classHash: string;
  abi: string;
  name: string;
  network: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type ViewMode = "grid" | "list";
type DownloadState = "idle" | "loading" | "done" | "error";

// ── Utilities ─────────────────────────────────────────────────────────────

function getGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 1 && date.getDate() === now.getDate()) return "Today";
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) return "Yesterday";
  
  if (days < 7) return "Last 7 days";
  return "Older";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 30) return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function truncateAddr(addr: string, pre = 10, post = 6): string {
  if (!addr || addr.length <= pre + post + 1) return addr;
  return `${addr.slice(0, pre)}…${addr.slice(-post)}`;
}

function safeParseAbi(raw: string): unknown[] {
  try { return JSON.parse(raw) as unknown[]; } catch { return []; }
}

// ── Copy Button ───────────────────────────────────────────────────────────

function CopyBtn({ text, size = 12 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className={clsx(
        "flex items-center justify-center rounded transition-colors shrink-0",
        "text-neutral-600 hover:text-neutral-300",
        "p-0.5"
      )}
    >
      {copied
        ? <ClipboardCheck size={size} className="text-emerald-400" />
        : <Copy size={size} />}
    </button>
  );
}

// ── Network Badge ─────────────────────────────────────────────────────────

function NetworkBadge({ network }: { network: string }) {
  const isMain = network === "mainnet";
  return (
    <span className={clsx(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
      isMain
        ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
        : "bg-amber-500/8 border-amber-500/20 text-amber-500"
    )}>
      {network || "sepolia"}
    </span>
  );
}

// ── Dropdown Menu ─────────────────────────────────────────────────────────

type DropdownItem =
  | { type: "item"; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }
  | { type: "separator" };

function Dropdown({ items, children }: { items: DropdownItem[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center justify-center w-6 h-6 rounded text-neutral-600 hover:text-neutral-300 hover:bg-white/5 transition-colors"
      >
        {children}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-white/8 bg-[#0d0d0d] shadow-2xl shadow-black/50 overflow-hidden py-1">
          {items.map((item, i) =>
            item.type === "separator"
              ? <div key={i} className="my-1 border-t border-white/5" />
              : (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false); }}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-colors text-left",
                    item.danger
                      ? "text-red-400 hover:bg-red-500/8"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/4"
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  );
}

// ── Project Card (Grid) ───────────────────────────────────────────────────

function ProjectCardGrid({
  deployment,
  onOpen,
  onDownload,
  downloadState,
  isRecent,
}: {
  deployment: Deployment;
  onOpen: () => void;
  onDownload: () => void;
  downloadState: DownloadState;
  isRecent?: boolean;
}) {
  const menuItems: DropdownItem[] = [
    {
      type: "item",
      label: "Open Project",
      icon: <ArrowUpRight size={12} />,
      onClick: onOpen,
    },
    {
      type: "item",
      label: "Download ZIP",
      icon: <Download size={12} />,
      onClick: onDownload,
    },
    {
      type: "item",
      label: "Open in StackBlitz",
      icon: <ExternalLink size={12} />,
      onClick: () => window.open("https://stackblitz.com/fork/nextjs", "_blank"),
    },
  ];

  return (
    <div
      onClick={onOpen}
      className={clsx(
        "group relative flex flex-col gap-4 p-4 rounded-xl border transition-all cursor-pointer",
        "bg-[#0a0a0a] bg-gradient-to-b from-white/[0.03] to-transparent",
        "hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-amber-500/30",
        isRecent
          ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
          : "border-white/6"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Box size={13} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-200 truncate leading-tight">
              {deployment.name || "Unnamed Contract"}
            </p>
            <p className="text-[10px] font-medium text-neutral-400 mt-0.5">{formatTimeAgo(deployment.createdAt)}</p>
          </div>
        </div>
        <Dropdown items={menuItems}>
          <MoreHorizontal size={14} />
        </Dropdown>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono">
        <span className="text-[9px] text-neutral-700 uppercase tracking-wider shrink-0">addr</span>
        <span className="text-[11px] text-neutral-400 flex-1 truncate">
          {truncateAddr(deployment.contractAddress)}
        </span>
        <CopyBtn text={deployment.contractAddress} size={11} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div title="Deployed Successfully" className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          </div>
          <NetworkBadge network={deployment.network} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            disabled={downloadState === "loading"}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
              downloadState === "loading"
                ? "bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5"
                : downloadState === "done"
                ? "bg-emerald-500 text-black border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "bg-neutral-200 text-black hover:bg-white border border-transparent shadow-[0_0_10px_rgba(255,255,255,0.05)]"
            )}
          >
            {downloadState === "loading" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : downloadState === "done" ? (
              <CheckCircle2 size={12} />
            ) : (
              <Download size={12} />
            )}
            {downloadState === "done" ? "Downloaded" : "Download"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.open("https://stackblitz.com/fork/nextjs", "_blank"); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-white/10 bg-transparent text-neutral-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <Zap size={12} />
            StackBlitz
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Row (List) ────────────────────────────────────────────────────

function ProjectCardList({
  deployment,
  onOpen,
  onDownload,
  downloadState,
  isRecent,
}: {
  deployment: Deployment;
  onOpen: () => void;
  onDownload: () => void;
  downloadState: DownloadState;
  isRecent?: boolean;
}) {
  const menuItems: DropdownItem[] = [
    { type: "item", label: "Open Project", icon: <ArrowUpRight size={12} />, onClick: onOpen },
    { type: "item", label: "Download ZIP", icon: <Download size={12} />, onClick: onDownload },
    {
      type: "item",
      label: "Open in StackBlitz",
      icon: <ExternalLink size={12} />,
      onClick: () => window.open("https://stackblitz.com/fork/nextjs", "_blank"),
    },
  ];

  return (
    <div
      onClick={onOpen}
      className={clsx(
        "group flex items-center gap-4 px-4 py-3 rounded-xl border transition-all cursor-pointer",
        "bg-[#0a0a0a] bg-gradient-to-b from-white/[0.03] to-transparent",
        "hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-amber-500/30",
        isRecent
          ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
          : "border-white/6"
      )}
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
        <Box size={13} className="text-amber-500" />
      </div>

      {/* Name */}
      <div className="w-36 shrink-0">
        <p className="text-[13px] font-semibold text-neutral-200 truncate">
          {deployment.name || "Unnamed Contract"}
        </p>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="font-mono text-[11px] text-neutral-500 truncate">
          {truncateAddr(deployment.contractAddress, 14, 8)}
        </span>
        <CopyBtn text={deployment.contractAddress} size={11} />
      </div>

      {/* Network */}
      <div className="w-24 shrink-0 flex items-center gap-2">
        <div title="Deployed Successfully" className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/10 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
        </div>
        <NetworkBadge network={deployment.network} />
      </div>

      {/* Time */}
      <div className="w-24 shrink-0 text-right">
        <span className="text-[11px] font-medium text-neutral-400">{formatTimeAgo(deployment.createdAt)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto min-w-[140px] justify-end" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          disabled={downloadState === "loading"}
          title="Download ZIP"
          className={clsx(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all",
            downloadState === "loading"
              ? "bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5"
              : downloadState === "done"
              ? "bg-emerald-500 text-black border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              : "bg-neutral-200 text-black hover:bg-white border border-transparent shadow-[0_0_10px_rgba(255,255,255,0.05)]"
          )}
        >
          {downloadState === "loading"
            ? <Loader2 size={12} className="animate-spin" />
            : downloadState === "done"
            ? <CheckCircle2 size={12} />
            : <Download size={12} />}
          Download
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); window.open("https://stackblitz.com/fork/nextjs", "_blank"); }}
          title="Open in StackBlitz"
          className="flex items-center justify-center w-7 h-7 rounded text-neutral-600 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
        >
          <Zap size={12} />
        </button>
        <Dropdown items={menuItems}>
          <MoreHorizontal size={14} />
        </Dropdown>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Search size={28} className="text-neutral-800 mb-3" />
        <p className="text-sm font-medium text-neutral-500">No matching projects</p>
        <p className="text-xs text-neutral-700 mt-1">Try a different name or address</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-center mb-4">
        <Box size={20} className="text-amber-500/60" />
      </div>
      <p className="text-sm font-semibold text-neutral-400 mb-1">No deployments yet</p>
      <p className="text-xs text-neutral-600 mb-5">
        Deploy a Cairo contract to see your projects here
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
      >
        <FlaskConical size={13} />
        Open Contract Lab
      </Link>
    </div>
  );
}

// ── Auth Gate ─────────────────────────────────────────────────────────────

function AuthGate({ login }: { login: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
        <Code2 size={20} className="text-neutral-500" />
      </div>
      <p className="text-sm font-semibold text-neutral-300 mb-1">Sign in to view your projects</p>
      <p className="text-xs text-neutral-600 mb-5">Your deployments are synced to your account</p>
      <button
        onClick={login}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
      >
        Connect account
      </button>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

const sidebarNav = [
  { label: "Projects", href: "/deployments", icon: <LayoutGrid size={14} />, active: true },
  { label: "Contract Lab", href: "/", icon: <FlaskConical size={14} /> },
  { label: "Studio", href: "/studio", icon: <Code2 size={14} /> },
];

function Sidebar({ user }: { user: { email?: string; wallet?: string } | null }) {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-white/6 bg-[#070707] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
        <Image
          src="/brand/unzap-logo.png"
          alt="Unzap"
          width={28}
          height={28}
          className="shrink-0 object-contain"
        />
        <span className="text-white font-bold tracking-[0.2em] text-sm uppercase">Unzap</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-px overflow-y-auto">
        <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-700">
          Workspace
        </p>
        {sidebarNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors",
              item.active
                ? "bg-white/6 text-neutral-200 border border-white/8"
                : "text-neutral-600 hover:text-neutral-300 hover:bg-white/4"
            )}
          >
            <span className={item.active ? "text-amber-500" : ""}>{item.icon}</span>
            {item.label}
            {item.active && <ChevronRight size={10} className="ml-auto text-neutral-600" />}
          </Link>
        ))}

        <div className="pt-4">
          <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-700">
            Tools
          </p>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-white/4 transition-colors"
          >
            <Settings size={14} />
            Settings
          </Link>
        </div>
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/4 transition-colors cursor-default">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/25 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-amber-400">
                {(user.email ?? user.wallet ?? "U").slice(0, 1).toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 truncate flex-1">
              {user.email ?? (user.wallet ? truncateAddr(user.wallet, 6, 4) : "Account")}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function DeploymentsPage() {
  const router = useRouter();
  const { ready, authenticated, login, user, getAccessToken } = usePrivy();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});
  const [networkFilter, setNetworkFilter] = useState<string>("all");

  // Derive user display info
  const userInfo = useMemo(() => {
    if (!user) return null;
    const email = user.email?.address;
    const wallet = user.linkedAccounts?.find((a) => a.type === "wallet")
      ? (user.linkedAccounts.find((a) => a.type === "wallet") as { address?: string })?.address
      : undefined;
    return { email, wallet };
  }, [user]);

  // Fetch deployments
  const fetchDeployments = useCallback(async (isRefresh = false) => {
    if (!authenticated) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      // Try cache first for initial load
      if (!isRefresh) {
        const cached = localStorage.getItem("unzap:history");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.deployments)) setDeployments(parsed.deployments);
          } catch { /* ignore */ }
        }
      }
      const token = await getAccessToken();
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (Array.isArray(data.deployments)) {
        setDeployments(data.deployments);
        localStorage.setItem("unzap:history", JSON.stringify(data));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready) return;
    fetchDeployments();
  }, [ready, authenticated, fetchDeployments]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return deployments
      .filter((d) => {
        const matchSearch = !q
          || d.name.toLowerCase().includes(q)
          || d.contractAddress.toLowerCase().includes(q)
          || d.network.toLowerCase().includes(q);
        const matchNetwork = networkFilter === "all" || d.network === networkFilter;
        return matchSearch && matchNetwork;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [deployments, search, networkFilter]);

  // Grouped logic
  const groupOrder = ["Today", "Yesterday", "Last 7 days", "Older"];
  const grouped = useMemo(() => {
    const groups: Record<string, Deployment[]> = {
      "Today": [],
      "Yesterday": [],
      "Last 7 days": [],
      "Older": [],
    };
    filtered.forEach(d => {
      const g = getGroupLabel(d.createdAt);
      if (groups[g]) groups[g].push(d);
    });
    return groups;
  }, [filtered]);

  // Networks for filter
  const networks = useMemo(() => {
    const set = new Set(deployments.map((d) => d.network).filter(Boolean));
    return Array.from(set);
  }, [deployments]);

  // Open project — clean route
  const handleOpen = useCallback((d: Deployment) => {
    router.push(`/deployments/${d.id}`);
  }, [router]);

  // Download ZIP
  const handleDownload = useCallback(async (d: Deployment) => {
    setDownloadStates((s) => ({ ...s, [d.id]: "loading" }));
    try {
      const abi = safeParseAbi(d.abi);
      const res = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractName: d.name || "Contract",
          contractAddress: d.contractAddress,
          classHash: d.classHash,
          network: d.network || "sepolia",
          abi,
          format: "zip",
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.name || "contract"}-app.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadStates((s) => ({ ...s, [d.id]: "done" }));
      setTimeout(() => setDownloadStates((s) => ({ ...s, [d.id]: "idle" })), 3000);
    } catch {
      setDownloadStates((s) => ({ ...s, [d.id]: "error" }));
      setTimeout(() => setDownloadStates((s) => ({ ...s, [d.id]: "idle" })), 2000);
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar user={userInfo} />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-[#070707] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-sm font-bold text-neutral-200 tracking-tight">Projects</h1>
            <span className="hidden sm:flex items-center justify-center px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-[9px] font-mono text-neutral-600 min-w-[20px]">
              {deployments.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 bg-white/3 focus-within:border-white/15 focus-within:bg-white/5 transition-all">
              <Search size={12} className="text-neutral-700 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                className="flex-1 bg-transparent text-[12px] text-neutral-300 placeholder:text-neutral-700 outline-none min-w-0"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-neutral-700 hover:text-neutral-400 transition-colors">
                  <XCircle size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Network filter */}
            {networks.length > 1 && (
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="h-7 px-2 rounded-lg border border-white/8 bg-white/3 text-[11px] text-neutral-400 outline-none cursor-pointer hover:border-white/15 transition-colors"
              >
                <option value="all">All networks</option>
                {networks.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchDeployments(true)}
              disabled={refreshing}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/8 bg-white/3 text-neutral-600 hover:text-neutral-300 hover:border-white/15 hover:bg-white/5 transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            </button>

            {/* View toggle */}
            <div className="flex items-center border border-white/8 rounded-lg overflow-hidden bg-white/3">
              <button
                onClick={() => setViewMode("grid")}
                className={clsx(
                  "flex items-center justify-center w-7 h-7 transition-colors",
                  viewMode === "grid" ? "bg-white/8 text-neutral-200" : "text-neutral-600 hover:text-neutral-400"
                )}
              >
                <LayoutGrid size={12} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={clsx(
                  "flex items-center justify-center w-7 h-7 transition-colors",
                  viewMode === "list" ? "bg-white/8 text-neutral-200" : "text-neutral-600 hover:text-neutral-400"
                )}
              >
                <List size={12} />
              </button>
            </div>

            {/* New project */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 h-7 px-3 rounded-lg bg-amber-500 text-black text-[11px] font-bold hover:bg-amber-400 transition-colors shrink-0"
            >
              <FlaskConical size={11} />
              New Project
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Not ready */}
          {!ready && (
            <div className="flex items-center justify-center py-32">
              <Loader2 size={20} className="animate-spin text-neutral-700" />
            </div>
          )}

          {/* Not authenticated */}
          {ready && !authenticated && <AuthGate login={login} />}

          {/* Loading */}
          {ready && authenticated && loading && deployments.length === 0 && (
            <div className="flex items-center justify-center py-32 gap-2 text-neutral-700">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-mono">Loading projects…</span>
            </div>
          )}

          {/* Error */}
          {ready && authenticated && error && deployments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="flex items-center gap-2 text-red-400/70 text-xs">
                <XCircle size={14} />
                <span>Failed to load — using cached data</span>
              </div>
              <button
                onClick={() => fetchDeployments(true)}
                className="text-[11px] text-neutral-600 hover:text-neutral-400 underline transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Content */}
          {ready && authenticated && !loading && (
            <>
              {filtered.length === 0 ? (
                <EmptyState hasSearch={search.length > 0 || networkFilter !== "all"} />
              ) : viewMode === "grid" ? (
                <div className="space-y-8">
                  {groupOrder.map(group => {
                    const items = grouped[group];
                    if (items.length === 0) return null;
                    return (
                      <div key={group}>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3 ml-1">{group}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {items.map((d) => (
                            <ProjectCardGrid
                              key={d.id}
                              deployment={d}
                              isRecent={filtered.indexOf(d) < 2}
                              onOpen={() => handleOpen(d)}
                              onDownload={() => handleDownload(d)}
                              downloadState={downloadStates[d.id] ?? "idle"}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Global list header */}
                  <div className="hidden sm:flex items-center gap-4 px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-700">
                    <div className="w-7 shrink-0" />
                    <div className="w-36 shrink-0">Name</div>
                    <div className="flex-1">Address</div>
                    <div className="w-24 shrink-0">Network</div>
                    <div className="w-24 shrink-0 text-right">Deployed</div>
                    <div className="shrink-0 ml-auto min-w-[140px]" />
                  </div>
                  {groupOrder.map(group => {
                    const items = grouped[group];
                    if (items.length === 0) return null;
                    return (
                      <div key={group} className="space-y-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2 ml-4">{group}</h3>
                        {items.map((d) => (
                          <ProjectCardList
                            key={d.id}
                            deployment={d}
                            isRecent={filtered.indexOf(d) < 2}
                            onOpen={() => handleOpen(d)}
                            onDownload={() => handleDownload(d)}
                            downloadState={downloadStates[d.id] ?? "idle"}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="shrink-0 px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-neutral-800">
            {deployments.length} deployment{deployments.length !== 1 ? "s" : ""} total
          </span>
          <Link
            href="/"
            className="text-[10px] text-neutral-800 hover:text-neutral-500 transition-colors flex items-center gap-1"
          >
            Contract Lab
            <ArrowUpRight size={10} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
