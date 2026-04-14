"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Syne } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Code2, Copy, Check, Download, Sparkles, Eye,
  PenLine, Hash, Globe, FileCode, X, AlertCircle, BookOpen,
  ChevronRight, Zap, Loader2, Package, CheckCircle2,
  Shield, Server, Activity, type LucideIcon,
} from "lucide-react";
import type { AbiEntry } from "@/app/studio/contract-lab/types";

// ── fonts ─────────────────────────────────────────────────────────────────────
const syne = Syne({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-syne", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-jb-mono", display: "swap" });

// ── types ─────────────────────────────────────────────────────────────────────
interface GenerateResult {
  /** All generated project files: filepath → content */
  files: Record<string, string>;
  hooksFilename: string;
  functions: { reads: string[]; writes: string[] };
}

// ── page section nav ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "workspace", icon: Hash, label: "Workspace" },
];

// ── simple_storage ABI (matches Contract Lab default) ─────────────────────────
const SIMPLE_STORAGE_ABI: AbiEntry[] = [
  { type: "function", name: "set", inputs: [{ name: "value", type: "core::felt252" }], outputs: [], state_mutability: "external" },
  { type: "function", name: "get", inputs: [], outputs: [{ type: "core::felt252" }], state_mutability: "view" },
];

// ── shiki-based syntax highlighting ──────────────────────────────────────────
function detectLang(filename: string): string {
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".tsx")) return "tsx";
  if (filename.endsWith(".cairo")) return "rust"; // closest available
  if (filename === "terminal") return "bash";
  return "typescript";
}

// Lightweight fallback highlighter used until shiki loads
function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function highlightCode(raw: string): string {
  return raw.split("\n").map((line) => {
    const t = line.trimStart();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#")) {
      return `<span class="tok-com">${escHtml(line)}</span>`;
    }
    let s = escHtml(line);
    const strs: string[] = [];
    s = s.replace(/(`[^`]*`|&#39;[^&#]*&#39;|&quot;[^&]*&quot;|'[^']*'|"[^"]*")/g, (m) => { strs.push(m); return `\x01${strs.length - 1}\x01`; });
    const coms: string[] = [];
    s = s.replace(/(\/\/[^\n]*)/g, (m) => { coms.push(m); return `\x02${coms.length - 1}\x02`; });
    s = s.replace(/\b(export|default|function|const|let|var|async|await|return|import|from|type|interface|typeof|instanceof|extends|implements|class|new|null|undefined|true|false|void|if|else|try|catch|throw|for|of|in|while|break|continue|string|number|boolean|Promise|ReactNode|React|useState|useCallback|useEffect|useRef|useContext|createContext)\b/g, '<span class="tok-kw">$1</span>');
    strs.forEach((str, i) => { s = s.replace(`\x01${i}\x01`, `<span class="tok-str">${str}</span>`); });
    coms.forEach((com, i) => { s = s.replace(`\x02${i}\x02`, `<span class="tok-com">${com}</span>`); });
    return s;
  }).join("\n");
}

function useShiki(code: string, filename: string): string | null {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("shiki").then(({ codeToHtml }) =>
      codeToHtml(code, { lang: detectLang(filename), theme: "github-dark" })
        .then(h => { if (!cancelled) setHtml(h); })
        .catch(() => {})
    ).catch(() => {});
    return () => { cancelled = true; };
  }, [code, filename]);
  return html;
}

// ── CodeViewer ────────────────────────────────────────────────────────────────
function CodeViewer({ code, filename, maxH = "440px" }: { code: string; filename: string; maxH?: string }) {
  const [copied, setCopied] = useState(false);
  const shikiHtml = useShiki(code, filename);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* titlebar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", gap: "5px" }}>
            {["#ff5f56","#febc2e","#28c840"].map((c, i) => <div key={i} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c }} />)}
          </div>
          <span className="hg-mono" style={{ fontSize: "11px", color: "#6e7681" }}>{filename}</span>
        </div>
        <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: "5px", color: copied ? "#3fb950" : "#6e7681", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#c9d1d9"; }}
          onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#6e7681"; }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="hg-mono" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {/* code area — shiki when ready, plain pre as fallback */}
      {shikiHtml ? (
        <div className="hg-shiki-viewer" style={{ overflow: "auto", maxHeight: maxH }}
          dangerouslySetInnerHTML={{ __html: shikiHtml }} />
      ) : (
        <div style={{ overflow: "auto", maxHeight: maxH, background: "#0d1117", padding: "12px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {code.split("\n").map((line, i) => (
                <tr key={i} className="hg-code-row">
                  <td className="hg-mono" style={{ color: "#3d444d", userSelect: "none", textAlign: "right", padding: "0 16px", fontSize: "11px", width: "40px", verticalAlign: "top" }}>{i + 1}</td>
                  <td className="hg-mono" style={{ color: "#c9d1d9", fontSize: "11.5px", lineHeight: "1.7", padding: "0 20px 0 0", verticalAlign: "top", whiteSpace: "pre" }}>{line || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Snippet ───────────────────────────────────────────────────────────────────
function Snippet({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const shikiHtml = useShiki(code, filename);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div style={{ borderRadius: "8px", overflow: "hidden", marginTop: "10px", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 12px", background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="hg-mono" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.18em", color: "#6e7681" }}>{filename}</span>
        <button onClick={copy} style={{ color: copied ? "#3fb950" : "#6e7681", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}>
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
      {shikiHtml ? (
        <div className="hg-shiki-snippet" dangerouslySetInnerHTML={{ __html: shikiHtml }} />
      ) : (
        <pre className="hg-mono" style={{ fontSize: "10.5px", color: "#c9d1d9", lineHeight: "1.65", padding: "10px 14px", overflow: "auto", whiteSpace: "pre", margin: 0, background: "#0d1117" }}>{code}</pre>
      )}
    </div>
  );
}

// ── Callout ───────────────────────────────────────────────────────────────────
function Callout({ icon: Icon, color, title, children }: { icon: LucideIcon; color: string; title: string; children: React.ReactNode }) {
  const rgb = color === "#10b981" ? "16,185,129" : color === "#f59e0b" ? "245,158,11" : color === "#ef4444" ? "239,68,68" : "167,139,250";
  return (
    <div style={{ background: `rgba(${rgb},0.05)`, border: `1px solid rgba(${rgb},0.15)`, borderRadius: "10px", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color, marginBottom: "8px" }}>
        <Icon size={11} />{title}
      </div>
      <div style={{ fontSize: "12.5px", color: "#525252", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

// ── page export ───────────────────────────────────────────────────────────────
export default function HookGenPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#050505" }}>
        <Loader2 style={{ width: "32px", height: "32px", color: "#f59e0b", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <HookGenContent />
    </Suspense>
  );
}

// ── pure-JS ZIP builder removed (now handled on server) ─────────────────────────
// ── template file content generators removed (now handled on server) ───────────


// ── main content ──────────────────────────────────────────────────────────────
function HookGenContent() {
  const searchParams = useSearchParams();
  const contractAddress = searchParams.get("address") || "";
  const contractName    = searchParams.get("name") || "my_contract";
  const classHash       = searchParams.get("classHash") || "";
  const network         = (searchParams.get("network") as "sepolia" | "mainnet") || "sepolia";

  const [abiText, setAbiText] = useState(() =>
    contractName === "simple_storage" ? JSON.stringify(SIMPLE_STORAGE_ABI, null, 2) : ""
  );
  const [generatorNetwork, setGeneratorNetwork] = useState<"sepolia" | "mainnet">(network);
  const [abiError, setAbiError]     = useState<string | null>(null);
  const [result, setResult]         = useState<GenerateResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("summary");
  // editor panel state
  const [activeFile, setActiveFile] = useState(0);
  const [showAbiInput, setShowAbiInput] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { threshold: 0.2 }
    );
    SECTIONS.forEach(({ id }) => { const el = sectionRefs.current[id]; if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const validateAbi = useCallback((text: string): AbiEntry[] | null => {
    if (!text.trim()) { setAbiError("ABI is required."); return null; }
    try {
      const parsed = JSON.parse(text.trim());
      if (!Array.isArray(parsed)) { setAbiError("ABI must be a JSON array."); return null; }
      setAbiError(null);
      return parsed as AbiEntry[];
    } catch { setAbiError("Invalid JSON — paste the raw ABI array from compilation output."); return null; }
  }, []);

  const hooksPascal = toPascal(contractName);
  const templateFiles = useMemo(() => {
    return [
      { name: "package.json", path: "package.json", dir: "", content: "// Package details generated inside ZIP" },
      { name: "contract.ts", path: "lib/contract.ts", dir: "lib/", content: "// Contract constants generated inside ZIP" },
      { name: `use${hooksPascal}.ts`, path: `hooks/use${hooksPascal}.ts`, dir: "hooks/", content: "// Full hook generation inside ZIP", isHooks: true },
    ];
  }, [hooksPascal]);

  const handleGenerate = useCallback(async () => {
    const abi = validateAbi(abiText);
    if (!abi || !contractAddress.trim()) { if (!contractAddress.trim()) setGenError("Contract address is required."); return; }
    setLoading(true); setGenError(null);
    try {
      const res = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress: contractAddress.trim(), contractName: contractName.trim() || "MyContract", classHash, abi, network: generatorNetwork }),
      });
      if (!res.ok) {
        let msg = "Generation failed";
        try { const err = await res.json(); msg = err.error || msg; } catch {}
        throw new Error(msg);
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${contractName.replace(/_/g,"-")}-app.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (e) { setGenError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [abiText, contractAddress, contractName, classHash, generatorNetwork, validateAbi]);

  const handleDownloadZip = handleGenerate;

  const scrollTo = (id: string) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const hookPrefix  = `use${toPascal(contractName)}`;
  const shortAddr   = contractAddress ? `${contractAddress.slice(0, 10)}…${contractAddress.slice(-6)}` : "—";
  const explorerUrl = network === "mainnet"
    ? `https://starkscan.co/contract/${contractAddress}`
    : `https://sepolia.voyager.online/contract/${contractAddress}`;

  return (
    <>
      <style>{`
        .hg-root { font-family: var(--font-syne), system-ui, sans-serif; }
        .hg-mono { font-family: var(--font-jb-mono), ui-monospace, monospace; }
        .tok-kw  { color: #f59e0b; }
        .tok-str { color: #34d399; }
        .tok-com { color: #404040; font-style: italic; }
        .tok-type{ color: #38bdf8; }
        .hg-code-row:hover td { background: rgba(255,255,255,0.015); }
        /* shiki overrides */
        .hg-shiki-viewer { background: #0d1117; }
        .hg-shiki-viewer pre { margin: 0; padding: 14px 0; background: transparent !important; overflow: auto; }
        .hg-shiki-viewer code { counter-reset: line; }
        .hg-shiki-viewer .line { display: block; padding: 0 20px 0 0; line-height: 1.7; font-size: 11.5px; }
        .hg-shiki-viewer .line::before { counter-increment: line; content: counter(line); display: inline-block; width: 40px; text-align: right; padding-right: 16px; color: #3d444d; user-select: none; font-size: 11px; }
        .hg-shiki-snippet { background: #0d1117; }
        .hg-shiki-snippet pre { margin: 0; padding: 10px 14px; background: transparent !important; overflow: auto; }
        .hg-shiki-snippet code { font-family: var(--font-jb-mono), ui-monospace, monospace; font-size: 10.5px; line-height: 1.65; }
        .hg-shiki-snippet .line { display: block; }
        .hg-input { width: 100%; padding: 10px 14px; background: #080808; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; color: #d4d4d4; font-family: var(--font-jb-mono), ui-monospace, monospace; font-size: 12px; outline: none; transition: border-color 0.15s; }
        .hg-input::placeholder { color: #2a2a2a; }
        .hg-input:focus { border-color: rgba(245,158,11,0.4); box-shadow: 0 0 0 3px rgba(245,158,11,0.06); }
        .hg-input.error { border-color: rgba(239,68,68,0.4); }
        .hg-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #525252; margin-bottom: 8px; }
        .hg-nav-btn { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; color: #404040; cursor: pointer; transition: all 0.15s; border-left: 2px solid transparent; width: 100%; background: none; border-top: none; border-right: none; border-bottom: none; text-align: left; font-family: var(--font-syne), system-ui, sans-serif; margin-bottom: 2px; }
        .hg-nav-btn:hover { color: #737373; background: rgba(255,255,255,0.02); }
        .hg-nav-btn.active { color: #f59e0b; border-left-color: #f59e0b; background: rgba(245,158,11,0.04); }
        .hg-glow-btn { position: relative; overflow: hidden; background: #f59e0b; color: #000; border: none; border-radius: 8px; padding: 12px 28px; font-family: var(--font-syne), system-ui, sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .hg-glow-btn:hover { background: #fbbf24; box-shadow: 0 0 32px rgba(245,158,11,0.35); }
        .hg-glow-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
        .hg-pill-read  { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: #34d399; font-size: 11px; }
        .hg-pill-write { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b; font-size: 11px; }
        .hg-step-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .hg-bg { background-color: #040404; background-image: linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px); background-size: 40px 40px; }
        .hg-divider { border: none; border-top: 1px solid rgba(255,255,255,0.04); margin: 48px 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { box-shadow: 0 0 6px rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 14px rgba(16,185,129,0.75); } }
        .live-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      <div className={`hg-root flex hg-bg ${syne.variable} ${jetbrainsMono.variable}`} style={{ minHeight: "100vh", height: "100%" }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside style={{ width: "268px", flexShrink: 0, background: "#060606", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>

          <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <Link href="/studio/contract-lab" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#404040", textDecoration: "none", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#737373")} onMouseLeave={e => (e.currentTarget.style.color = "#404040")}>
              <ArrowLeft size={12} />Contract Lab
            </Link>
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <div className="live-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#10b981" }}>Deployed</span>
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#e5e5e5", lineHeight: 1.2, marginBottom: "8px" }}>{contractName}</div>
              <div className="hg-mono" style={{ fontSize: "9px", color: "#2a2a2a", wordBreak: "break-all", lineHeight: 1.5 }}>{contractAddress || "—"}</div>
            </div>
          </div>

          <nav style={{ padding: "16px 8px", flex: 1 }}>
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", padding: "0 12px", marginBottom: "8px" }}>Menu</div>
            {SECTIONS.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => scrollTo(id)} className={`hg-nav-btn ${activeSection === id ? "active" : ""}`}>
                <Icon size={12} style={{ opacity: 0.5, flexShrink: 0 }} />{label}
              </button>
            ))}
            <div style={{ margin: "16px 0 8px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "16px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", padding: "0 12px", marginBottom: "8px" }}>External</div>
              {contractAddress && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="hg-nav-btn" style={{ display: "flex", textDecoration: "none" }}>
                  <Globe size={12} style={{ opacity: 0.5, flexShrink: 0 }} />View on Explorer
                </a>
              )}
            </div>
          </nav>

          <div style={{ padding: "12px 12px 20px" }}>
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#404040", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Package size={10} />Install
              </div>
              <InstallLine pkg="starknet" version="^7.0" />
              <InstallLine pkg="starkzap" version="^2.0" />
            </div>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* breadcrumb */}
          <div style={{ padding: "16px 40px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px", position: "sticky", top: 0, background: "rgba(4,4,4,0.88)", backdropFilter: "blur(12px)", zIndex: 10 }}>
            <span style={{ fontSize: "11px", color: "#2a2a2a" }}>Studio</span>
            <ChevronRight size={10} style={{ color: "#2a2a2a" }} />
            <Link href="/studio/contract-lab" style={{ fontSize: "11px", color: "#2a2a2a", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#525252")} onMouseLeave={e => (e.currentTarget.style.color = "#2a2a2a")}>
              Contract Lab
            </Link>
            <ChevronRight size={10} style={{ color: "#2a2a2a" }} />
            <span className="hg-mono" style={{ fontSize: "11px", color: "#525252" }}>{contractName}</span>
            <ChevronRight size={10} style={{ color: "#2a2a2a" }} />
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Integration Workspace</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="live-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#10b981" }}>
                {network === "mainnet" ? "Mainnet" : "Sepolia"}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", minHeight: "calc(100vh - 53px)" }}>

            {/* ── WORKSPACE COLUMN ─────────────────────────────────────────────── */}
            <div className="p-8 border-r border-white/5 bg-[#050505] flex flex-col gap-6">

              <motion.section id="workspace" ref={el => { sectionRefs.current["workspace"] = el; }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.3 }}
                className="flex flex-col gap-6">

                {/* merged header + info */}
                <div className="flex flex-col gap-5 border-b border-white/5 pb-6">
                  {/* header row */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <h1 className="hg-mono text-[13px] font-bold text-neutral-200 m-0 leading-none">{contractName}</h1>
                    <span className="text-neutral-600 text-[10px]">•</span>
                    <span className="hg-mono text-[10px] text-neutral-400 lowercase">{network}</span>
                    <span className="text-neutral-600 text-[10px]">•</span>
                    <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-500">Live</span>
                  </div>

                  {/* flat detail rows */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center text-xs">
                      <span className="text-neutral-500 w-24 shrink-0 font-medium">Name</span>
                      <span className="hg-mono text-neutral-300">{contractName}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-neutral-500 w-24 shrink-0 font-medium">Address</span>
                      <div className="flex items-center gap-2">
                        <span className="hg-mono text-neutral-400">{contractAddress || "—"}</span>
                        {contractAddress && <InlineCopy text={contractAddress} />}
                      </div>
                    </div>
                    {classHash && (
                      <div className="flex items-center text-xs">
                        <span className="text-neutral-500 w-24 shrink-0 font-medium">Class Hash</span>
                        <div className="flex items-center gap-2">
                          <span className="hg-mono text-neutral-400">{classHash}</span>
                          <InlineCopy text={classHash} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center text-xs">
                      <span className="text-neutral-500 w-24 shrink-0 font-medium">Network</span>
                      <span className="hg-mono text-neutral-400">{network === "mainnet" ? "Mainnet" : "Sepolia"}</span>
                    </div>
                  </div>
                </div>

                {/* compact timeline */}
                <div>
                  <div className="text-[9px] font-bold tracking-widest uppercase text-neutral-500 mb-3 flex items-center gap-1.5">
                    <Activity size={10} />Activity Stream
                  </div>
                  <div className="flex flex-col">
                    <DeployStageRow label="Sierra Compiled" detail="Cairo source → Sierra IR" />
                    <DeployStageRow label="Class Declared" detail="Registered on-chain with classHash" />
                    <DeployStageRow label="ABI Extracted" detail="Function signatures parsed" />
                    <DeployStageRow label="Contract Deployed" detail={`Live instance at ${shortAddr}`} last />
                  </div>
                </div>

              </motion.section>

            </div>{/* end workspace column */}

            {/* ── STARTER TEMPLATE IDE PANEL ──────────────────────────────── */}
            <div style={{ position: "sticky", top: "53px", height: "calc(100vh - 53px)", display: "flex", flexDirection: "column", background: "#0A0A0A", borderLeft: "1px solid #222" }}>

              {/* ─── Panel header ─────────────────────────────────────────── */}
              <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #222", background: "#111", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "6px" }}>
                      <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Package size={11} style={{ color: "#f59e0b" }} />
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#e6edf3" }}>{contractName.replace(/_/g,"-")}-app</span>
                      <div style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: "999px", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.15)" }}>
                        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#38bdf8" }}>NEXT.JS 15</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: "#484f58" }}>
                      {templateFiles.length} files · starknet · starkzap
                      {result && <span style={{ color: "#3fb950", marginLeft: "8px" }}>· hooks generated ✓</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center" }}>
                    {!result && (
                      <span style={{ fontSize: "10px", color: "#3d444d", fontFamily: "var(--font-syne), system-ui, sans-serif" }}>
                        Generate first
                      </span>
                    )}
                    <button
                      onClick={result ? handleDownloadZip : undefined}
                      disabled={!result}
                      title={result ? "Download project ZIP" : "Click Generate ⚡ first"}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 11px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: result ? "pointer" : "not-allowed", fontFamily: "var(--font-syne), system-ui, sans-serif", background: result ? "#f59e0b" : "#1c1c1c", color: result ? "#000" : "#3d444d", border: result ? "none" : "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s", opacity: result ? 1 : 0.5 }}
                      onMouseEnter={e => { if (result) { (e.currentTarget as HTMLButtonElement).style.background = "#fbbf24"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(245,158,11,0.3)"; } }}
                      onMouseLeave={e => { if (result) { (e.currentTarget as HTMLButtonElement).style.background = "#f59e0b"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; } }}>
                      <Download size={11} />ZIP
                    </button>
                    <a href="https://stackblitz.com/fork/nextjs" target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 11px", borderRadius: "6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-syne), system-ui, sans-serif", background: "#0d1117", color: "#8b949e", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLAnchorElement).style.color = "#e6edf3"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLAnchorElement).style.color = "#8b949e"; }}>
                      <Zap size={11} />StackBlitz
                    </a>
                  </div>
                </div>
              </div>

              {/* ─── File tabs (VS Code style) ─────────────────────────────── */}
              <div style={{ display: "flex", overflowX: "auto", background: "#0A0A0A", borderBottom: "1px solid #222", flexShrink: 0, scrollbarWidth: "none" }}>
                {templateFiles.map((f, i) => {
                  const isActive = activeFile === i;
                  const ext = f.name.split(".").pop() ?? "ts";
                  const extColor = ext === "json" ? "#febc2e" : ext === "tsx" ? "#38bdf8" : "#f59e0b";
                  return (
                    <button key={i} onClick={() => setActiveFile(i)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", flexShrink: 0, cursor: "pointer", background: isActive ? "#111" : "transparent", color: isActive ? "#e6edf3" : "#6e7681", border: "none", borderBottom: isActive ? "1px solid #f59e0b" : "1px solid transparent", fontFamily: "var(--font-jb-mono), ui-monospace, monospace", fontSize: "11px", fontWeight: isActive ? 600 : 400, transition: "all 0.1s", position: "relative", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, color: extColor, opacity: isActive ? 1 : 0.5, background: `${extColor}18`, padding: "1px 4px", borderRadius: "3px", letterSpacing: "0.04em" }}>
                        {ext.toUpperCase()}
                      </span>
                      <span>{f.name}</span>
                      {f.isHooks && (
                        <span style={{ fontSize: "9px", color: "#f59e0b", marginLeft: "2px" }}>○</span>
                      )}
                    </button> 
                  );
                })}
              </div>

              {/* ─── File path bar ─────────────────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 14px", background: "#111", borderBottom: "1px solid #222", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {templateFiles[activeFile].dir && (
                    <>
                      <span className="hg-mono" style={{ fontSize: "10px", color: "#484f58" }}>{templateFiles[activeFile].dir}</span>
                    </>
                  )}
                  <span className="hg-mono" style={{ fontSize: "10px", color: "#6e7681" }}>{templateFiles[activeFile].name}</span>
                </div>
                <InlineCopy text={templateFiles[activeFile].content} />
              </div>

              {/* ─── Code editor area ──────────────────────────────────────── */}
              <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
                <EditorPane
                  code={templateFiles[activeFile].content}
                  filename={templateFiles[activeFile].name}
                  isHooksPlaceholder={!!(templateFiles[activeFile].isHooks)}
                  showAbiInput={showAbiInput}
                  onRequestGenerate={() => setShowAbiInput(s => !s)}
                />
                {/* ABI input overlay (only when hooks tab + not generated) */}
                {templateFiles[activeFile].isHooks && showAbiInput && (
                  <motion.div key="abi-gen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#161b22", borderTop: "1px solid rgba(245,158,11,0.2)", padding: "16px", zIndex: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Sparkles size={11} />Paste ABI to generate
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {(["sepolia", "mainnet"] as const).map(n => (
                          <button key={n} onClick={() => setGeneratorNetwork(n)} style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-syne), system-ui, sans-serif", background: generatorNetwork === n ? (n === "mainnet" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.1)") : "transparent", border: `1px solid ${generatorNetwork === n ? (n === "mainnet" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.25)") : "rgba(255,255,255,0.08)"}`, color: generatorNetwork === n ? (n === "mainnet" ? "#f59e0b" : "#10b981") : "#484f58", transition: "all 0.1s" }}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => { setShowAbiInput(false); setAbiError(null); }} style={{ color: "#484f58", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#8b949e")} onMouseLeave={e => (e.currentTarget.style.color = "#484f58")}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <div style={{ position: "relative", marginBottom: "10px" }}>
                      <textarea className={`hg-input ${abiError ? "error" : ""}`} rows={5} value={abiText} spellCheck={false}
                        style={{ resize: "none", lineHeight: "1.6", fontSize: "11px" }}
                        placeholder={`[\n  { "type": "function", "name": "get", ... }\n]`}
                        onChange={e => { setAbiText(e.target.value); if (abiError) validateAbi(e.target.value); }} />
                      {!abiText && (
                        <button onClick={() => { setAbiText(JSON.stringify(SIMPLE_STORAGE_ABI, null, 2)); setAbiError(null); }}
                          style={{ position: "absolute", bottom: "10px", right: "10px", fontSize: "9px", fontWeight: 700, color: "#484f58", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", padding: "3px 7px", cursor: "pointer", fontFamily: "var(--font-syne), system-ui, sans-serif", transition: "all 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f59e0b")} onMouseLeave={e => (e.currentTarget.style.color = "#484f58")}>
                          use simple_storage ABI
                        </button>
                      )}
                    </div>
                    {abiError && <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px", fontSize: "11px", color: "#ef4444" }}><AlertCircle size={10} />{abiError}</div>}
                    {genError && <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px", fontSize: "11px", color: "#ef4444" }}><AlertCircle size={10} />{genError}</div>}
                    <button className="hg-glow-btn" onClick={handleGenerate} disabled={loading || !contractAddress.trim() || !abiText.trim()} style={{ width: "100%", justifyContent: "center", padding: "10px" }}>
                      {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={12} />}
                      {loading ? "Generating…" : "Generate Hooks File ⚡"}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* ─── Install command bar ───────────────────────────────────── */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #222", background: "#111", flexShrink: 0 }}>
                <InstallBar />
              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ── shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, title }: { icon: LucideIcon; label: string; title: string }) {
  const num = label.replace("Section ", "");
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "28px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", flexShrink: 0, marginTop: "2px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(245,158,11,0.06)" }}>
          <Icon size={15} style={{ color: "#f59e0b" }} />
        </div>
        <span className="hg-mono" style={{ fontSize: "8px", fontWeight: 700, color: "rgba(245,158,11,0.35)", letterSpacing: "0.04em" }}>{num}</span>
      </div>
      <div>
        <h2 style={{ fontSize: "23px", fontWeight: 800, color: "#d4d4d4", margin: 0, lineHeight: 1.2 }}>{title}</h2>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, mono = false, copyable = false }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span style={{ fontSize: "11px", color: "#404040", flexShrink: 0, paddingTop: "1px" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        <span className={mono ? "hg-mono" : ""} style={{ fontSize: "11px", color: "#737373", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px", direction: "ltr" }}>
          {value}
        </span>
        {copyable && (
          <button onClick={copy} style={{ color: copied ? "#10b981" : "#2a2a2a", background: "none", border: "none", cursor: "pointer", flexShrink: 0, transition: "color 0.15s", padding: 0 }}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}

function DeployStageRow({ label, detail, last = false }: { label: string; detail: string; last?: boolean }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center shrink-0 mt-[2px]">
        <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Check size={8} className="text-emerald-500" />
        </div>
        {!last && <div className="w-px h-3.5 bg-emerald-500/20 my-0.5" />}
      </div>
      <div className={last ? "" : "pb-2"}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <div className="text-[11.5px] font-bold text-neutral-300 leading-none">{label}</div>
          <div className="text-[10px] text-neutral-500 leading-none">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function RpcRow({ label, url, active }: { label: string; url: string; active: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: active ? "rgba(16,185,129,0.04)" : "#060606", border: `1px solid ${active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)"}` }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: active ? "#10b981" : "#2a2a2a", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: active ? "#525252" : "#404040", marginBottom: "2px" }}>{label}</div>
        <div className="hg-mono" style={{ fontSize: "10px", color: "#2a2a2a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
      </div>
      <button onClick={copy} style={{ color: copied ? "#10b981" : "#2a2a2a", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", flexShrink: 0 }}>
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </div>
  );
}

function PipelineStep({ num, label, desc, color, last = false }: { num: string; label: string; desc: string; color: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `rgba(${color === "#f59e0b" ? "245,158,11" : color === "#a78bfa" ? "167,139,250" : "56,189,248"},0.1)`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="hg-mono" style={{ fontSize: "9px", fontWeight: 700, color }}>{num}</span>
        </div>
        {!last && <div style={{ width: "1px", height: "24px", background: `linear-gradient(to bottom, ${color}25, transparent)`, marginTop: "3px" }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : "4px", marginTop: "2px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#8b949e", marginBottom: "3px" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "#484f58", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function NoteCard({ icon: Icon, color, title, children }: { icon: LucideIcon; color: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: "0 10px 10px 0", background: "#060606", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, color, marginBottom: "8px" }}>
        <Icon size={12} />{title}
      </div>
      <div style={{ fontSize: "12px", color: "#525252", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function InstallLine({ pkg, version }: { pkg: string; version: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
      <span className="hg-mono" style={{ fontSize: "11px", color: "#525252" }}>{pkg}</span>
      <span className="hg-mono" style={{ fontSize: "10px", color: "#2a2a2a" }}>{version}</span>
    </div>
  );
}

function InfoCard({ icon: Icon, color, label, desc }: { icon: LucideIcon; color: string; label: string; desc: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "8px", background: "#070707", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 700, color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px" }}>
        <Icon size={10} />{label}
      </div>
      <p style={{ fontSize: "10.5px", color: "#404040", lineHeight: 1.5, margin: 0 }}>{desc}</p>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, accent = false, primary = false }: { icon: LucideIcon; label: string; onClick: () => void; accent?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "6px",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
      fontFamily: "var(--font-syne), system-ui, sans-serif", transition: "all 0.15s",
      background: primary ? "#f59e0b" : "#0a0a0a",
      color: primary ? "#000" : accent ? "#10b981" : "#525252",
      border: `1px solid ${primary ? "#f59e0b" : "rgba(255,255,255,0.07)"}`,
    }}
      onMouseEnter={e => { if (!primary) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
      onMouseLeave={e => { if (!primary) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)"; }}>
      <Icon size={11} />{label}
    </button>
  );
}

function toPascal(s: string): string {
  return s.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());
}

// ── EditorPane ────────────────────────────────────────────────────────────────
function EditorPane({
  code, filename, isHooksPlaceholder, showAbiInput, onRequestGenerate,
}: {
  code: string;
  filename: string;
  isHooksPlaceholder: boolean;
  showAbiInput: boolean;
  onRequestGenerate: () => void;
}) {
  const shikiHtml = useShiki(code, filename);

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
      {/* code view */}
      {shikiHtml ? (
        <div
          className="hg-shiki-viewer"
          style={{ overflow: "auto", height: "100%", paddingBottom: isHooksPlaceholder && !showAbiInput ? "80px" : "0" }}
          dangerouslySetInnerHTML={{ __html: shikiHtml }}
        />
      ) : (
        <div style={{ overflow: "auto", height: "100%", background: "#0d1117", padding: "12px 0", paddingBottom: isHooksPlaceholder && !showAbiInput ? "80px" : "0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {code.split("\n").map((line, i) => (
                <tr key={i} className="hg-code-row">
                  <td className="hg-mono" style={{ color: "#3d444d", userSelect: "none", textAlign: "right", padding: "0 16px", fontSize: "11px", width: "40px", verticalAlign: "top" }}>{i + 1}</td>
                  <td className="hg-mono" style={{ color: "#c9d1d9", fontSize: "11.5px", lineHeight: "1.7", padding: "0 20px 0 0", verticalAlign: "top", whiteSpace: "pre" }}>{line || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* "Generate Hooks" CTA — shown only when placeholder is displayed and overlay is closed */}
      {isHooksPlaceholder && !showAbiInput && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px", background: "linear-gradient(to top, #0d1117 60%, transparent)", display: "flex", justifyContent: "center" }}>
          <button
            onClick={onRequestGenerate}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 20px", borderRadius: "7px", background: "#f59e0b", color: "#000", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-syne), system-ui, sans-serif", transition: "all 0.15s", boxShadow: "0 0 24px rgba(245,158,11,0.25)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fbbf24"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 36px rgba(245,158,11,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f59e0b"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(245,158,11,0.25)"; }}>
            <Sparkles size={11} />Generate Hooks ⚡
          </button>
        </div>
      )}
    </div>
  );
}

// ── InlineCopy ────────────────────────────────────────────────────────────────
function InlineCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      title="Copy file contents"
      style={{ display: "flex", alignItems: "center", gap: "4px", color: copied ? "#3fb950" : "#484f58", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", padding: "2px 4px", borderRadius: "4px" }}
      onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#8b949e"; }}
      onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#484f58"; }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span className="hg-mono" style={{ fontSize: "9px", letterSpacing: "0.06em" }}>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ── InstallBar ────────────────────────────────────────────────────────────────
function InstallBar() {
  const cmd = "npm install starknet starkzap";
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 12px", borderRadius: "7px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="hg-mono" style={{ fontSize: "9px", color: "#484f58", flexShrink: 0 }}>$</span>
      <span className="hg-mono" style={{ fontSize: "10.5px", color: "#8b949e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd}</span>
      <button
        onClick={copy}
        style={{ display: "flex", alignItems: "center", gap: "4px", color: copied ? "#3fb950" : "#484f58", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", flexShrink: 0, padding: 0 }}
        onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#8b949e"; }}
        onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "#484f58"; }}>
        {copied ? <Check size={10} /> : <Copy size={10} />}
      </button>
    </div>
  );
}
