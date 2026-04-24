"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ElementType } from "react";
import {
  StarkZap,
  OnboardStrategy,
  accountPresets,
  getPresets,
  Amount,
  fromAddress,
  type WalletInterface,
} from "starkzap";
import { usePrivy } from "@privy-io/react-auth";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";

// --- NEW PROFESSIONAL COMPONENTS ---
import { AcademySidebar, ModuleId } from "./components/AcademySidebar";
import { SetupStepper } from "./components/SetupStepper";
import { VisualPipeline, PipelineStep, PipelineStatus } from "./components/VisualPipeline";
import { CodePanel, CodeAnnotation } from "./components/CodePanel";
import { RawResultInspector } from "./components/RawResultInspector";

// --- ICONS ---
import { 
  Zap, 
  Shield, 
  Play, 
  RotateCcw, 
  ExternalLink,
  ChevronRight,
  Info,
  User,
  ShieldCheck,
  Server,
  Terminal,
  Activity,
  Globe,
  Package,
  BookOpen,
  Code2
} from "lucide-react";
import { clsx } from "clsx";

// --- TYPES & DATA ---

interface AcademyGuide {
  title: string;
  markdown: string;
  annotations: CodeAnnotation[];
  snippet: string;
  pipelineSteps: { id: string; label: string; icon: ElementType }[];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AcademyPage() {
  const { login, logout, authenticated, getAccessToken, user } = usePrivy();
  const { network } = useNetwork();
  const netConfig = useMemo(() => getNetworkConfig(network), [network]);
  
  // --- STATE: LAYOUT & NAVIGATION ---
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>("foundation");
  const [activeSubModule, setActiveSubModule] = useState("connect");
  
  // --- STATE: SDK & WALLET ---
  const sdkRef = useRef<StarkZap | null>(null);
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // --- STATE: LAB OUTPUT ---
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [activeLine, setActiveLine] = useState<number | undefined>(undefined);

  // Initialize SDK
  useEffect(() => {
    sdkRef.current = new StarkZap({
      network: netConfig.network,
      paymaster: {
        headers: { "x-paymaster-api-key": process.env.NEXT_PUBLIC_AVNU_API_KEY! },
      },
    });
  }, [netConfig.network]);

  // --- ACTION HANDLERS ---

  const updatePipelineStep = (id: string, status: PipelineStatus) => {
    setPipelineSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleRunModule = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setError(null);
    setResult(null);
    setActiveLine(undefined);

    try {
      if (activeSubModule === "connect") await runConnect();
      else if (activeSubModule === "paymaster") await runSponsoredPay();
      else if (activeSubModule === "sign") await runSignMessage();
      else if (activeSubModule === "execute") await runUniversalCall();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsExecuting(false);
    }
  };

  const runConnect = async () => {
    const steps: PipelineStep[] = [
      { id: "init", label: "SDK Bind", status: "active", icon: Terminal },
      { id: "onboard", label: "Onboard", status: "pending", icon: User },
      { id: "signer", label: "Signer Context", status: "pending", icon: ShieldCheck },
    ];
    setPipelineSteps(steps);

    setActiveLine(1); 
    await new Promise(r => setTimeout(r, 800));
    updatePipelineStep("init", "done");

    updatePipelineStep("onboard", "active");
    setActiveLine(3);
    if (!authenticated) {
      updatePipelineStep("onboard", "error");
      login();
      setIsExecuting(false);
      return;
    }

    const accessToken = await getAccessToken();
    updatePipelineStep("onboard", "done");

    updatePipelineStep("signer", "active");
    setActiveLine(5);
    const { wallet: w } = await sdkRef.current!.onboard({
      strategy: OnboardStrategy.Privy,
      privy: {
        resolve: async () => {
           const res = await fetch("/api/signer-context", {
             method: "POST",
             headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
           });
           return res.json();
        }
      },
      accountPreset: accountPresets.argentXV050,
    });
    setWallet(w);
    updatePipelineStep("signer", "done");
    setResult({ address: w.address, type: "Starknet Identity (Embedded)" });
  };

  const runSponsoredPay = async () => {
     if (!wallet) { setError("Please connect via Module 1 first."); setIsExecuting(false); return; }
     
     const steps: PipelineStep[] = [
       { id: "build", label: "Payload", status: "active", icon: Terminal },
       { id: "zap", label: "Paymaster", status: "pending", icon: Zap },
       { id: "exec", label: "L2 Execute", status: "pending", icon: Server },
     ];
     setPipelineSteps(steps);

     setActiveLine(1);
     const STRK = getPresets(netConfig.chainId).STRK;
     await new Promise(r => setTimeout(r, 800));
     updatePipelineStep("build", "done");

     updatePipelineStep("zap", "active");
     setActiveLine(10);
     const tx = await wallet.transfer(STRK, [{ to: fromAddress(wallet.address), amount: Amount.parse("0.001", STRK) }], {
       feeMode: "sponsored"
     });
     updatePipelineStep("zap", "done");

     updatePipelineStep("exec", "active");
     setActiveLine(13);
     await tx.wait();
     updatePipelineStep("exec", "done");
     setResult({ tx_hash: tx.hash, status: "Confirmed" });
  };

  const runSignMessage = async () => {
     if (!wallet) { setError("Connect first."); setIsExecuting(false); return; }
     
     const steps: PipelineStep[] = [
       { id: "struct", label: "Struct", status: "active", icon: Terminal },
       { id: "sign", label: "Signer", status: "pending", icon: User },
     ];
     setPipelineSteps(steps);

     setActiveLine(1);
     const sig = await wallet.signMessage({
       types: { StarkNetDomain: [{ name: "name", type: "felt" }], Message: [{ name: "text", type: "felt" }] },
       primaryType: "Message",
       domain: { name: "Unzap" },
       message: { text: "Starknet Academy Test" }
     });
     updatePipelineStep("struct", "done");
     updatePipelineStep("sign", "done");
     setResult({ signature: sig });
  };

  const runUniversalCall = async () => {
     setError("Module 4 is currently in read-only mode. Review the API reference below.");
     setIsExecuting(false);
  };

  // --- ACADEMY CONTENT DATA ---

  const academyGuides: Record<string, AcademyGuide> = {
    connect: {
      title: "Wallet Onboarding",
      markdown: "Connect your application to a Starknet wallet. We use **Privy** to provide an embedded, non-custodial experience that doesn't require users to install extension wallets like ArgentX or Braavos initially.",
      snippet: `const { wallet } = await sdk.onboard({\n  strategy: OnboardStrategy.Privy,\n  privy: {\n    // Resolve the server-side signer context\n    resolve: async () => fetch('/api/signer-context').then(r => r.json()),\n  },\n  accountPreset: accountPresets.argentXV050,\n});`,
      annotations: [
        { lineNumber: 1, title: "Onboarding Strategy", description: "Selects how the wallet is initialized. 'Privy' is best for Web2-like onboarding." },
        { lineNumber: 8, title: "Account Abstraction Preset", description: "Starknet accounts are smart contracts. This selects the V0.5.0 ArgentX implementation." }
      ],
      pipelineSteps: [
        { id: "init", label: "SDK Bind", icon: Terminal },
        { id: "onboard", label: "Onboard", icon: User },
        { id: "signer", label: "Identified", icon: ShieldCheck },
      ]
    },
    paymaster: {
       title: "Sponsored (Gasless) Pay",
       markdown: "Native Account Abstraction allow a 3rd party (Paymaster) to cover transaction fees. This 'Zapping' pattern is essential for onboarding users who don't yet have STRK or ETH on Starknet.",
       snippet: `const tx = await wallet.transfer(\n  STRK,\n  [{ \n    to: recipient, \n    amount: Amount.parse("1.5", STRK) \n  }],\n  { feeMode: 'sponsored' } \n);\n\n// Await L2 confirmation\nawait tx.wait();`,
       annotations: [
         { lineNumber: 7, title: "Fee Mode: Sponsored", description: "The magic flag that tells the SDK to request a signature from the Unzap paymaster." }
       ],
       pipelineSteps: [
         { id: "build", label: "Payload", icon: Terminal },
         { id: "zap", label: "Paymaster", icon: Zap },
         { id: "exec", label: "L2 Execute", icon: Server },
       ]
    },
    sign: {
       title: "Typed Message Signing",
       markdown: "Securely sign off-chain data using **EIP-712** styled structures. This is used for authentication, gasless voting, or permit-style approvals.",
       snippet: `const signature = await wallet.signMessage({\n  types: {\n    StarkNetDomain: [{ name: 'name', type: 'felt' }],\n    Message: [{ name: 'text', type: 'felt' }]\n  },\n  primaryType: "Message",\n  domain: { name: "Unzap" },\n  message: { text: "Starknet Academy" }\n});`,
       annotations: [
         { lineNumber: 1, title: "signMessage", description: "Requests the wallet to sign the typed data. Users see a human-readable summary." }
       ],
       pipelineSteps: [
         { id: "struct", label: "Structure", icon: Terminal },
         { id: "sign", label: "User Sign", icon: User },
         { id: "verify", label: "Verified", icon: ShieldCheck },
       ]
    },
    execute: {
       title: "Universal Contract Invoke",
       markdown: "The `execute` method is the core of all write operations. It allows batching multiple contract calls into a single atomic transaction on Starknet.",
       snippet: `const tx = await wallet.execute([\n  {\n    contractAddress: "0x047...",\n    entrypoint: "transfer",\n    calldata: [recipient, "0", "1000"]\n  }\n], { feeMode: 'sponsored' });`,
       annotations: [
         { lineNumber: 1, title: "Batching", description: "Starknet allows multiple calls in one transaction natively. Wrap objects in the array to batch." }
       ],
       pipelineSteps: [
         { id: "prep", label: "Calldata", icon: Terminal },
         { id: "auth", label: "Authorize", icon: User },
         { id: "exec", label: "Broadcast", icon: Server },
       ]
    },
    "multi-call": {
      title: "Atomic Multi-calls",
      markdown: "Perform multiple operations (e.g. Apprentice + Swap + Deposit) in one click. This is a primary UX advantage of Starknet's Account Abstraction.",
      snippet: `const tx = await wallet.execute([\n  { contractAddress: swapAddr, entrypoint: "swap", calldata: [...] },\n  { contractAddress: tokenAddr, entrypoint: "approve", calldata: [...] }\n]);`,
      annotations: [
        { lineNumber: 1, title: "Atomic Execution", description: "If any call in the batch fails, the entire transaction reverts." }
      ],
      pipelineSteps: [
         { id: "batch", label: "Batching", icon: Terminal },
         { id: "sign", label: "Multi-Sign", icon: User },
         { id: "exec", label: "Atomic L2", icon: Server },
       ]
    },
    starknetjs: {
      title: "SDK Installation",
      markdown: "To start building, you need to install the core `starknet` package. This provides the low-level primitives that the Starkzap SDK builds upon.",
      snippet: `// Install via NPM\nnpm install starknet\n\n// Or via Yarn\nyarn add starknet`,
      annotations: [
        { lineNumber: 2, title: "Production Build", description: "Always use at least v6.0.0+ for latest Starknet features." }
      ],
      pipelineSteps: [
         { id: "pkg", label: "NPM Registry", icon: Package },
         { id: "node", label: "Node Modules", icon: Server },
      ]
    }
  };

  const activeGuide = academyGuides[activeSubModule] || academyGuides.connect;

  // --- RENDER ---

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-200 overflow-hidden font-sans">
      
      {/* 1. ACADEMY SIDEBAR (21st.dev inspired) */}
      <AcademySidebar 
        activeModuleId={activeModule}
        activeSubModuleId={activeSubModule}
        onSelect={(m, s) => {
          setActiveModule(m);
          setActiveSubModule(s);
          setError(null);
          setResult(null);
          setPipelineSteps([]);
        }}
        isCollapsed={isSidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080808] relative">
        
        {/* TOP STATUS BAR */}
        <div className="h-16 px-8 border-b border-neutral-900 flex items-center justify-between bg-[#080808]/50 backdrop-blur-md z-10">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">Network: {netConfig.network.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2">
                 <Globe size={14} className="text-neutral-600" />
                 <span className="text-[10px] font-mono text-neutral-500">RPC: Starknet Node Layer</span>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              {wallet ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-mono font-bold text-emerald-500">Account Ready: {wallet.address.slice(0, 10)}...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/5 border border-red-500/20">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">Signer Required</span>
                </div>
              )}
           </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          
          <div className="max-w-[1400px] mx-auto space-y-12">
            
            {/* MODULE 0: SETUP OVERVIEW */}
            {activeModule === "setup" ? (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-8"
               >
                  <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold tracking-tighter text-white">Prerequisites & Tooling</h1>
                    <p className="text-neutral-500 max-w-2xl leading-relaxed">Ensure your local environment is configured for Starknet development. Follow the checklist below to install the necessary SDKs and toolchains.</p>
                  </div>
                  <SetupStepper />
               </motion.div>
            ) : (
              /* LIVE LAB SECTIONS */
              <div className="grid grid-cols-12 gap-12">
                
                {/* LEFT: LAB CONTROLS & GUIDE */}
                <div className="col-span-7 space-y-8">
                   <motion.div 
                     key={activeSubModule}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="space-y-6"
                   >
                      <div className="flex items-center gap-3">
                         <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                           <Activity size={20} />
                         </div>
                         <h2 className="text-3xl font-bold tracking-tight text-white">{activeGuide.title}</h2>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-neutral-900/30 border border-neutral-800/50 backdrop-blur-sm">
                         <p className="text-neutral-400 text-sm leading-relaxed mb-6 italic border-l-2 border-amber-500/30 pl-4">
                           {activeGuide.markdown}
                         </p>
                         
                         <VisualPipeline steps={pipelineSteps.length > 0 ? pipelineSteps : activeGuide.pipelineSteps} className="mb-8" />
                         
                         <div className="flex items-center gap-4">
                            <button
                               onClick={handleRunModule}
                               disabled={isExecuting}
                               className="flex-[2] bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black h-14 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
                            >
                               {isExecuting ? <RotateCcw size={20} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                               {isExecuting ? "Executing..." : "Run Active Lab Module"}
                            </button>
                            <button className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all">
                               Academy Guide
                            </button>
                         </div>
                         
                         {error && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-mono leading-relaxed"
                            >
                               {error}
                            </motion.div>
                         )}
                      </div>
                   </motion.div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 flex flex-col gap-4">
                         <div className="flex items-center gap-3 text-neutral-500">
                            <Info size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Mastery Tip</span>
                         </div>
                         <p className="text-[11px] text-neutral-600 leading-relaxed">
                            {activeSubModule === 'connect' && "Native AA on Starknet means your application is not restricted to extension wallets. Privy integration allows for a 'Web2-like' flow."}
                            {activeSubModule === 'paymaster' && "The paymaster check (AVNU) happens on every sponsored transaction to ensure the application has enough balance to cover the user's gas."}
                         </p>
                      </div>
                      <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 flex flex-col gap-4">
                         <div className="flex items-center gap-3 text-neutral-500">
                            <Activity size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Network Load</span>
                         </div>
                         <div className="flex items-end gap-1">
                            {[40, 60, 30, 80, 50, 40, 70, 90, 50].map((h, i) => (
                              <div key={i} className="flex-1 bg-amber-500/20 rounded-t-sm" style={{ height: `${h}%` }} />
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                {/* RIGHT: CODE & CONSOLE */}
                <div className="col-span-5 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 size={16} className="text-amber-500" />
                        <span className="text-xs font-bold font-mono tracking-tighter text-neutral-400">SIGNER_SNIPPET.TS</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-500 uppercase">Interactive</div>
                   </div>
                   
                   <div className="h-[400px]">
                      <CodePanel 
                        code={activeGuide.snippet} 
                        annotations={activeGuide.annotations} 
                        activeLine={activeLine} 
                      />
                   </div>

                   <div className="h-[300px]">
                      <RawResultInspector data={result} isLoading={isExecuting} />
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
