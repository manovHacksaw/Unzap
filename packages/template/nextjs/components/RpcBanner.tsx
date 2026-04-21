'use client';

import { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

const MISSING_RPC   = !process.env.NEXT_PUBLIC_RPC_URL;
const MISSING_PRIVY = !process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const MISSING_AVNU  = !process.env.NEXT_PUBLIC_AVNU_API_KEY;

interface BannerProps {
  children: React.ReactNode;
  onDismiss: () => void;
}

function Banner({ children, onDismiss }: BannerProps) {
  return (
    <div className="w-full border-b border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-8 py-2.5 flex items-center gap-3">
        <AlertTriangle size={13} className="text-amber-400 shrink-0" />
        <p className="text-[11px] text-amber-300/80 font-medium flex-1">{children}</p>
        <button
          onClick={onDismiss}
          className="text-amber-500/50 hover:text-amber-400 transition-colors shrink-0 p-0.5"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function Var({ name }: { name: string }) {
  return (
    <code className="text-amber-200 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/20">
      {name}
    </code>
  );
}

function EnvFile() {
  return <Var name=".env.local" />;
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-amber-400 font-bold hover:text-amber-300 underline underline-offset-2 transition-colors"
    >
      {children} <ExternalLink size={10} />
    </a>
  );
}

export function RpcBanner() {
  const [dismissed, setDismissed] = useState({ rpc: false, privy: false, avnu: false });
  const dismiss = (key: keyof typeof dismissed) =>
    setDismissed((d) => ({ ...d, [key]: true }));

  const show = {
    rpc:   MISSING_RPC   && !dismissed.rpc,
    privy: MISSING_PRIVY && !dismissed.privy,
    avnu:  MISSING_AVNU  && !dismissed.avnu,
  };

  if (!show.rpc && !show.privy && !show.avnu) return null;

  return (
    <div className="sticky top-20 z-40">
      {show.rpc && (
        <Banner onDismiss={() => dismiss('rpc')}>
          Using a public RPC — may be slow or rate-limited.{' '}
          <Link href="https://dashboard.alchemy.com/apps">Get a free Alchemy key</Link>
          {' '}and set <Var name="NEXT_PUBLIC_RPC_URL" /> in <EnvFile />.
        </Banner>
      )}
      {show.privy && (
        <Banner onDismiss={() => dismiss('privy')}>
          Social &amp; email login disabled.{' '}
          <Link href="https://dashboard.privy.io">Create a free Privy app</Link>
          {' '}and set <Var name="NEXT_PUBLIC_PRIVY_APP_ID" /> in <EnvFile />.
          {' '}Both Privy and AVNU are required for gasless transactions.
        </Banner>
      )}
      {show.avnu && (
        <Banner onDismiss={() => dismiss('avnu')}>
          Gas sponsorship disabled — users will pay transaction fees.{' '}
          <Link href="https://app.avnu.fi/en/paymaster">Get an AVNU Paymaster key</Link>
          {' '}and set <Var name="NEXT_PUBLIC_AVNU_API_KEY" /> in <EnvFile />.
          {' '}Both Privy and AVNU are required for gasless transactions.
        </Banner>
      )}
    </div>
  );
}
