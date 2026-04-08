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
  Shield, Server, type LucideIcon,
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
  { id: "summary",       icon: CheckCircle2, label: "Contract Summary"     },
  { id: "what-happened", icon: BookOpen,     label: "What Just Happened"   },
  { id: "interact",      icon: Eye,          label: "Interacting"           },
  { id: "starter",       icon: Package,      label: "Next.js Template"     },
  { id: "code",          icon: Code2,        label: "Code Blocks"           },
  { id: "notes",         icon: Shield,       label: "Dev Notes"             },
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

// ── pure-JS ZIP builder (STORE, no compression) ───────────────────────────────
function _crc32(data: Uint8Array): number {
  const t = Array.from({ length: 256 }, (_, i) => {
    let c = i; for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
  });
  let v = 0xFFFFFFFF;
  for (const b of data) v = (v >>> 8) ^ t[(v ^ b) & 0xFF];
  return (v ^ 0xFFFFFFFF) >>> 0;
}
function buildZip(entries: { path: string; content: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const locs: Uint8Array[] = [], cds: Uint8Array[] = [];
  let off = 0;
  const now = new Date();
  const dt = (((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate())>>>0;
  const tm = ((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1))>>>0;
  for (const e of entries) {
    const d = enc.encode(e.content), n = enc.encode(e.path), crc = _crc32(d);
    const loc = new Uint8Array(30+n.length+d.length); const lv = new DataView(loc.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,0,true); lv.setUint16(8,0,true);
    lv.setUint16(10,tm,true); lv.setUint16(12,dt,true); lv.setUint32(14,crc,true);
    lv.setUint32(18,d.length,true); lv.setUint32(22,d.length,true); lv.setUint16(26,n.length,true); lv.setUint16(28,0,true);
    loc.set(n,30); loc.set(d,30+n.length); locs.push(loc);
    const cd = new Uint8Array(46+n.length); const cv = new DataView(cd.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,0,true); cv.setUint16(10,0,true);
    cv.setUint16(12,tm,true); cv.setUint16(14,dt,true); cv.setUint32(16,crc,true);
    cv.setUint32(20,d.length,true); cv.setUint32(24,d.length,true); cv.setUint16(28,n.length,true);
    cv.setUint16(30,0,true); cv.setUint16(32,0,true); cv.setUint16(34,0,true); cv.setUint16(36,0,true);
    cv.setUint32(38,0,true); cv.setUint32(42,off,true); cd.set(n,46); cds.push(cd);
    off += loc.length;
  }
  const cdSz = cds.reduce((s,b)=>s+b.length,0);
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true);
  ev.setUint16(8,entries.length,true); ev.setUint16(10,entries.length,true);
  ev.setUint32(12,cdSz,true); ev.setUint32(16,off,true); ev.setUint16(20,0,true);
  const all = [...locs,...cds,eocd];
  const out = new Uint8Array(all.reduce((s,b)=>s+b.length,0)); let p=0;
  for (const b of all) { out.set(b,p); p+=b.length; } return out;
}

// ── template file content generators ─────────────────────────────────────────
function makePackageJson(name: string) {
  return `{
  "name": "${name.replace(/_/g,"-")}-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "starknet": "^7.0.0",
    "starkzap": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}`;
}
function makeContractTs(addr: string, net: string) {
  const rpc = net === "mainnet"
    ? "https://free-rpc.nethermind.io/mainnet-juno/v0_8"
    : "https://free-rpc.nethermind.io/sepolia-juno/v0_8";
  return `// Contract constants — generated by Unzap Contract Lab
export const CONTRACT_ADDRESS =
  "${addr || "0x..."}" as const;

export const NETWORK = "${net}" as const;

export const RPC_URL = "${rpc}";
`;
}
function makeLayoutTsx(pascal: string) {
  return `import { StarkzapProvider } from "@/hooks/use${pascal}";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* All write hooks share this wallet instance */}
        <StarkzapProvider>{children}</StarkzapProvider>
      </body>
    </html>
  );
}
`;
}
function makePageTsx(name: string, pascal: string) {
  return `"use client";
import { useState } from "react";
import {
  use${pascal}Get,
  use${pascal}Set,
  useStarkzap,
} from "@/hooks/use${pascal}";

export default function Home() {
  const { connectWallet, address } = useStarkzap();
  const { data, loading, refetch } = use${pascal}Get();
  const { execute, status, txHash } = use${pascal}Set();
  const [input, setInput] = useState("");

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-8">${name} demo</h1>

      <section className="mb-8">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Stored Value</p>
        <p className="text-4xl font-mono">
          {loading ? "…" : data?.toString() ?? "—"}
        </p>
        <button onClick={refetch} className="mt-2 text-xs text-gray-500 underline">
          Refresh
        </button>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Update Value</p>
        {!address ? (
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="New value (felt252)"
              className="flex-1 px-3 py-2 border border-gray-800 rounded-lg font-mono text-sm bg-gray-900 text-gray-100"
            />
            <button
              onClick={() => execute(input)}
              disabled={status === "pending" || !input}
              className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg disabled:opacity-50"
            >
              {status === "pending" ? "…" : "Set ⚡"}
            </button>
          </div>
        )}
        {txHash && (
          <p className="mt-2 text-sm text-emerald-400 font-mono">
            ✓ {txHash.slice(0, 20)}…
          </p>
        )}
      </section>
    </main>
  );
}
`;
}
function makeHooksPlaceholder(name: string, pascal: string) {
  return `// Generated by Unzap Contract Lab — https://unzap.dev
//
// Paste your contract ABI and click "Generate Hooks ⚡" below
// to fill this file with fully-typed React hooks.
//
// This file will export:
//
//   StarkzapProvider        — wrap your app root with this
//   useStarkzap()           — access wallet & connect
//
//   use${pascal}Get()  — read the stored felt252 value
//     returns: { data, loading, error, refetch }
//
//   use${pascal}Set()  — write a new value (gasless ⚡)
//     returns: { execute, status, txHash, error, reset }
//
// ─────────────────────────────────────────────────────
// Setup after generation:
//
//   1. npm install starknet starkzap
//   2. cp use${pascal}.ts src/hooks/
//   3. Wrap layout: <StarkzapProvider> ... </StarkzapProvider>
//   4. Import hooks anywhere in your app
// ─────────────────────────────────────────────────────
`;
}

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
    const f = result?.files;
    return [
      { name: "package.json",       path: "package.json",                  dir: "",             content: f?.["package.json"]                   ?? makePackageJson(contractName) },
      { name: "contract.ts",        path: "lib/contract.ts",               dir: "lib/",         content: f?.["lib/contract.ts"]                ?? makeContractTs(contractAddress, generatorNetwork) },
      { name: "globals.css",        path: "app/globals.css",               dir: "app/",         content: f?.["app/globals.css"]                ?? "" },
      { name: "layout.tsx",         path: "app/layout.tsx",                dir: "app/",         content: f?.["app/layout.tsx"]                 ?? makeLayoutTsx(hooksPascal) },
      { name: "page.tsx",           path: "app/page.tsx",                  dir: "app/",         content: f?.["app/page.tsx"]                   ?? makePageTsx(contractName, hooksPascal) },
      { name: "LogsPanel.tsx",      path: "components/LogsPanel.tsx",      dir: "components/",  content: f?.["components/LogsPanel.tsx"]       ?? "", generated: !!result },
      { name: "ContractUI.tsx",     path: "components/ContractUI.tsx",     dir: "components/",  content: f?.["components/ContractUI.tsx"]      ?? "", generated: !!result },
      { name: `use${hooksPascal}.ts`, path: `hooks/use${hooksPascal}.ts`,  dir: "hooks/",       content: f?.[`hooks/use${hooksPascal}.ts`]     ?? makeHooksPlaceholder(contractName, hooksPascal), isHooks: true, generated: !!result },
    ].filter(entry => entry.content.length > 0);
  }, [contractName, contractAddress, generatorNetwork, hooksPascal, result]);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setResult(data as GenerateResult);
      // Jump to the hooks tab — find it dynamically since filter() can shift indices
      const hooksIdx = templateFiles.findLastIndex((f) => (f as { isHooks?: boolean }).isHooks);
      setActiveFile(hooksIdx >= 0 ? hooksIdx : templateFiles.length - 1);
      setShowAbiInput(false);
    } catch (e) { setGenError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [abiText, contractAddress, contractName, classHash, generatorNetwork, validateAbi]);

  const handleDownloadZip = useCallback(() => {
    const entries = templateFiles.map(f => ({ path: f.path, content: f.content }));
    const zip  = buildZip(entries);
    const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${contractName.replace(/_/g,"-")}-app.zip`; a.click();
    URL.revokeObjectURL(url);
  }, [templateFiles, contractName]);

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
            <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a2a2a", padding: "0 12px", marginBottom: "8px" }}>Guide</div>
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
            <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Integration Guide</span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="live-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#10b981" }}>
                {network === "mainnet" ? "Mainnet" : "Sepolia"}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", minHeight: "calc(100vh - 53px)" }}>

            {/* ── DOCS COLUMN ─────────────────────────────────────────────── */}
            <div style={{ padding: "48px 40px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>

              {/* hero */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: "60px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 12px", borderRadius: "999px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: "20px" }}>
                  <CheckCircle2 size={11} style={{ color: "#10b981" }} />
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#10b981" }}>Deployment Successful</span>
                </div>
                <h1 style={{ fontSize: "42px", fontWeight: 800, lineHeight: 1.05, color: "#e5e5e5", marginBottom: "16px", margin: "0 0 16px" }}>
                  Your contract<br />
                  <span style={{ color: "#f59e0b" }}>is live.</span> Now what?
                </h1>
                <p style={{ fontSize: "14px", color: "#525252", lineHeight: 1.7, maxWidth: "520px", margin: 0 }}>
                  <span className="hg-mono" style={{ color: "#737373" }}>{contractName}</span> is deployed on Starknet {network === "mainnet" ? "Mainnet" : "Sepolia"}. This guide walks you through what just happened, how to interact with it, and how to wire it into a production Next.js app — from zero to working UI.
                </p>
              </motion.div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* § 1  CONTRACT SUMMARY                                     */}
              {/* ══════════════════════════════════════════════════════════ */}
              <motion.section id="summary" ref={el => { sectionRefs.current["summary"] = el; }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}
                style={{ marginBottom: "56px", scrollMarginTop: "80px" }}>

                <SectionHeader icon={CheckCircle2} label="Section 01" title="Contract Summary" />

                {/* deployment receipt card */}
                <div style={{ background: "#060606", border: "1px solid rgba(16,185,129,0.12)", borderRadius: "14px", padding: "24px", marginBottom: "16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: "220px", height: "220px", background: "radial-gradient(circle at 100% 0%, rgba(16,185,129,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#d4d4d4" }}>Deployment Receipt</div>
                      <div style={{ fontSize: "11px", color: "#404040", marginTop: "2px" }}>Starknet {network === "mainnet" ? "Mainnet" : "Sepolia Testnet"}</div>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "999px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <div className="live-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#10b981" }}>Live</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <ReceiptRow label="Contract Name"    value={contractName} />
                    <ReceiptRow label="Contract Address" value={contractAddress || "—"} mono copyable />
                    <ReceiptRow label="Network"          value={network === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia"} />
                    {classHash && <ReceiptRow label="Class Hash" value={classHash} mono copyable />}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "20px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#404040", marginBottom: "14px" }}>Deployment Stages</div>
                    <DeployStageRow label="Sierra Compiled"  detail="Cairo source compiled to Sierra IR (Safe Intermediate Representation)" />
                    <DeployStageRow label="Class Declared"   detail="Sierra class registered on-chain — assigned a unique classHash" />
                    <DeployStageRow label="ABI Extracted"    detail="Function signatures parsed and made available to frontends" />
                    <DeployStageRow label="Contract Deployed" detail={`Live instance created at ${shortAddr}`} last />
                  </div>
                </div>

                {contractAddress && (
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 600, color: "#404040", textDecoration: "none", padding: "8px 14px", borderRadius: "7px", background: "#060606", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.15s" }}
                    onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = "rgba(255,255,255,0.12)"; a.style.color = "#737373"; }}
                    onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = "rgba(255,255,255,0.06)"; a.style.color = "#404040"; }}>
                    <Globe size={11} />View on {network === "mainnet" ? "Starkscan" : "Voyager"}<ChevronRight size={10} />
                  </a>
                )}
              </motion.section>

              <hr className="hg-divider" />

              {/* ══════════════════════════════════════════════════════════ */}
              {/* § 2  WHAT JUST HAPPENED                                    */}
              {/* ══════════════════════════════════════════════════════════ */}
              <motion.section id="what-happened" ref={el => { sectionRefs.current["what-happened"] = el; }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.4 }}
                style={{ marginBottom: "56px", scrollMarginTop: "80px" }}>

                <SectionHeader icon={BookOpen} label="Section 02" title="What Just Happened" />

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                  {/* Declare vs Deploy */}
                  <div style={{ background: "#060606", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#f59e0b", marginBottom: "12px" }}>Declare vs. Deploy</div>
                    <p style={{ fontSize: "13px", color: "#525252", lineHeight: 1.7, marginBottom: "16px", margin: "0 0 16px" }}>
                      Starknet splits contract creation into <strong style={{ color: "#d4d4d4", fontWeight: 600 }}>two separate transactions</strong> — unlike EVM where a single <span className="hg-mono" style={{ fontSize: "12px", color: "#737373" }}>eth_sendTransaction</span> does both at once.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "center" }}>
                      <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#f59e0b", marginBottom: "8px" }}>① Declare</div>
                        <div style={{ fontSize: "11.5px", color: "#525252", lineHeight: 1.65 }}>Uploads the contract <em>class</em> (code) to Starknet. Returns a <span className="hg-mono" style={{ fontSize: "10.5px", color: "#a3a3a3", background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: "3px" }}>classHash</span>. Think: publishing a blueprint anyone can instantiate.</div>
                      </div>
                      <div style={{ textAlign: "center", fontSize: "11px", color: "#2a2a2a", fontWeight: 700 }}>→</div>
                      <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#10b981", marginBottom: "8px" }}>② Deploy</div>
                        <div style={{ fontSize: "11.5px", color: "#525252", lineHeight: 1.65 }}>Creates an <em>instance</em> from a declared class at a unique address. Initializes storage. This is the address users actually interact with.</div>
                      </div>
                    </div>
                    <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2a2a2a" }}>EVM Comparison · </span>
                      <span style={{ fontSize: "11.5px", color: "#404040" }}>One transaction on Ethereum does declare + deploy simultaneously. In Starknet, you always declare first (skipped if already declared), then deploy as a separate step.</span>
                    </div>
                  </div>

                  {/* ABI */}
                  <div style={{ background: "#060606", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#38bdf8", marginBottom: "12px" }}>What is the ABI?</div>
                    <p style={{ fontSize: "13px", color: "#525252", lineHeight: 1.7, margin: "0 0 12px" }}>
                      The <strong style={{ color: "#d4d4d4", fontWeight: 600 }}>Application Binary Interface</strong> is a JSON schema that describes your contract's public functions — names, input types, output types, and whether they read or mutate state.
                    </p>
                    <Snippet filename="simple_storage.abi.json" code={`[
  {
    "type": "function",
    "name": "get",
    "inputs": [],
    "outputs": [{ "type": "core::felt252" }],
    "state_mutability": "view"     // read-only — no gas, no wallet
  },
  {
    "type": "function",
    "name": "set",
    "inputs": [{ "name": "value", "type": "core::felt252" }],
    "outputs": [],
    "state_mutability": "external" // writes state — needs account + gas
  }
]`} />
                    <p style={{ fontSize: "12px", color: "#404040", lineHeight: 1.65, margin: "12px 0 0" }}>
                      The ABI is how <span className="hg-mono" style={{ color: "#737373" }}>starknet.js</span> encodes calldata correctly. Without it you'd manually serialize every argument. Unzap uses it to generate fully-typed React hooks automatically.
                    </p>
                  </div>

                  {/* Sierra pipeline */}
                  <div style={{ background: "#060606", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a78bfa", marginBottom: "14px" }}>Cairo → Sierra → CASM</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <PipelineStep num="1" label="Cairo Source" color="#f59e0b" desc="High-level, Rust-inspired language you write. Provable by design." />
                      <PipelineStep num="2" label="Sierra (Safe IR)" color="#a78bfa" desc="Intermediate representation declared on-chain. Guarantees every execution is provable — prevents stuck or unprovable transactions." />
                      <PipelineStep num="3" label="CASM (Cairo Assembly)" color="#38bdf8" desc="Low-level bytecode compiled by the sequencer from Sierra. Executed inside the Starknet VM and proved by the STARK prover." last />
                    </div>
                  </div>
                </div>
              </motion.section>

              <hr className="hg-divider" />

              {/* ══════════════════════════════════════════════════════════ */}
              {/* § 3  INTERACTING WITH YOUR CONTRACT                        */}
              {/* ══════════════════════════════════════════════════════════ */}
              <motion.section id="interact" ref={el => { sectionRefs.current["interact"] = el; }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}
                style={{ marginBottom: "56px", scrollMarginTop: "80px" }}>

                <SectionHeader icon={Eye} label="Section 03" title="Interacting with Your Contract" />

                {/* RPC endpoints */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#404040", marginBottom: "10px" }}>
                    <Server size={12} />RPC Endpoints
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <RpcRow label="Sepolia (Testnet)" url="https://free-rpc.nethermind.io/sepolia-juno/v0_8" active={network === "sepolia"} />
                    <RpcRow label="Mainnet"            url="https://free-rpc.nethermind.io/mainnet-juno/v0_8" active={network === "mainnet"} />
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "11px", color: "#2a2a2a", lineHeight: 1.6 }}>
                    Free tier has rate limits. For production use <span className="hg-mono" style={{ fontSize: "10.5px", color: "#404040" }}>Alchemy</span>, <span className="hg-mono" style={{ fontSize: "10.5px", color: "#404040" }}>Infura</span>, or <span className="hg-mono" style={{ fontSize: "10.5px", color: "#404040" }}>Blast</span>.
                  </div>
                </div>

                {/* read */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span className="hg-pill-read hg-mono"><Eye size={9} />Read (view)</span>
                    <span style={{ fontSize: "11.5px", color: "#404040" }}>No wallet. No gas. Instant.</span>
                  </div>
                  <Snippet filename="read-example.ts" code={`import { RpcProvider, Contract } from "starknet";

const CONTRACT_ADDRESS = "${contractAddress || "0x...your_address"}";
const RPC = "https://free-rpc.nethermind.io/sepolia-juno/v0_8";

const provider = new RpcProvider({ nodeUrl: RPC });
const contract  = new Contract(ABI, CONTRACT_ADDRESS, provider);

// view functions call directly — no transaction, no fee
const raw = await contract.get();
console.log("Stored value:", raw.toString()); // felt252 → BigInt → string`} />
                </div>

                {/* write */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span className="hg-pill-write hg-mono"><PenLine size={9} />Write (external)</span>
                    <span style={{ fontSize: "11.5px", color: "#404040" }}>Requires a connected account.</span>
                  </div>
                  <Snippet filename="write-example.ts" code={`import { RpcProvider, Account, Contract } from "starknet";

// 'account' = connected ArgentX / Braavos instance
// In a React app, obtain this from starknet-react or starkzap
const contract = new Contract(ABI, CONTRACT_ADDRESS, account);

// external functions broadcast a transaction and return a hash
const { transaction_hash } = await contract.set(42n);

// poll for inclusion
await provider.waitForTransaction(transaction_hash);
console.log("Value set! tx:", transaction_hash);`} />
                </div>

                <Callout icon={Zap} color="#f59e0b" title="Gasless via Starkzap + AVNU Paymaster">
                  Instead of requiring users to hold STRK for fees, the generated write hooks use{" "}
                  <span className="hg-mono" style={{ fontSize: "11px", color: "#a3a3a3" }}>{"{ feeMode: 'sponsored' }"}</span> via the Starkzap SDK.
                  Users need <strong>zero tokens</strong> to call your contract — the paymaster covers the fee.
                </Callout>
              </motion.section>

              <hr className="hg-divider" />

              {/* ══════════════════════════════════════════════════════════ */}
              {/* § 4  NEXT.JS STARTER TEMPLATE                              */}
              {/* ══════════════════════════════════════════════════════════ */}
              <motion.section id="starter" ref={el => { sectionRefs.current["starter"] = el; }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20, duration: 0.4 }}
                style={{ marginBottom: "56px", scrollMarginTop: "80px" }}>

                <SectionHeader icon={Package} label="Section 04" title="Ready-to-Use Next.js Template" />

                {/* folder structure */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#404040", marginBottom: "10px" }}>Project Structure</div>
                  <div className="hg-mono" style={{ background: "#060606", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "16px 18px", fontSize: "12px", lineHeight: 2.1, color: "#525252" }}>
                    <div><span style={{ color: "#f59e0b" }}>my-app/</span></div>
                    <div>&nbsp;&nbsp;├── <span style={{ color: "#525252" }}>app/</span></div>
                    <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├── <span style={{ color: "#737373" }}>layout.tsx</span><span style={{ color: "#2a2a2a" }}>&nbsp;&nbsp;&nbsp;← wrap with StarkzapProvider</span></div>
                    <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── <span style={{ color: "#737373" }}>page.tsx</span><span style={{ color: "#2a2a2a" }}>&nbsp;&nbsp;&nbsp;&nbsp;← demo UI</span></div>
                    <div>&nbsp;&nbsp;├── <span style={{ color: "#525252" }}>hooks/</span></div>
                    <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── <span style={{ color: "#10b981" }}>use{toPascal(contractName)}.ts</span><span style={{ color: "#2a2a2a" }}>&nbsp;← generated by Unzap ✓</span></div>
                    <div>&nbsp;&nbsp;├── <span style={{ color: "#525252" }}>lib/</span></div>
                    <div>&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── <span style={{ color: "#737373" }}>contract.ts</span><span style={{ color: "#2a2a2a" }}>&nbsp;&nbsp;&nbsp;← constants</span></div>
                    <div>&nbsp;&nbsp;└── <span style={{ color: "#f59e0b" }}>package.json</span></div>
                  </div>
                </div>

                {/* package.json */}
                <Snippet filename="package.json" code={`{
  "name": "${contractName.replace(/_/g, "-")}-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "starknet": "^7.0.0",
    "starkzap": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}`} />

                {/* lib/contract.ts */}
                <div style={{ marginTop: "14px" }}>
                  <Snippet filename="lib/contract.ts" code={`// Contract constants — generated by Unzap Contract Lab
export const CONTRACT_ADDRESS =
  "${contractAddress || "0x...your_address"}" as const;

export const NETWORK = "${network}" as const;

export const RPC_URL =
  NETWORK === "mainnet"
    ? "https://free-rpc.nethermind.io/mainnet-juno/v0_8"
    : "https://free-rpc.nethermind.io/sepolia-juno/v0_8";`} />
                </div>

                {/* layout.tsx */}
                <div style={{ marginTop: "14px" }}>
                  <Snippet filename="app/layout.tsx" code={`import { StarkzapProvider } from "@/hooks/use${toPascal(contractName)}";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* All write hooks share this wallet instance — wrap once */}
        <StarkzapProvider>{children}</StarkzapProvider>
      </body>
    </html>
  );
}`} />
                </div>
              </motion.section>

              <hr className="hg-divider" />

              {/* ══════════════════════════════════════════════════════════ */}
              {/* § 5  COPY-PASTE CODE BLOCKS                                */}
              {/* ══════════════════════════════════════════════════════════ */}
              <motion.section id="code" ref={el => { sectionRefs.current["code"] = el; }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.4 }}
                style={{ marginBottom: "56px", scrollMarginTop: "80px" }}>

                <SectionHeader icon={Code2} label="Section 05" title="Copy-Paste Ready Code" />

                {/* read hook usage */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span className="hg-pill-read hg-mono"><Eye size={9} />Read: get()</span>
                  </div>
                  <Snippet filename="components/GetValue.tsx" code={`"use client";
import { ${hookPrefix}Get } from "@/hooks/use${toPascal(contractName)}";

export function GetValue() {
  const { data, loading, error, refetch } = ${hookPrefix}Get();

  if (loading) return <p>Loading…</p>;
  if (error)   return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div>
      <p>Stored value: <strong>{data?.toString() ?? "—"}</strong></p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}`} />
                </div>

                {/* write hook usage */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span className="hg-pill-write hg-mono"><PenLine size={9} />Write: set(value)</span>
                  </div>
                  <Snippet filename="components/SetValue.tsx" code={`"use client";
import { useState } from "react";
import { ${hookPrefix}Set, useStarkzap } from "@/hooks/use${toPascal(contractName)}";

export function SetValue() {
  const { connectWallet, address } = useStarkzap();
  const { execute, status, txHash, error, reset } = ${hookPrefix}Set();
  const [input, setInput] = useState("");

  if (!address) {
    return <button onClick={connectWallet}>Connect Wallet</button>;
  }

  return (
    <div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="New value (felt252 — number or short string)"
        disabled={status === "pending"}
      />

      <button
        onClick={() => execute(input)}
        disabled={status === "pending" || !input}
      >
        {status === "pending" ? "Sending…" : "Set Value (Gasless ⚡)"}
      </button>

      {status === "success" && (
        <p>
          ✓ Confirmed!{" "}
          <a
            href={\`https://sepolia.voyager.online/tx/\${txHash}\`}
            target="_blank" rel="noopener noreferrer"
          >
            View tx ↗
          </a>
          <button onClick={reset}>Reset</button>
        </p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}`} />
                </div>

                {/* full demo page */}
                <div style={{ marginBottom: "16px" }}>
                  <Snippet filename="app/page.tsx" code={`import { GetValue } from "@/components/GetValue";
import { SetValue } from "@/components/SetValue";

export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "640px", margin: "0 auto" }}>
      <h1>${contractName} — Live Demo</h1>

      <section style={{ margin: "2rem 0" }}>
        <h2>Current Value</h2>
        <GetValue />
      </section>

      <section style={{ margin: "2rem 0" }}>
        <h2>Update Value</h2>
        <SetValue />
      </section>
    </main>
  );
}`} />
                </div>

                <Callout icon={Sparkles} color="#a78bfa" title="Get the complete hooks file">
                  Use the <strong>Hook Generator</strong> panel on the right → paste your ABI → download a
                  fully-typed <span className="hg-mono" style={{ fontSize: "11px", color: "#c4b5fd" }}>use{toPascal(contractName)}.ts</span> with provider setup, read hooks, and write hooks all in one file.
                </Callout>
              </motion.section>

              <hr className="hg-divider" />

              {/* ══════════════════════════════════════════════════════════ */}
              {/* § 6  DEVELOPER NOTES                                       */}
              {/* ══════════════════════════════════════════════════════════ */}
              <motion.section id="notes" ref={el => { sectionRefs.current["notes"] = el; }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
                style={{ marginBottom: "56px", scrollMarginTop: "80px" }}>

                <SectionHeader icon={Shield} label="Section 06" title="Developer Notes" />

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <NoteCard icon={Zap} color="#f59e0b" title="Gasless Transactions">
                    Generated write hooks use Starkzap's AVNU paymaster with{" "}
                    <span className="hg-mono" style={{ fontSize: "11px", color: "#a3a3a3" }}>feeMode: &apos;sponsored&apos;</span>.
                    Users need zero STRK or ETH to call your contract. Fund your paymaster account once at{" "}
                    <span className="hg-mono" style={{ fontSize: "10.5px", color: "#737373" }}>starkzap.dev/paymaster</span>.
                  </NoteCard>

                  <NoteCard icon={Globe} color="#38bdf8" title={`Network: Starknet ${network === "mainnet" ? "Mainnet" : "Sepolia"}`}>
                    {network !== "mainnet"
                      ? "Sepolia is the public testnet — tokens have no real value. To go to Mainnet: redeploy on Starknet Mainnet, then re-generate hooks with network set to mainnet."
                      : "This contract is deployed on Starknet Mainnet. All transactions use real assets — double-check addresses and values before executing write calls."}
                  </NoteCard>

                  <NoteCard icon={FileCode} color="#a78bfa" title="felt252 Type">
                    <span className="hg-mono" style={{ fontSize: "11px", color: "#a3a3a3" }}>felt252</span> is Cairo&apos;s native field element — fits any integer up to ~2²⁵¹.
                    In JavaScript it arrives as <span className="hg-mono" style={{ fontSize: "11px", color: "#a3a3a3" }}>BigInt</span>.
                    Passing small numbers (<span className="hg-mono" style={{ fontSize: "11px", color: "#a3a3a3" }}>42n</span>) works directly.
                    To store a short string, use{" "}
                    <span className="hg-mono" style={{ fontSize: "11px", color: "#a3a3a3" }}>shortString.encodeShortString("hello")</span> from starknet.js first.
                  </NoteCard>

                  <NoteCard icon={AlertCircle} color="#ef4444" title="Limitations & Assumptions">
                    <ul style={{ margin: "4px 0 0", padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <li>Generated hooks assume the contract is already deployed at the given address.</li>
                      <li>Free RPC endpoints have rate limits — use a dedicated node in production.</li>
                      <li>Starkzap sponsored mode requires an active paymaster balance.</li>
                      <li><span className="hg-mono" style={{ fontSize: "10.5px" }}>u256</span> arguments are split into{" "}
                        <span className="hg-mono" style={{ fontSize: "10.5px" }}>low</span> +{" "}
                        <span className="hg-mono" style={{ fontSize: "10.5px" }}>high</span> limbs in calldata — handled automatically by the generated hooks.
                      </li>
                    </ul>
                  </NoteCard>
                </div>
              </motion.section>

            </div>{/* end docs column */}

            {/* ── STARTER TEMPLATE IDE PANEL ──────────────────────────────── */}
            <div style={{ position: "sticky", top: "53px", height: "calc(100vh - 53px)", display: "flex", flexDirection: "column", background: "#0d1117", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>

              {/* ─── Panel header ─────────────────────────────────────────── */}
              <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#161b22", flexShrink: 0 }}>
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
              <div style={{ display: "flex", overflowX: "auto", background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, scrollbarWidth: "none" }}>
                {templateFiles.map((f, i) => {
                  const isActive = activeFile === i;
                  const ext = f.name.split(".").pop() ?? "ts";
                  const extColor = ext === "json" ? "#febc2e" : ext === "tsx" ? "#38bdf8" : "#f59e0b";
                  return (
                    <button key={i} onClick={() => setActiveFile(i)}
                      style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px", flexShrink: 0, cursor: "pointer", background: isActive ? "#0d1117" : "transparent", color: isActive ? "#e6edf3" : "#6e7681", border: "none", borderBottom: isActive ? "1px solid #f59e0b" : "1px solid transparent", fontFamily: "var(--font-jb-mono), ui-monospace, monospace", fontSize: "11px", fontWeight: isActive ? 600 : 400, transition: "all 0.1s", position: "relative", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "8px", fontWeight: 700, color: extColor, opacity: isActive ? 1 : 0.5, background: `${extColor}18`, padding: "1px 4px", borderRadius: "3px", letterSpacing: "0.04em" }}>
                        {ext.toUpperCase()}
                      </span>
                      <span>{f.name}</span>
                      {f.isHooks && !f.generated && (
                        <span style={{ fontSize: "9px", color: "#f59e0b", marginLeft: "2px" }}>○</span>
                      )}
                      {f.isHooks && f.generated && (
                        <span style={{ fontSize: "9px", color: "#3fb950", marginLeft: "2px" }}>●</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ─── File path bar ─────────────────────────────────────────── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 14px", background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
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
                  isHooksPlaceholder={!!(templateFiles[activeFile].isHooks && !templateFiles[activeFile].generated)}
                  showAbiInput={showAbiInput}
                  onRequestGenerate={() => setShowAbiInput(s => !s)}
                />
                {/* ABI input overlay (only when hooks tab + not generated) */}
                {templateFiles[activeFile].isHooks && !templateFiles[activeFile].generated && showAbiInput && (
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
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#161b22", flexShrink: 0 }}>
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
    <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
      {/* icon + connector line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(16,185,129,0.1)" }}>
          <CheckCircle2 size={11} style={{ color: "#10b981" }} />
        </div>
        {!last && <div style={{ width: "1px", height: "28px", background: "linear-gradient(to bottom, rgba(16,185,129,0.25), rgba(16,185,129,0.04))", marginTop: "3px" }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : "6px", marginTop: "1px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#8b949e", marginBottom: "3px" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "#484f58", lineHeight: 1.55 }}>{detail}</div>
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
