"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Copy,
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Box,
  FlaskConical,
  Zap,
  Terminal,
  File,
  Folder,
  LayoutGrid,
  Code2,
  Settings,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────

type Deployment = {
  id: string;
  contractAddress: string;
  classHash: string;
  abi: string;
  name: string | null;
  network: string;
  userId: string;
  createdAt: string;
};

type FileNode = { name: string; path: string; type: "file" | "folder"; children?: FileNode[] };

// ── Utilities ─────────────────────────────────────────────────────────────

function truncateAddr(addr: string, pre = 12, post = 8): string {
  if (!addr || addr.length <= pre + post + 1) return addr;
  return `${addr.slice(0, pre)}…${addr.slice(-post)}`;
}

function formatDate(str: string) {
  return new Date(str).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTimeAgo(str: string): string {
  const diff = Date.now() - new Date(str).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function safeParseAbi(raw: string): unknown[] {
  try { return JSON.parse(raw) as unknown[]; } catch { return []; }
}

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];
  Object.keys(files).forEach((path) => {
    const parts = path.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const fp = parts.slice(0, i + 1).join("/");
      let node = cur.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: fp, type: isLast ? "file" : "folder", children: isLast ? undefined : [] };
        cur.push(node);
      }
      if (node.children) cur = node.children;
    });
  });
  const sort = (nodes: FileNode[]) => {
    nodes.sort((a, b) => a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root);
  return root;
}

// ── Copy Button ───────────────────────────────────────────────────────────

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className={clsx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border transition-all",
        copied
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-white/4 border-white/8 text-neutral-600 hover:text-neutral-300 hover:border-white/15"
      )}
    >
      {copied ? <ClipboardCheck size={10} /> : <Copy size={10} />}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

// ── Network Badge ─────────────────────────────────────────────────────────

function NetworkBadge({ network }: { network: string }) {
  const isMain = network === "mainnet";
  return (
    <span className={clsx(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
      isMain
        ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
        : "bg-amber-500/8 border-amber-500/20 text-amber-500"
    )}>
      {network || "sepolia"}
    </span>
  );
}

// ── Code Block ────────────────────────────────────────────────────────────

function CodeBlock({ code, label, lang = "plain" }: { code: string; label?: string; lang?: "env" | "shell" | "plain" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(code).then(() => {
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  });

  const renderEnv = () => code.split("\n").map((line, i) => {
    const eq = line.indexOf("=");
    if (eq === -1) return <div key={i} className="text-neutral-600">{line || "\u00a0"}</div>;
    return (
      <div key={i}>
        <span className="text-sky-400">{line.slice(0, eq)}</span>
        <span className="text-neutral-700">=</span>
        <span className="text-amber-300/70">{line.slice(eq + 1)}</span>
      </div>
    );
  });

  const renderShell = () => code.split("&&").map((part, i, arr) => (
    <span key={i}>
      <span className="text-emerald-400">{part.trim()}</span>
      {i < arr.length - 1 && <span className="text-neutral-600"> &amp;&amp; </span>}
    </span>
  ));

  return (
    <div className="rounded-xl border border-white/6 bg-black/60 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.015]">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-700">{label}</span>
          <button onClick={copy} className={clsx("inline-flex items-center gap-1 text-[9px] rounded px-1.5 py-0.5 border transition-all", copied ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/8" : "border-white/8 text-neutral-600 hover:text-neutral-300")}>
            {copied ? <ClipboardCheck size={9} /> : <Copy size={9} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="px-5 py-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
        {lang === "env" ? renderEnv() : lang === "shell" ? renderShell() : <span className="text-neutral-300">{code}</span>}
      </pre>
    </div>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────

function Step({ n, title, description, children, last = false }: {
  n: number; title: string; description?: string; children?: React.ReactNode; last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-6 h-6 rounded-full border border-white/12 bg-white/4 flex items-center justify-center text-[10px] font-bold font-mono text-neutral-500 shrink-0">
          {n}
        </div>
        {!last && <div className="w-px flex-1 mt-2 bg-white/6 min-h-5" />}
      </div>
      <div className={clsx("space-y-3 w-full", !last && "pb-7")}>
        <div className="pt-0.5 space-y-0.5">
          <p className="text-sm font-semibold text-neutral-200">{title}</p>
          {description && <p className="text-xs text-neutral-600 leading-relaxed">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── File Tree ─────────────────────────────────────────────────────────────

function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  return (
    <div className="space-y-px">
      {nodes.map((node) => (
        <div key={node.path}>
          <div className="flex items-center gap-2 py-0.5 rounded text-[11px] font-mono text-neutral-600 hover:text-neutral-400 transition-colors" style={{ paddingLeft: `${depth * 14}px` }}>
            {node.type === "folder"
              ? <Folder size={11} className="text-amber-500/50 shrink-0" />
              : <File size={11} className="text-neutral-700 shrink-0" />}
            {node.name}
          </div>
          {node.children && <FileTree nodes={node.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left">
        <ChevronRight size={13} className={clsx("text-neutral-700 transition-transform duration-200", open && "rotate-90")} />
        <span className="text-xs font-semibold text-neutral-400">{title}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

const sidebarNav = [
  { label: "Projects", href: "/studio/deployments", icon: <LayoutGrid size={14} /> },
  { label: "Contract Lab", href: "/studio/contract-lab", icon: <FlaskConical size={14} /> },
  { label: "Studio", href: "/studio", icon: <Code2 size={14} /> },
];

function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-white/6 bg-[#070707] h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
        <Image src="/brand/unzap-logo.png" alt="Unzap" width={28} height={28} className="shrink-0 object-contain" />
        <span className="text-white font-bold tracking-[0.2em] text-sm uppercase">Unzap</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-px">
        <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-700">Workspace</p>
        {sidebarNav.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-white/4 transition-colors">
            {item.icon}
            {item.label}
          </Link>
        ))}
        <div className="pt-4">
          <p className="px-3 mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-700">Tools</p>
          <Link href="/studio/contract-lab" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-white/4 transition-colors">
            <Settings size={14} />
            Settings
          </Link>
        </div>
      </nav>
    </aside>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function DeploymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Record<string, string>>({});
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setTerminalLogs((p) => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // Fetch deployment
  const fetchDeployment = useCallback(async () => {
    if (!authenticated) { setLoading(false); return; }
    setLoading(true);

    // Try localStorage cache first
    try {
      const cached = localStorage.getItem("unzap:history");
      if (cached) {
        const parsed = JSON.parse(cached);
        const found = parsed.deployments?.find((d: Deployment) => d.id === id);
        if (found) setDeployment(found);
      }
    } catch { /* ignore */ }

    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/deployments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!res.ok) throw new Error("fetch failed");
      const data: Deployment = await res.json();
      setDeployment(data);
    } catch {
      // silently fall back to cache
    } finally {
      setLoading(false);
    }
  }, [id, authenticated, getAccessToken]);

  useEffect(() => {
    if (!ready) return;
    fetchDeployment();
  }, [ready, authenticated, fetchDeployment]);

  // Update document title dynamically
  useEffect(() => {
    if (deployment) {
      document.title = `${deployment.name || "Unnamed Contract"} | Deployment Details | Unzap`;
    } else {
      document.title = "Deployment Details | Unzap";
    }
  }, [deployment]);

  // Generate files (lazy – only when accordion opens)
  const loadFiles = useCallback(async () => {
    if (!deployment || filesLoaded || filesLoading) return;
    setFilesLoading(true);
    addLog("Generating project files…");
    try {
      const abi = safeParseAbi(deployment.abi);
      const res = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractName: deployment.name || "Contract",
          contractAddress: deployment.contractAddress,
          classHash: deployment.classHash,
          network: deployment.network,
          abi,
          format: "json",
        }),
      });
      if (!res.ok) throw new Error("generation failed");
      const data = await res.json();
      setGeneratedFiles(data.files ?? {});
      setFilesLoaded(true);
      addLog("✅ Files ready.");
    } catch (e) {
      addLog(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setFilesLoading(false);
    }
  }, [deployment, filesLoaded, filesLoading]);

  // Download ZIP
  const handleDownload = useCallback(async () => {
    if (!deployment) return;
    setDownloadState("loading");
    addLog("Generating ZIP…");
    try {
      const abi = safeParseAbi(deployment.abi);
      const res = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractName: deployment.name || "Contract",
          contractAddress: deployment.contractAddress,
          classHash: deployment.classHash,
          network: deployment.network,
          abi,
          format: "zip",
        }),
      });
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deployment.name || "contract"}-app.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addLog("✅ Downloaded.");
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 3000);
    } catch {
      addLog("❌ Download failed.");
      setDownloadState("error");
      setTimeout(() => setDownloadState("idle"), 2000);
    }
  }, [deployment]);

  // Env content
  const envContent = deployment
    ? [
        `NEXT_PUBLIC_CONTRACT_ADDRESS=${deployment.contractAddress}`,
        deployment.classHash ? `NEXT_PUBLIC_CLASS_HASH=${deployment.classHash}` : null,
        `NEXT_PUBLIC_NETWORK=${deployment.network}`,
        `NEXT_PUBLIC_RPC_URL=${deployment.network === "mainnet"
          ? "https://starknet-mainnet.public.blastapi.io"
          : "https://starknet-sepolia.public.blastapi.io"}`,
      ].filter(Boolean).join("\n") as string
    : "";

  const explorerUrl = deployment?.contractAddress
    ? `https://${deployment.network === "mainnet" ? "" : "sepolia."}voyager.online/contract/${deployment.contractAddress}`
    : "";

  const fileTree = buildFileTree(generatedFiles);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-6 py-3.5 border-b border-white/5 bg-[#070707] shrink-0">
          <Link href="/studio/deployments" className="flex items-center gap-1.5 text-[11px] text-neutral-600 hover:text-neutral-300 transition-colors">
            <ArrowLeft size={13} />
            Deployments
          </Link>
          <span className="text-neutral-800">/</span>
          <span className="text-[11px] text-neutral-500 font-mono truncate max-w-[180px]">
            {deployment?.name || id}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/studio/contract-lab" className="hidden sm:flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/4 border border-white/8 text-neutral-400 text-[11px] font-medium hover:bg-white/6 hover:text-neutral-200 transition-all">
              <FlaskConical size={11} />
              Contract Lab
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Loading */}
          {(!ready || loading) && (
            <div className="flex items-center justify-center py-40 gap-2 text-neutral-700">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-mono">Loading deployment…</span>
            </div>
          )}

          {/* Auth gate */}
          {ready && !authenticated && (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Code2 size={28} className="text-neutral-700" />
              <p className="text-sm font-medium text-neutral-400">Sign in to view this deployment</p>
              <button onClick={login} className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors">
                Connect account
              </button>
            </div>
          )}

          {/* Not found */}
          {ready && authenticated && !loading && notFound && (
            <div className="flex flex-col items-center justify-center py-40 gap-3">
              <XCircle size={28} className="text-neutral-700" />
              <p className="text-sm font-medium text-neutral-500">Deployment not found</p>
              <Link href="/studio/deployments" className="text-[11px] text-amber-500 hover:text-amber-400 underline">
                ← Back to all deployments
              </Link>
            </div>
          )}

          {/* Deployment detail */}
          {ready && authenticated && !loading && deployment && (
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

              {/* ── Hero ── */}
              <div className="space-y-4">
                {/* Status + network */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/6 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                    <CheckCircle2 size={10} />
                    Deployed
                  </div>
                  <NetworkBadge network={deployment.network} />
                  <span className="text-[10px] text-neutral-700 font-mono">
                    {formatTimeAgo(deployment.createdAt)}
                  </span>
                </div>

                {/* Title */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Box size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-100 tracking-tight leading-tight">
                      {deployment.name || "Unnamed Contract"}
                    </h1>
                    <p className="text-xs text-neutral-600 mt-1 font-mono">
                      {formatDate(deployment.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Primary actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleDownload}
                    disabled={downloadState === "loading"}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                      downloadState === "loading" && "opacity-60 cursor-not-allowed",
                      downloadState === "done"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-amber-500 text-black hover:bg-amber-400"
                    )}
                  >
                    {downloadState === "loading"
                      ? <Loader2 size={14} className="animate-spin" />
                      : downloadState === "done"
                      ? <CheckCircle2 size={14} />
                      : <Download size={14} />}
                    {downloadState === "done" ? "Downloaded" : "Download Starter App"}
                  </button>
                  <a
                    href="https://stackblitz.com/fork/nextjs"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 bg-white/4 text-neutral-300 hover:bg-white/7 hover:border-white/16 transition-all"
                  >
                    <Zap size={14} className="text-amber-400" />
                    Open in StackBlitz
                  </a>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/10 bg-white/4 text-neutral-300 hover:bg-white/7 hover:border-white/16 transition-all"
                    >
                      <ExternalLink size={14} />
                      View on Explorer
                    </a>
                  )}
                </div>
              </div>

              {/* ── Contract details ── */}
              <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-700">Contract Details</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {[
                    {
                      label: "Contract Address",
                      value: deployment.contractAddress,
                      mono: true,
                      copy: true,
                      display: truncateAddr(deployment.contractAddress),
                    },
                    {
                      label: "Class Hash",
                      value: deployment.classHash,
                      mono: true,
                      copy: !!deployment.classHash,
                      display: deployment.classHash ? truncateAddr(deployment.classHash) : "—",
                    },
                    { label: "Network", value: deployment.network, mono: false, copy: false, display: deployment.network },
                    { label: "Deployed", value: "", mono: false, copy: false, display: formatDate(deployment.createdAt) },
                    { label: "Deployment ID", value: deployment.id, mono: true, copy: true, display: deployment.id },
                  ].map(({ label, value, mono, copy, display }) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                      <span className="text-[11px] text-neutral-600 shrink-0 w-36">{label}</span>
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <span className={clsx("text-[12px] text-neutral-300 truncate", mono && "font-mono")}>
                          {display}
                        </span>
                        {copy && value && <CopyBtn text={value} />}
                        {label === "Contract Address" && explorerUrl && (
                          <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center w-5 h-5 rounded text-neutral-700 hover:text-amber-400 transition-colors">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Setup guide ── */}
              <div className="rounded-2xl border border-white/6 bg-[#0a0a0a] p-6 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-700 mb-6">Run Locally</p>

                <Step n={1} title="Download & extract" description="Download the ZIP above and unpack it to your workspace." />

                <Step n={2} title="Configure environment" description="Create .env.local at the project root:">
                  <CodeBlock code={envContent} label=".env.local" lang="env" />
                </Step>

                <Step n={3} title="Start dev server" last>
                  <CodeBlock code="npm install && npm run dev" lang="shell" />
                </Step>
              </div>

              {/* ── Terminal log ── */}
              {terminalLogs.length > 0 && (
                <div className="rounded-xl border border-white/6 bg-black/60 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.015]">
                    <Terminal size={11} className="text-neutral-700" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-700">output</span>
                  </div>
                  <div className="p-4 font-mono text-[11px] leading-relaxed space-y-1 max-h-32 overflow-y-auto">
                    {terminalLogs.map((log, i) => (
                      <div key={i} className={clsx(log.includes("✅") ? "text-emerald-400" : log.includes("❌") ? "text-red-400/80" : "text-neutral-600")}>
                        {log}
                      </div>
                    ))}
                    {(filesLoading || downloadState === "loading") && (
                      <span className="text-neutral-700 animate-pulse">_</span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Accordions ── */}
              <div className="space-y-2">
                <div onClick={() => { if (!filesLoaded && !filesLoading) loadFiles(); }}>
                  <Accordion title={`Generated files${Object.keys(generatedFiles).length > 0 ? ` · ${Object.keys(generatedFiles).length} files` : ""}`}>
                    {filesLoading ? (
                      <div className="flex items-center gap-2 py-4 text-neutral-700">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="text-xs font-mono">Generating…</span>
                      </div>
                    ) : filesLoaded ? (
                      <div className="max-h-52 overflow-y-auto py-1" style={{ scrollbarWidth: "thin" }}>
                        <FileTree nodes={fileTree} />
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-700 py-2">Click to load file tree</p>
                    )}
                  </Accordion>
                </div>

                <Accordion title=".env.local preview" defaultOpen>
                  <div className="pt-1">
                    <CodeBlock code={envContent} lang="env" />
                  </div>
                </Accordion>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[10px] text-neutral-700">
                <Link href="/studio/deployments" className="hover:text-neutral-500 transition-colors flex items-center gap-1">
                  <ArrowLeft size={10} /> All deployments
                </Link>
                <Link href="/studio/contract-lab" className="hover:text-neutral-500 transition-colors flex items-center gap-1">
                  Contract Lab <ChevronRight size={10} />
                </Link>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
