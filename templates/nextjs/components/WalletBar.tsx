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
          className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 pl-4 pr-3 py-2 rounded-2xl transition-all group"
        >
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-[0.15em] font-black text-zinc-500 leading-none mb-1">
              {walletType === 'privy' ? 'Privy' : 'Extension'}
            </span>
            <span className="font-mono text-xs text-zinc-300">
              {address.slice(0, 6)}&hellip;{address.slice(-4)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {open && (
           <div className="absolute top-full right-0 mt-3 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-50">
             <button
              onClick={() => {
                navigator.clipboard.writeText(address);
                setCopied(true);
                setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
              }}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-zinc-900 transition-colors text-zinc-300 text-xs font-bold uppercase tracking-widest border-b border-zinc-900"
            >
              <div className="flex items-center gap-3">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Address'}
              </div>
            </button>

             <button
              onClick={() => { setOpen(false); disconnect(); }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-zinc-900 transition-colors text-red-400 text-xs font-bold uppercase tracking-widest"
            >
              <LogOut size={14} /> Disconnect
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
        className="bg-zinc-100 hover:bg-white text-black px-6 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-white/5 disabled:opacity-50 flex items-center gap-2 group"
      >
        {isConnecting ? (
          'Connecting...'
        ) : (
          <>
            Connect <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-72 bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-50">
          <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Select Provider</p>
          </div>

          <div className="p-2 space-y-1">
            <button
              onClick={() => handleConnect('extension')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-zinc-900 rounded-2xl transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-all">
                <Wallet size={18} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Browser Extension</p>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">Argent X or Braavos</p>
              </div>
            </button>

            {PRIVY_ENABLED ? (
              <button
                onClick={() => handleConnect('privy')}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-zinc-900 rounded-2xl transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:border-orange-500/40 transition-all">
                  <Zap size={18} className="text-orange-500" fill="currentColor" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Privy Social</p>
                  <p className="text-[10px] text-orange-500 mt-0.5 font-bold">Email / Google · Gasless</p>
                </div>
              </button>
            ) : (
              <div className="px-4 py-4 bg-zinc-900/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-4 opacity-40 grayscale">
                   <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Zap size={18} className="text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide">Privy Social</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5 uppercase tracking-tighter font-black">Not Configured</p>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 leading-normal font-mono px-1">
                  Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local to enable email login.
                </p>
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
