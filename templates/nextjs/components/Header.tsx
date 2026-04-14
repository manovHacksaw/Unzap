'use client';

import { Rocket } from 'lucide-react';
import { WalletBar } from './WalletBar';
import { NETWORK_LABEL } from '@/lib/contract';

interface HeaderProps {
  contractName: string;
}

export function Header({ contractName }: HeaderProps) {
  return (
    <header className="h-20 border-b border-zinc-900 bg-black/50 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-white/5">
          <Rocket size={20} className="text-black" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-bold text-zinc-100 tracking-tight leading-none uppercase">
            {contractName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
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
