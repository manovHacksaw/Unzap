"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, Folders, File, Folder, ChevronRight, ChevronDown,
  Terminal as TerminalIcon, Download, Zap, Sparkles, Hash,
  Globe, Check, Copy, Package, Layout, Code2, Plus, X,
  ArrowUpRight, ExternalLink, Loader2
} from "lucide-react";
import { Syne, JetBrains_Mono } from "next/font/google";
import { clsx } from "clsx";

const syne = Syne({ subsets: ["latin"], weight: ["400", "700", "800"], variable: "--font-syne" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jb" });

// ── Types ──────────────────────────────────────────────────────────────────

interface ProjectFilesResponse {
  files: Record<string, string>;
  hooksFilename: string;
}

type FileNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = [];

  Object.keys(files).forEach((path) => {
    const parts = path.split("/");
    let currentLevel = root;

    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let node = currentLevel.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: fullPath,
          type: isLast ? "file" : "folder",
          children: isLast ? undefined : [],
        };
        currentLevel.push(node);
      }

      if (node.children) {
        currentLevel = node.children;
      }
    });
  });

  // Sort: folders first, then alphabetical
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };
  
  sortNodes(root);
  return root;
}

function detectLang(filename: string) {
  if (filename.endsWith(".tsx")) return "tsx";
  if (filename.endsWith(".ts")) return "typescript";
  if (filename.endsWith(".json")) return "json";
  if (filename.endsWith(".css")) return "css";
  if (filename.endsWith(".mjs")) return "javascript";
  return "typescript";
}

// ── Hook: Shiki ────────────────────────────────────────────────────────────

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

// ── Page Component ──────────────────────────────────────────────────────────

export default function ProjectWorkspacePage() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address");
  const name = searchParams.get("name") || "MyProject";
  const network = searchParams.get("network") || "sepolia";
  const classHash = searchParams.get("classHash") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>("app/page.tsx");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "app": true, "components": true, "hooks": true, "lib": true });

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  // Fetch ABI from local deployments first if possible (simulated here)
  useEffect(() => {
    if (!address) return;

    const fetchProject = async () => {
      setIsLoading(true);
      addLog("Initializing Project Workspace...");
      
      try {
        // In a real app, we'd fetch the ABI from the address or state
        // For now, we'll try to find it in localStorage 'unzap:history'
        const historyStr = localStorage.getItem("unzap:history");
        let abi = [];
        if (historyStr) {
          const history = JSON.parse(historyStr);
          const found = history.deployments?.find((d: any) => 
            d.contractAddress.toLowerCase() === address.toLowerCase()
          );
          if (found) {
             // ABI is stored as a JSON string in the history object
             abi = typeof found.abi === "string" ? JSON.parse(found.abi) : found.abi;
          }
        }

        if (!abi || abi.length === 0) {
          addLog("⚠️ ABI not found in local history. Re-deploy or check address.");
        } else {
          addLog(`✅ ABI discovered: ${abi.length} entries`);
        }

        addLog(`Fetching blueprints for ${name}...`);
        
        const response = await fetch("/api/generate-project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractName: name,
            contractAddress: address,
            classHash,
            network,
            abi,
            format: "json"
          })
        });

        if (!response.ok) throw new Error("Generation failed");

        const data = await response.json();
        setFiles(data.files);
        addLog("✅ Project generated in 0.42s");
        addLog("Scanning schemas...");
        addLog(`✅ Hooks created: ${data.hooksFilename}, useAuth.ts`);
        addLog(`Ready to run. Use npm run dev to start.`);
        
      } catch (err) {
        addLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [address, name, network, classHash]);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleDownloadZip = async () => {
    setIsGenerating(true);
    addLog("Compressing project files...");
    try {
      const historyStr = localStorage.getItem("unzap:history");
      let abi = [];
      if (historyStr) {
        const history = JSON.parse(historyStr);
        const found = history.deployments?.find((d: any) => 
          d.contractAddress.toLowerCase() === address?.toLowerCase()
        );
        if (found) {
          abi = typeof found.abi === "string" ? JSON.parse(found.abi) : found.abi;
        }
      }

      const response = await fetch("/api/generate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractName: name,
          contractAddress: address,
          classHash,
          network,
          abi,
          format: "zip"
        })
      });

      if (!response.ok) throw new Error("Zip generation failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}-app.zip`;
      a.click();
      addLog("✅ ZIP downloaded.");
    } catch (err) {
      addLog(`❌ Download failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Components ──────────────────────────────────────────────────────────

  const FileTreeNode = ({ node, depth = 0 }: { node: FileNode; depth?: number }) => {
    const isExpanded = expandedFolders[node.path];
    const isActive = activeFile === node.path;

    const toggle = () => {
      if (node.type === "folder") {
        setExpandedFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }));
      } else {
        setActiveFile(node.path);
      }
    };

    return (
      <div className="select-none">
        <div 
          onClick={toggle}
          className={clsx(
            "flex items-center gap-1.5 py-1 px-3 cursor-pointer transition-colors duration-75",
            isActive ? "bg-neutral-800 text-neutral-100" : "text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
          )}
          style={{ paddingLeft: `${(depth * 12) + 12}px` }}
        >
          {node.type === "folder" ? (
            <>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className={isExpanded ? "text-amber-500/60" : "text-neutral-600"} />
            </>
          ) : (
            <File size={14} className={isActive ? "text-amber-400" : "text-neutral-600"} />
          )}
          <span className="text-[11px] font-mono tracking-tight">{node.name}</span>
        </div>
        {node.type === "folder" && isExpanded && (
          <div className="flex flex-col">
            {node.children?.map(child => (
              <FileTreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CodeEditor = () => {
    const code = files[activeFile] || "";
    const shikiHtml = useShiki(code, activeFile);
    const containerRef = useRef<HTMLDivElement>(null);

    return (
      <div className="flex flex-col h-full bg-[#0a0a0a]">
        {/* Tabs */}
        <div className="flex items-center bg-[#111] border-b border-black h-9 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center px-4 py-2 border-r border-black bg-[#0a0a0a] text-[11px] font-mono text-neutral-300 gap-2 border-t border-t-amber-500/50">
             <File size={12} className="text-amber-500/70" />
             {activeFile.split("/").pop()}
             <X size={10} className="hover:text-white cursor-pointer ml-1" />
          </div>
        </div>
        
        {/* Editor Area */}
        <div className="flex-1 overflow-auto bg-[#0a0a0a]" ref={containerRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full opacity-20">
               <Loader2 size={32} className="animate-spin" />
            </div>
          ) : shikiHtml ? (
            <div 
              className="p-6 text-[12.5px] font-mono leading-relaxed"
              dangerouslySetInnerHTML={{ __html: shikiHtml }}
            />
          ) : (
            <pre className="p-6 text-[12.5px] font-mono leading-relaxed text-neutral-400">
               {code.split("\n").map((line, i) => (
                 <div key={i} className="flex gap-6">
                   <span className="text-neutral-700 w-6 text-right select-none">{i+1}</span>
                   <span>{line}</span>
                 </div>
               ))}
            </pre>
          )}
        </div>
      </div>
    );
  };

  const Terminal = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [terminalLogs]);

    return (
      <div className="h-44 bg-[#0d0d0d] border-t border-white/5 flex flex-col">
        <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 border-b border-white/5">
           <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
               <TerminalIcon size={12} /> Terminal
             </span>
             <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-600">Output</span>
             <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-600">Debug Console</span>
           </div>
           <div className="flex items-center gap-2">
             <X size={12} className="text-neutral-700 hover:text-neutral-400 cursor-pointer" />
           </div>
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed no-scrollbar" ref={scrollRef}>
           {terminalLogs.map((log, i) => (
             <div key={i} className={clsx(
                "mb-1",
                log.includes("✅") && "text-emerald-400",
                log.includes("❌") && "text-red-400",
                log.includes("⚠️") && "text-amber-400",
                !log.includes("✅") && !log.includes("❌") && !log.includes("⚠️") && "text-neutral-500"
             )}>
               {log}
             </div>
           ))}
           <div className="mt-2 text-neutral-200">
             <span className="text-sky-500">➜</span> <span className="text-emerald-500">unzap-app</span> <span className="text-neutral-500">git:(</span><span className="text-red-400">main</span><span className="text-neutral-500">)</span> <span className="animate-pulse">_</span>
           </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <main className={clsx("h-screen w-screen flex flex-col bg-[#050505] text-neutral-100 overflow-hidden", syne.variable, jetbrains.variable)}>
      
      {/* Header */}
      <header className="h-12 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <Rocket size={18} className="text-amber-500" />
             <span className="font-bold text-sm tracking-tight">Project Workspace</span>
           </div>
           <div className="w-px h-5 bg-white/10 mx-2" />
           <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
             <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{name}</span>
             <span>/</span>
             <span>{activeFile}</span>
           </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={handleDownloadZip}
             disabled={isGenerating}
             className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-bold hover:bg-white/10 transition-all disabled:opacity-50"
           >
             {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={13} />}
             Download ZIP
           </button>
           <a 
             href="https://stackblitz.com/fork/nextjs" 
             target="_blank" 
             rel="noreferrer"
             className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500 text-black text-[11px] font-bold hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
           >
             <Zap size={13} />
             Open in StackBlitz
           </a>
        </div>
      </header>

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Explorer Sidebar */}
        <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden">
           <div className="px-4 py-3 flex items-center justify-between border-b border-black">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <Folders size={12} /> Explorer
              </span>
              <Plus size={12} className="text-neutral-700 hover:text-neutral-400 cursor-pointer" />
           </div>
           <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
              {fileTree.map(node => (
                <FileTreeNode key={node.path} node={node} />
              ))}
              
              <div className="mt-8 px-4 opacity-20">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2">Outline</div>
                <div className="h-2 w-32 bg-neutral-800 rounded mb-1" />
                <div className="h-2 w-24 bg-neutral-800 rounded mb-1" />
                <div className="h-2 w-28 bg-neutral-800 rounded" />
              </div>
           </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
           {/* Editor */}
           <div className="flex-1 overflow-hidden">
              <CodeEditor />
           </div>
           
           {/* Terminal */}
           <Terminal />
        </div>

      </div>

      {/* Footer Status Bar */}
      <footer className="h-6 border-t border-white/5 bg-[#0a0a0a] flex items-center justify-between px-3 text-[10px] font-mono text-neutral-600 shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5 text-sky-500/60 font-bold">
              <ArrowUpRight size={10} />
              <span>main*</span>
           </div>
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                 <Check size={10} className="text-emerald-500/50" />
                 <span>0 Errors</span>
              </div>
              <div className="flex items-center gap-1">
                 <AlertCircleIcon size={10} />
                 <span>0 Warnings</span>
              </div>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <span>UTF-8</span>
           <span>TypeScript JSX</span>
           <div className="flex items-center gap-1 text-amber-500/50">
              <Sparkles size={10} />
              <span>AI Paired</span>
           </div>
        </div>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .tok-kw { color: #ff7b72; }
        .tok-str { color: #a5d6ff; }
        .tok-com { color: #8b949e; }
        pre code { display: block; padding: 0.5rem; }
        .shiki { background-color: transparent !important; }
      `}</style>
    </main>
  );
}

function AlertCircleIcon({ size }: { size: number }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: "1px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px" }}>!</div>;
}
