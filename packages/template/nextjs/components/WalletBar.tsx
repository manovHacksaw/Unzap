'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, ChevronDown, LogOut, Wallet, Shield, Copy, Check } from 'lucide-react';
import { useWallet } from '@/hooks/wallet';

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function WalletBar() {
  const { address, connect, disconnect, isConnecting, walletType, error } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleConnect = (method: 'extension' | 'privy') => {
    setOpen(false);
    connect(method);
  };

  if (address) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/30 pl-4 pr-3 py-2 rounded-2xl transition-all group shadow-inner hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]"
        >
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-zinc-500 leading-none mb-1.5 group-hover:text-emerald-500/70 transition-colors">
              {walletType === 'privy' ? 'Privy Auth' : 'Extension'}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-mono text-xs font-bold text-zinc-300">
                {address.slice(0, 6)}&hellip;{address.slice(-4)}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
            <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {open && (
           <div className="absolute top-full right-0 mt-3 w-48 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-50 animate-slide-in">
             <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
                } catch (err) {
                  console.error('Wallet copy failed:', err);
                }
              }}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-900 transition-colors text-zinc-300 text-[10px] font-black uppercase tracking-widest border-b border-zinc-900 group/link"
            >
              <div className="flex items-center gap-3">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="group-hover/link:text-emerald-500 transition-colors" />}
                {copied ? 'Copied!' : 'Copy Address'}
              </div>
            </button>

             <button
              onClick={() => { setOpen(false); disconnect(); }}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-colors text-red-400 text-[10px] font-black uppercase tracking-widest group/link"
            >
              <LogOut size={14} className="group-hover/link:translate-x-1 transition-transform" /> Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isConnecting}
        className="bg-zinc-100 hover:bg-white text-black px-8 h-12 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.05] active:scale-[0.95] shadow-xl shadow-zinc-100/10 disabled:opacity-50 flex items-center gap-3 group"
      >
        {isConnecting ? (
          <>
            <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            Connecting
          </>
        ) : (
          <>
             Connect <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-72 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-50 animate-slide-in">
          <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Secure Entry Point</p>
          </div>

          <div className="p-3 space-y-1.5">
            <button
              onClick={() => handleConnect('extension')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-zinc-900 rounded-2xl transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-all shadow-inner">
                <Wallet size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-200 uppercase tracking-widest leading-none">Browser Wallet</p>
                <p className="text-[10px] text-zinc-600 mt-2 font-bold uppercase tracking-tighter">Argent X / Braavos</p>
              </div>
            </button>

            {PRIVY_ENABLED ? (
              <button
                onClick={() => handleConnect('privy')}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-zinc-900 rounded-2xl transition-all text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-500/40 transition-all shadow-inner">
                  <Zap size={18} className="text-emerald-500" fill="currentColor" />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest leading-none">Connect Social</p>
                  <p className="text-[10px] text-emerald-500 mt-2 font-black uppercase tracking-tighter">Email / Google · Gasless</p>
                </div>
              </button>
            ) : (
              <div className="px-5 py-5 bg-zinc-900/30 rounded-2xl border border-zinc-900/50 space-y-3">
                <div className="flex items-center gap-4 opacity-40 grayscale">
                   <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Zap size={18} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-600 uppercase tracking-widest leading-none">Privy Social</p>
                    <p className="text-[9px] text-zinc-700 mt-2 font-black">PROVIDER NOT LINKED</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-500/5 border-t border-red-500/10 text-[10px] text-red-400 font-mono leading-relaxed">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
