import { AlertCircle, Check, Copy, ExternalLink, Shield, Zap, Globe, Mail, Fingerprint, Cloud, LogOut } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

interface AccountModalProps {
  address: string;
  walletType: "privy" | "extension";
  mainnetBalance: string | null;
  sepoliaBalance: string | null;
  onDisconnect: () => void;
  onClose: () => void;
}

const PrivyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="9" r="8" />
    <ellipse cx="12" cy="21" rx="5" ry="1.5" />
  </svg>
);

function FeatureItem({ icon: Icon, label, description }: { icon: any, label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-neutral-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-white leading-none">{label}</p>
        <p className="mt-1 text-[10px] text-neutral-500 leading-tight">{description}</p>
      </div>
    </div>
  );
}

export function AccountModal({
  address,
  walletType,
  mainnetBalance,
  sepoliaBalance,
  onDisconnect,
  onClose,
}: AccountModalProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${address.slice(0, 12)}...${address.slice(-8)}`;

  return (
    <div className="w-[420px] overflow-hidden rounded-[24px] border border-neutral-800 bg-[#09090b] shadow-2xl">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-left">
            <div className="flex size-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-white">
              {walletType === "privy" ? <PrivyLogo className="h-6 w-6" /> : <Shield className="h-5 w-5 text-sky-400" />}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Connected via {walletType}</p>
              <h2 className="text-lg font-semibold tracking-tight text-white">Account Details</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
           <button
              onClick={onDisconnect}
              className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Disconnect
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-neutral-800/50 p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Globe className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Address Segment */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Address</span>
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 transition-colors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl border border-neutral-800 bg-black/40 px-4 py-3">
            <p className="font-mono text-[13px] text-neutral-300 select-all">{shortAddress}</p>
            <div className="flex items-center gap-2">
              <a
                href={`https://starkscan.co/contract/${address}`}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-600 hover:text-neutral-400 transition-colors"
                title="View on Starkscan"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Balances Segment */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 text-left">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-1.5">Mainnet Balance</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white font-mono tracking-tight">{mainnetBalance ?? "0.0000"}</span>
              <span className="text-[10px] font-bold text-neutral-600 uppercase">STRK</span>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4 text-left">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-1.5">Sepolia Balance</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-neutral-300 font-mono tracking-tight">{sepoliaBalance ?? "0.0000"}</span>
              <span className="text-[10px] font-bold text-neutral-600 uppercase">STRK</span>
            </div>
          </div>
        </div>

        {/* Features Segment (Privy Highlight) */}
        {walletType === "privy" && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-neutral-800/50" />
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-700">Privy Features</span>
              <div className="h-px flex-1 bg-neutral-800/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FeatureItem
                icon={Zap}
                label="Gasless"
                description="Fees are abstracted away via paymaster."
              />
              <FeatureItem
                icon={Mail}
                label="Social"
                description="Email & Google sign-in methods supported."
              />
              <FeatureItem
                icon={Fingerprint}
                label="Embedded"
                description="Hardware-secure keys stored in the cloud."
              />
              <FeatureItem
                icon={Cloud}
                label="Synced"
                description="Your keys follow you across all devices."
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-neutral-900/50 border-t border-neutral-800 px-6 py-4 flex flex-col items-center">
        <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
          Starknet Studio uses <span className="text-neutral-300 font-medium tracking-tight">Privy Protocol</span> for a high-performance developer signing experience.
        </p>
      </div>
    </div>
  );
}
