'use client';

import { Rocket } from 'lucide-react';
import { WalletBar } from './WalletBar';
import { NETWORK_LABEL } from '@/lib/contract';

interface HeaderProps {
  contractName: string;
}

export function Header({ contractName }: HeaderProps) {
  return (
    <header className="h-20 border-b border-zinc-900 bg-black/60 backdrop-blur-2xl sticky top-0 z-50 flex items-center justify-between px-8 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-4 group/header cursor-pointer">
        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0 shadow-xl shadow-zinc-100/10 group-hover/header:scale-110 group-hover/header:rotate-3 transition-all duration-300">
          <Rocket size={20} className="text-black" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-black text-white tracking-tight leading-none uppercase group-hover/header:text-emerald-400 transition-colors">
            {contractName}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
              {NETWORK_LABEL}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-zinc-500 mr-4">
          <a
            href="https://unzap.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            Docs
          </a>
          <a
            href="https://github.com/manovHacksaw/Unzap"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            GitHub
          </a>
        </div>
        <WalletBar />
      </div>
    </header>
  );
}
