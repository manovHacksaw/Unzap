"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ArrowRightLeft, 
  TrendingUp, 
  Coins, 
  Wallet, 
  ChevronDown, 
  ArrowUpRight, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Plus,
  Target,
  LineChart,
  LayoutGrid,
  History,
  Lock,
  ExternalLink,
  ChevronRight,
  Info,
  DollarSign,
  Globe
} from "lucide-react";
import { clsx } from "clsx";
import { usePrivy } from "@privy-io/react-auth";
import { useNetwork } from "@/lib/NetworkContext";
import { getNetworkConfig } from "@/lib/network-config";

// --- TYPES ---
interface Token {
  symbol: string;
  name: string;
  balance: string;
  price: number;
  icon: string;
  color: string;
  address?: string;
}

interface StakingPool {
  id: string;
  token: string;
  apr: string;
  tvl: string;
  status: "active" | "hot" | "new";
  icon: any;
  poolAddress?: string;
}

// --- COMPONENTS ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx("bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/20", className)}>
    {children}
  </div>
);

export default function DeFiDashboard() {
  const { login, logout, authenticated, user, getAccessToken } = usePrivy();
  const { network, setNetwork } = useNetwork();
  const netConfig = useMemo(() => getNetworkConfig(network || "mainnet"), [network]);

  const sdkRef = useRef<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [tokens, setTokens] = useState<Token[]>([
    { symbol: "STRK", name: "Starknet Token", balance: "0.00", price: 0.45, icon: "⚡", color: "bg-emerald-500" },
    { symbol: "ETH", name: "Ethereum", balance: "0.00", price: 2350.00, icon: "⟠", color: "bg-indigo-500" },
    { symbol: "USDC", name: "USD Coin", balance: "0.00", price: 1.00, icon: "💵", color: "bg-blue-500" },
    { symbol: "wBTC", name: "Wrapped Bitcoin", balance: "0.00", price: 65000.00, icon: "₿", color: "bg-amber-500" },
  ]);

  const [fromToken, setFromToken] = useState(tokens[0]);
  const [toToken, setToToken] = useState(tokens[2]);
  const [amount, setAmount] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [activeTab, setActiveTab] = useState<"swap" | "stake" | "bridge">("swap");
  const [logs, setLogs] = useState<any[]>([]);

  // Initialize SDK
  useEffect(() => {
    import("starkzap").then(({ StarkZap: SDK }) => {
      sdkRef.current = new SDK({
        network: netConfig.network,
        paymaster: {
          headers: { "x-paymaster-api-key": process.env.NEXT_PUBLIC_AVNU_API_KEY! },
        },
      });
    });
  }, [netConfig.network]);

  // Automatic Onboarding when Privy is ready
  useEffect(() => {
    if (!authenticated || !sdkRef.current || wallet) return;

    const performOnboard = async () => {
      try {
        const { OnboardStrategy, accountPresets } = await import("starkzap");
        const accessToken = await getAccessToken();
        const { wallet: w } = await sdkRef.current.onboard({
          strategy: OnboardStrategy.Privy,
          feeMode: "sponsored",
          deploy: "if_needed",
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
        addLog("Wallet synchronized with StarkZap SDK", "success", "onboard");
      } catch (err: any) {
        if (err.message?.includes("already deployed")) {
           // If already deployed, we can still proceed with the wallet connection
           addLog("Account already deployed. Resuming session...", "success", "onboard");
           // We need to get the wallet instance without the deploy step
           const { OnboardStrategy, accountPresets } = await import("starkzap");
           const accessToken = await getAccessToken();
           const { wallet: w } = await sdkRef.current.onboard({
             strategy: OnboardStrategy.Privy,
             deploy: "never", // Forced skip
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
        } else {
           console.error("Onboarding failed:", err);
           addLog(`Connection failed: ${err.message}`, "error", "onboard");
        }
      }
    };

    performOnboard();
  }, [authenticated, wallet]);

  // Fetch Balances
  useEffect(() => {
    if (!wallet) return;

    const fetchBalances = async () => {
      const { getPresets } = await import("starkzap");
      const presets = getPresets(netConfig.chainId);
      
      const newTokens = await Promise.all(tokens.map(async (t) => {
        const presetToken = presets[t.symbol];
        if (!presetToken) return t;
        try {
          const bal = await wallet.balanceOf(presetToken);
          return { ...t, balance: bal.toFormatted().split(" ")[0], address: presetToken.address };
        } catch (e) {
          return t;
        }
      }));
      
      setTokens(newTokens);
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [wallet, netConfig.chainId]);

  // Fetch Quotes (Real-time)
  useEffect(() => {
    if (!wallet || !amount || parseFloat(amount) <= 0) {
      setEstimatedValue("0");
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingQuote(true);
      try {
        const { getPresets, Amount } = await import("starkzap");
        const presets = getPresets(netConfig.chainId);
        const from = presets[fromToken.symbol];
        const to = presets[toToken.symbol];

        const quote = await wallet.getQuote({
          fromToken: from,
          toToken: to,
          fromAmount: Amount.parse(amount, from),
        });
        
        if (quote.toAmount.isZero()) {
          addLog(`No liquidity found for ${fromToken.symbol} → ${toToken.symbol}`, "warning", "swap");
        }
        
        setEstimatedValue(quote.toAmount.toFormatted().split(" ")[0]);
      } catch (err: any) {
        console.error("Quote fetch failed:", err);
        addLog(`Quote routing failed: ${err.message || "Unknown error"}`, "error", "swap");
        setEstimatedValue("0");
      } finally {
        setIsLoadingQuote(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken, wallet]);

  const addLog = (desc: string, status: string, type: string) => {
    setLogs(prev => [{ desc, status, type, time: "Just now" }, ...prev].slice(0, 10));
  };

  const handleSwap = async () => {
    if (!wallet || !amount) return;
    setIsSwapping(true);
    addLog(`Initiating swap: ${amount} ${fromToken.symbol}...`, "pending", "swap");

    try {
      const { getPresets, Amount } = await import("starkzap");
      const presets = getPresets(netConfig.chainId);
      const from = presets[fromToken.symbol];
      const to = presets[toToken.symbol];

      const tx = await wallet.swap({
        fromToken: from,
        toToken: to,
        fromAmount: Amount.parse(amount, from),
        feeMode: "sponsored"
      });

      addLog(`Swap broadcasted: ${tx.hash.slice(0, 10)}...`, "pending", "swap");
      await tx.wait();
      addLog(`Swap successful!`, "success", "swap");
      setAmount("");
    } catch (err: any) {
      addLog(`Swap failed: ${err.message}`, "error", "swap");
    } finally {
      setIsSwapping(false);
    }
  };

  const [POOLS, setPools] = useState<StakingPool[]>([
    { id: "strk-native", token: "STRK", apr: "8.4%", tvl: "$45.2M", status: "hot", icon: Zap, poolAddress: "0x000000051aa3755480ba087d0e51cc6bcff38e23fdf400000000" },
    { id: "eth-yield", token: "ETH", apr: "3.2%", tvl: "$120.8M", status: "active", icon: TrendingUp },
    { id: "btc-bridge", token: "wBTC", apr: "5.1%", tvl: "$12.4M", status: "new", icon: Target },
  ]);

  const handleStake = async (pool: StakingPool) => {
    if (!wallet || !pool.poolAddress) return;
    addLog(`Staking into ${pool.token} pool...`, "pending", "stake");
    try {
      const { Amount, getPresets } = await import("starkzap");
      const token = getPresets(netConfig.chainId)[pool.token];
      const tx = await wallet.stake(pool.poolAddress, Amount.parse("10", token), { feeMode: "sponsored" });
      await tx.wait();
      addLog(`Staking successful!`, "success", "stake");
    } catch (err: any) {
      addLog(`Staking failed: ${err.message}`, "error", "stake");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <LayoutGrid size={20} />
              </div>
              <h1 className="text-2xl font-bold tracking-tighter text-white">Starknet DeFi Hub</h1>
            </div>
            <p className="text-xs text-neutral-500 flex items-center gap-2">
              Powering the ecosystem with <Zap size={12} className="text-amber-500 fill-amber-500/20" /> StarkZap v2
            </p>
          </div>

            <div className="flex items-center gap-4">
              <select 
                value={network}
                onChange={(e) => setNetwork(e.target.value as any)}
                className="bg-neutral-900/50 border border-neutral-800 rounded-2xl px-4 py-2 text-xs font-mono text-white outline-none cursor-pointer hover:border-neutral-700 transition-all appearance-none"
              >
                <option value="mainnet">Mainnet</option>
                <option value="sepolia">Sepolia</option>
              </select>
              
              <div className="px-4 py-2 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3">
                <div className="flex flex-col items-end shrink-0 hidden sm:flex">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest leading-tight">Sync</span>
                  <span className="text-[10px] font-mono text-white leading-tight">Live</span>
                </div>
                <div className={clsx("w-2 h-2 rounded-full animate-pulse", network === "mainnet" ? "bg-amber-500" : "bg-emerald-500")} />
              </div>

              {authenticated ? (
              <button 
                className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all flex items-center gap-2 group"
                onClick={() => logout()}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold">
                  {user?.id.slice(-2).toUpperCase()}
                </div>
                <div className="flex flex-col items-start pr-2">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Connected</span>
                  <span className="text-xs font-mono text-white">0x...{user?.id.slice(-6)}</span>
                </div>
              </button>
            ) : (
              <button 
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-amber-500/10"
                onClick={() => login()}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT: NAVIGATION & RECENT */}
          <div className="col-span-3 space-y-6">
            <Card className="p-4">
              <div className="space-y-1">
                {[
                  { id: "swap", label: "Exchange", icon: ArrowRightLeft },
                  { id: "stake", label: "Yield Vaults", icon: Lock },
                  { id: "bridge", label: "BTC Portal", icon: Globe },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                      activeTab === item.id ? "bg-amber-500 text-black" : "hover:bg-white/5 text-neutral-400"
                    )}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    <ChevronRight size={14} className={clsx("ml-auto opacity-0 group-hover:opacity-100 transition-all", activeTab === item.id && "text-black")} />
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Asset Profile</span>
                <LineChart size={14} className="text-amber-500" />
              </div>
              <div className="space-y-4">
                {tokens.slice(0, 3).map((t) => (
                  <div key={t.symbol} className="flex items-center justify-between group cursor-pointer" onClick={() => setFromToken(t)}>
                    <div className="flex items-center gap-3">
                      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm border border-white/5", t.color)}>
                        {t.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{t.symbol}</span>
                        <span className="text-[10px] text-neutral-600">v2 SDK Pool</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-white tracking-widest">{t.balance}</div>
                      <div className="text-[9px] text-neutral-600 font-mono">${(parseFloat(t.balance.replace(",","")) * t.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Info size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">SDK Insight</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                StarkZap v2 hooks are now active. All swaps on this domain are gas-sponsored for authorized developers.
              </p>
            </div>
          </div>

          {/* CENTER: MODULE WORKSPACE */}
          <div className="col-span-6">
            <AnimatePresence mode="wait">
              {activeTab === "swap" && (
                <motion.div 
                  key="swap-ui"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <Card className="p-8 relative group">
                    <div className="absolute top-0 right-0 p-8">
                       <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-600">
                         <RefreshCw size={16} />
                       </div>
                    </div>
                    
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold tracking-tight text-white">Unified Swap</h2>
                      <p className="text-sm text-neutral-500">Instant liquidity via StarkZap V2 Aggregator</p>
                    </div>

                    <div className="space-y-2">
                       {/* SELL INPUT */}
                       <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-500">Sell</span>
                            <span className="text-[10px] font-mono text-neutral-600">Balance: {fromToken.balance}</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <input 
                               type="number"
                               placeholder="0.0" 
                               value={amount}
                               onChange={(e) => setAmount(e.target.value)}
                               className="bg-transparent text-3xl font-bold text-white outline-none w-1/2 placeholder:text-neutral-800"
                             />
                             <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-bold group">
                                <span className="text-lg">{fromToken.icon}</span>
                                <span className="text-sm">{fromToken.symbol}</span>
                                <ChevronDown size={14} className="text-neutral-600 group-hover:text-white" />
                             </button>
                          </div>
                       </div>

                       {/* MID ICON */}
                       <div className="flex justify-center -my-3 relative z-10">
                          <button 
                            className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-amber-500 hover:rotate-180 transition-all duration-500 shadow-xl"
                            onClick={() => {
                               const temp = fromToken;
                               setFromToken(toToken);
                               setToToken(temp);
                            }}
                          >
                             <ArrowRightLeft size={20} />
                          </button>
                       </div>

                       {/* BUY INPUT */}
                       <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800/50 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-500">Buy</span>
                            <span className="text-[10px] font-mono text-neutral-600">Est. Arrival</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <div className={clsx("text-3xl font-bold transition-all", isLoadingQuote ? "text-white/20 animate-pulse" : "text-white/50")}>
                               {estimatedValue}
                             </div>
                             <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-bold">
                                <span className="text-lg">{toToken.icon}</span>
                                <span className="text-sm">{toToken.symbol}</span>
                                <ChevronDown size={14} className="text-neutral-600" />
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="mt-8 space-y-4">
                       <div className="flex items-center justify-between px-2">
                          <span className="text-xs text-neutral-600">Rate</span>
                          <span className="text-xs font-mono text-neutral-400">1 {fromToken.symbol} ≈ {(fromToken.price / toToken.price).toFixed(4)} {toToken.symbol}</span>
                       </div>
                       
                       <button 
                         disabled={!amount || isSwapping}
                         onClick={handleSwap}
                         className="w-full h-16 rounded-3xl bg-amber-500 disabled:opacity-30 disabled:grayscale hover:bg-amber-400 text-black font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-amber-500/10"
                       >
                          {isSwapping ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                          {isSwapping ? "Routing via StarkZap..." : "Exchange Assets"}
                       </button>
                    </div>
                  </Card>

                  {/* PRICE FEED GRID */}
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-6 flex items-center gap-4">
                       <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                          <TrendingUp size={24} />
                       </div>
                       <div>
                          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Market Status</div>
                          <div className="text-lg font-bold text-emerald-500">+4.2% Bulk Liquidity</div>
                       </div>
                    </Card>
                    <Card className="p-6 flex items-center gap-4">
                       <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                          <Zap size={24} />
                       </div>
                       <div>
                          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Execution Speed</div>
                          <div className="text-lg font-bold text-white">~350ms SDK Sync</div>
                       </div>
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "stake" && (
                <motion.div 
                   key="stake-ui"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="space-y-6"
                >
                   <div className="flex items-end justify-between">
                      <div>
                        <h2 className="text-3xl font-bold tracking-tighter text-white">Yield Vaults</h2>
                        <p className="text-neutral-500">Native Starknet rewards via specialized StarkZap pools.</p>
                      </div>
                      <button className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all">
                        My Portfolio
                      </button>
                   </div>

                   <div className="grid gap-4">
                      {POOLS.map((pool) => (
                        <Card key={pool.id} className="p-8 group hover:border-amber-500/30 transition-all cursor-pointer">
                           <div className="flex items-center gap-8">
                              <div className="w-16 h-16 rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-500 shadow-inner group-hover:scale-105 transition-all">
                                <pool.icon size={32} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xl font-bold text-white">{pool.token} Native Staking</h3>
                                  {pool.status === "hot" && <span className="px-2 py-0.5 rounded-full bg-orange-500 text-[8px] font-black text-black uppercase">Trending</span>}
                                  {pool.status === "new" && <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[8px] font-black text-black uppercase">Low Fee</span>}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-neutral-500">
                                   <span className="flex items-center gap-1"><Coins size={12} /> Total TVL: {pool.tvl}</span>
                                   <span className="flex items-center gap-1"><ShieldCheck size={12} /> Audited Pool</span>
                                </div>
                              </div>
                              <div className="text-right pr-6">
                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Current APR</div>
                                <div className="text-4xl font-black text-white tracking-tighter group-hover:text-amber-500 transition-colors">{pool.apr}</div>
                              </div>
                              <button 
                                onClick={() => handleStake(pool)}
                                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-amber-500 hover:text-black transition-all"
                              >
                                <Plus size={24} />
                              </button>
                           </div>
                        </Card>
                      ))}
                   </div>
                </motion.div>
              )}

              {activeTab === "bridge" && (
                <motion.div 
                   key="bridge-ui"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -20 }}
                   className="space-y-8"
                >
                   <Card className="p-12 text-center space-y-6 bg-gradient-to-br from-amber-500/10 to-transparent">
                      <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-500">
                         <Globe size={48} />
                      </div>
                      <div className="max-w-md mx-auto space-y-4">
                        <h2 className="text-4xl font-bold tracking-tighter text-white">BTC Fluidity Portal</h2>
                        <p className="text-neutral-400 leading-relaxed">
                          The StarkZap Bitcoin Module enables native $BTC liquidity to flow directly into Starknet without centralized custodians. Connect your Bitcoin wallet to fuel your Starknet development.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-4">
                         <button className="px-8 py-4 rounded-3xl bg-amber-500 text-black font-bold uppercase tracking-widest text-xs hover:bg-amber-400 transition-all">
                           Connect Bitcoin Wallet
                         </button>
                         <button className="px-8 py-4 rounded-3xl bg-neutral-900 border border-neutral-800 text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all flex items-center gap-2">
                           View Protocol <ExternalLink size={14} />
                         </button>
                      </div>
                   </Card>

                   <div className="grid grid-cols-3 gap-6">
                      {[ 
                        { label: "Bridge Garden", desc: "Atom-swaps BTC/STRK" },
                        { label: "Atomiq Portal", desc: "Native BTC → wBTC" },
                        { label: "Lightning", desc: "Instant Micro-deposits" }
                      ].map((item, i) => (
                        <Card key={i} className="p-6 space-y-2 hover:border-neutral-700 transition-all group">
                           <div className="text-xs font-bold text-white group-hover:text-amber-500 transition-colors uppercase tracking-widest">{item.label}</div>
                           <p className="text-[10px] text-neutral-600 italic leading-relaxed">{item.desc}</p>
                        </Card>
                      ))}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: HISTORY & DATA */}
          <div className="col-span-3 space-y-8">
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">StarkZap Stream</span>
                  <Activity size={14} className="text-neutral-700" />
               </div>
               
               <div className="space-y-4">
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                            <div className={clsx(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] border border-white/5",
                              log.status === "success" ? "bg-emerald-500/10 text-emerald-500" : 
                              log.status === "pending" ? "bg-amber-500/10 text-amber-500" :
                              log.status === "warning" ? "bg-orange-500/10 text-orange-500" :
                              "bg-red-500/10 text-red-500"
                            )}>
                              {log.type === "swap" && <ArrowRightLeft size={10} />}
                              {log.type === "stake" && <Lock size={10} />}
                              {log.type === "bridge" && <Globe size={10} />}
                              {log.type === "onboard" && <Zap size={10} />}
                            </div>
                            {i < logs.length - 1 && <div className="w-px h-full bg-neutral-900 my-2" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-[11px] text-neutral-300 font-medium group-hover:text-white transition-colors leading-relaxed">{log.desc}</p>
                            <div className="flex items-center justify-between text-[9px] text-neutral-600 uppercase tracking-widest font-mono">
                              <span>{log.time}</span>
                              <span className={clsx(
                                log.status === "success" ? "text-emerald-500" : 
                                log.status === "pending" ? "text-amber-500" : 
                                log.status === "warning" ? "text-orange-500" :
                                "text-red-500"
                              )}>{log.status}</span>
                            </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-2">
                       <Activity size={24} className="mx-auto text-neutral-800" />
                       <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">No Activity Detected</p>
                    </div>
                  )}
               </div>
            </div>

            <Card className="p-8 bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/20">
               <div className="space-y-6">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 w-fit text-emerald-500">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">Trustless Ops</h4>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      All DeFi modules are non-custodial. Your keys never leave the StarkZap secure enclave.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">
                    Verified by Starknet
                  </div>
               </div>
            </Card>

            <div className="flex items-center justify-center gap-6 text-neutral-700">
               <Activity size={16} />
               <DollarSign size={16} />
               <History size={16} />
            </div>
          </div>

        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #333;
        }
      `}</style>
    </div>
  );
}
