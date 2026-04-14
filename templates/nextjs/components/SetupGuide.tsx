'use client';

import { Shield, Sparkles, ExternalLink } from 'lucide-react';

export function SetupGuide() {
  return (
    <div className="bg-zinc-950/20 border border-zinc-900 rounded-[2.5rem] p-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Sparkles size={14} className="text-orange-500" />
        </div>
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-300">
          Environment Setup
        </h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-500">1</div>
            <p className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">Privy Auth</p>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
            Set <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded">NEXT_PUBLIC_PRIVY_APP_ID</code> to enable gasless email & social logins.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-500">2</div>
            <p className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">AVNU Paymaster</p>
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
            Configure <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded">NEXT_PUBLIC_AVNU_API_KEY</code> to sponsor user transaction fees.
          </p>
        </div>
      </div>

      <a
        href="https://unzap.dev/docs"
        target="_blank"
        className="flex items-center justify-between w-full p-4 bg-zinc-100 hover:bg-white text-black rounded-2xl transition-all group shadow-lg shadow-white/5"
      >
        <span className="text-[10px] font-black uppercase tracking-widest">Full Documentation</span>
        <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>
    </div>
  );
}
