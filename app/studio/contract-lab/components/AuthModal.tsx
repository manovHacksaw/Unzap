import type { ReactNode } from "react";
import { AlertCircle, ChevronRight, Laptop } from "lucide-react";
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

interface ChoiceRowProps {
  title: string;
  description: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}

const PrivyLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="9" r="8" />
    <ellipse cx="12" cy="21" rx="5" ry="1.5" />
  </svg>
);

function ChoiceRow({ title, description, icon, disabled, onClick }: ChoiceRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "group w-full rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-left transition-all hover:bg-neutral-800/80 active:scale-[0.98]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-400 group-hover:border-neutral-600 group-hover:text-white transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-white tracking-tight text-left leading-none">{title}</h3>
            <p className="text-[11px] text-neutral-500 mt-1 text-left">{description}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
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
    <div className="w-[380px] overflow-hidden rounded-[24px] border border-neutral-800 bg-[#09090b] shadow-2xl">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="text-left">
            <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-neutral-500">Account Access</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Choose signing method</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-800/50 px-2.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <ChoiceRow
            title="Smarter Wallet (Privy)"
            description={authenticated ? "Resume session" : "Gasless, social, or email sign-in"}
            icon={<PrivyLogo className="h-5 w-5" />}
            disabled={isConnecting}
            onClick={onPrivyConnect}
          />

          <ChoiceRow
            title="Browser Extension"
            description="ArgentX, Braavos, or Metamask"
            icon={<Laptop className="h-4 w-4" />}
            disabled={isConnecting}
            onClick={onExtensionConnect}
          />
        </div>

        {walletError && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
            <div className="text-[11px] leading-relaxed text-red-400/90 font-medium text-left">
              {walletError}
            </div>
          </div>
        )}
      </div>

      <div className="bg-neutral-900/50 border-t border-neutral-800 px-6 py-4 flex flex-col items-center">
        <p className="text-[10px] text-neutral-500 text-center leading-relaxed max-w-[280px]">
          Operating on <span className="text-neutral-300 font-medium">{networkLabel}</span>. By connecting, you agree to our developer guidelines.
        </p>
      </div>
    </div>
  );
}
