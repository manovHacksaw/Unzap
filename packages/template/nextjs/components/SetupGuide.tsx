'use client';

import { Sparkles, ExternalLink } from 'lucide-react';

const steps = [
  {
    n: 1,
    label: 'RPC Endpoint',
    accentClass: 'group-hover/item:border-amber-500/50 group-hover/item:text-amber-500',
    description: (
      <>
        Get a free Starknet Sepolia key from{' '}
        <a
          href="https://dashboard.alchemy.com/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
        >
          Alchemy <ExternalLink size={9} />
        </a>
        {' '}(or{' '}
        <a
          href="https://app.infura.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors"
        >
          Infura <ExternalLink size={9} />
        </a>
        ), then set{' '}
        <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 group-hover/item:border-zinc-700">
          NEXT_PUBLIC_RPC_URL
        </code>{' '}
        in <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">.env.local</code>.
      </>
    ),
  },
  {
    n: 2,
    label: 'Privy Auth',
    accentClass: 'group-hover/item:border-orange-500/50 group-hover/item:text-orange-500',
    description: (
      <>
        Set{' '}
        <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 group-hover/item:border-zinc-700">
          NEXT_PUBLIC_PRIVY_APP_ID
        </code>{' '}
        to enable gasless email &amp; social logins.
      </>
    ),
  },
  {
    n: 3,
    label: 'AVNU Paymaster',
    accentClass: 'group-hover/item:border-emerald-500/50 group-hover/item:text-emerald-500',
    description: (
      <>
        Configure{' '}
        <code className="text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 group-hover/item:border-zinc-700">
          NEXT_PUBLIC_AVNU_API_KEY
        </code>{' '}
        to sponsor user transaction fees.
      </>
    ),
  },
];

export function SetupGuide() {
  return (
    <div className="glass-panel p-8 space-y-8 hover:border-zinc-700 transition-all duration-500 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Sparkles size={14} className="text-orange-500 animate-pulse" />
        </div>
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-300">
          Environment Setup
        </h2>
      </div>

      <div className="space-y-6">
        {steps.map(({ n, label, accentClass, description }) => (
          <div key={n} className="space-y-3 group/item">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-500 transition-all ${accentClass}`}>
                {n}
              </div>
              <p className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest group-hover/item:text-white transition-colors">
                {label}
              </p>
            </div>
            <p className="text-[11px] text-zinc-600 leading-relaxed font-medium">
              {description}
            </p>
          </div>
        ))}
      </div>

      <a
        href="https://dashboard.alchemy.com/apps"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between w-full h-12 px-6 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl transition-all group shadow-lg shadow-amber-500/10 active:scale-[0.98]"
      >
        <span className="text-[10px] font-black uppercase tracking-widest">Get Alchemy API Key</span>
        <div className="w-6 h-6 rounded-lg bg-black/10 flex items-center justify-center group-hover:bg-black/15 transition-colors">
          <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </a>
    </div>
  );
}
