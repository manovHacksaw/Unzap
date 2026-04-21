'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { NETWORK_LABEL, CONTRACT_ADDRESS } from '@/lib/contract';
import { WRITE_FUNCTIONS, READ_FUNCTIONS, toTitle } from '@/lib/contractFunctions';
import { Database, Shield, ExternalLink, Copy, Check, Wallet, ArrowRight } from 'lucide-react';
import { useWallet } from '@/hooks/wallet';

interface OverviewProps {
  contractName: string;
}

export function Overview({ contractName }: OverviewProps) {
  const { address, connect, isConnecting } = useWallet();
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-zinc-950/30 border border-zinc-900 rounded-[2.5rem] p-10 flex flex-col lg:flex-row gap-12 items-start justify-between relative overflow-hidden group hover:border-zinc-800 transition-all duration-500 shadow-2xl shadow-black/50">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000" />
      
      <div className="space-y-6 relative flex-1">
        <div className="inline-flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-full">
          <Shield size={10} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">
            Secure Starknet Protocol
          </span>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tight text-white leading-tight">
            Managing <span className="text-zinc-500">{toTitle(contractName)}</span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-xl leading-relaxed">
            Interact with the contract logic below. Unzap has automatically indexed 
            <span className="text-zinc-300 font-bold mx-1">{WRITE_FUNCTIONS.length} writes</span> 
            and 
            <span className="text-zinc-300 font-bold mx-1">{READ_FUNCTIONS.length} reads</span>. 
            {address ? (
              <span className="text-emerald-500/80 font-medium"> Wallet connected and ready for execution.</span>
            ) : (
              <span className="text-zinc-400"> Connect your wallet to begin signing transactions.</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
           <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-900/50 px-5 py-3 rounded-2xl shadow-inner group/status hover:border-emerald-500/30 transition-all cursor-default">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Protocol</span>
                <span className="text-xs font-bold text-zinc-300 mt-1.5 group-hover/status:text-emerald-400 transition-colors">{NETWORK_LABEL}</span>
              </div>
           </div>
           
           <button 
             onClick={handleCopy}
             className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-900/50 px-5 py-3 rounded-2xl group/addr hover:bg-zinc-900/60 hover:border-zinc-700 transition-all active:scale-[0.98] shadow-inner"
             title="Click to copy contract address"
           >
              <Database size={16} className="text-zinc-600 group-hover/addr:text-zinc-400 transition-colors" />
              <div className="flex flex-col items-start text-left">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Contract</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-mono text-zinc-400 group-hover/addr:text-zinc-200 transition-colors">
                    {CONTRACT_ADDRESS.slice(0, 8)}…{CONTRACT_ADDRESS.slice(-6)}
                  </span>
                  {copied ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="text-zinc-600 group-hover/addr:text-zinc-400 transition-colors" />
                  )}
                </div>
              </div>
           </button>
        </div>
      </div>

      <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-4 relative z-20">
        {!address ? (
          <button
            onClick={() => connect('extension')}
            disabled={isConnecting}
            className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-[0.95] shadow-xl shadow-emerald-500/20 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : (
              <>
                Connect Wallet <Wallet size={16} />
              </>
            )}
          </button>
        ) : (
          <div className="h-14 px-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest cursor-default">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Wallet Ready
          </div>
        )}
        <a
          href="https://unzap.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="h-14 px-8 bg-zinc-100 hover:bg-white text-black rounded-2xl flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-zinc-100/5"
        >
          Documentation <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
