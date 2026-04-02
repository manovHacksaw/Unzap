import type { ReactNode } from "react";
import { AlertCircle, ChevronRight, Globe, Shield, Sparkles, Wallet } from "lucide-react";
import { clsx } from "clsx";

interface AuthModalProps {
  authenticated: boolean;
  isConnecting: boolean;
  walletError: string | null;
  onPrivyConnect: () => void;
  onExtensionConnect: () => void;
  onClose: () => void;
  networkLabel: string;
}

interface OptionCardProps {
  title: string;
  description: string;
  badges: string[];
  icon: ReactNode;
  accent: "amber" | "sky";
  disabled: boolean;
  recommended?: boolean;
  onClick: () => void;
  cta: string;
}

function OptionCard({
  title,
  description,
  badges,
  icon,
  accent,
  disabled,
  recommended = false,
  onClick,
  cta,
}: OptionCardProps) {
  const accentClasses = accent === "amber"
    ? "border-amber-500/25 hover:border-amber-400/40 hover:bg-amber-500/[0.04]"
    : "border-sky-500/20 hover:border-sky-400/35 hover:bg-sky-500/[0.03]";

  const iconClasses = accent === "amber"
    ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
    : "border-sky-500/25 bg-sky-500/10 text-sky-300";

  const badgeClasses = accent === "amber"
    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
    : "border-sky-500/20 bg-sky-500/10 text-sky-200";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "w-full rounded-2xl border bg-white/[0.02] p-4 text-left transition-colors",
        accentClasses,
        disabled && "cursor-not-allowed opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={clsx("flex size-10 items-center justify-center rounded-xl border", iconClasses)}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              {recommended && (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Recommended
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{description}</p>
          </div>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-600" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className={clsx("rounded-full border px-2 py-1 text-[9px] font-medium text-neutral-200", badgeClasses)}
          >
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
        <span>{cta}</span>
      </div>
    </button>
  );
}

export function AuthModal({
  authenticated,
  isConnecting,
  walletError,
  onPrivyConnect,
  onExtensionConnect,
  onClose,
  networkLabel,
}: AuthModalProps) {
  return (
    <div className="rounded-[22px] border border-neutral-800 bg-[#0b0b0c] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.65)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Connect Wallet</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Choose how you want to sign</h2>
          <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-neutral-400">
            Connect on <span className="font-semibold text-neutral-200">{networkLabel}</span> with a gasless Privy session or a self-managed Starknet extension.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border border-neutral-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:border-neutral-700 hover:text-neutral-300"
        >
          Close
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <OptionCard
          title="Privy authentication"
          description={
            authenticated
              ? "Your Privy session is already available. Resume with embedded signing and gasless transactions."
              : "Email, Google, and web2-style onboarding with embedded signing. Best for fast, gasless flows."
          }
          badges={["Gasless", "Web2 UX", "Embedded wallet"]}
          icon={<Sparkles className="h-4 w-4" />}
          accent="amber"
          disabled={isConnecting}
          recommended
          onClick={onPrivyConnect}
          cta={isConnecting ? "Connecting" : authenticated ? "Resume Privy session" : "Use Privy"}
        />

        <OptionCard
          title="Local extension"
          description="Use ArgentX or Braavos and manage the wallet, network, and gas settings yourself."
          badges={["Self-custody", "Manual gas", "Extension managed"]}
          icon={<Wallet className="h-4 w-4" />}
          accent="sky"
          disabled={isConnecting}
          onClick={onExtensionConnect}
          cta={isConnecting ? "Connecting" : "Use extension"}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-800 bg-black/20 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          <Shield className="h-3.5 w-3.5 text-neutral-500" />
          Signing modes
        </div>
        <div className="mt-2 grid gap-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Privy unlocks gasless transactions and simpler recovery.</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-sky-300" />
            <span>Extensions keep everything in your own wallet environment.</span>
          </div>
        </div>
      </div>

      {walletError && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">Connection failed</p>
            <p className="mt-1 text-[11px] leading-relaxed text-red-200/80">{walletError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
