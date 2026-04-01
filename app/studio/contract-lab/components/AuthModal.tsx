import { AlertCircle, ChevronRight, Globe, Sparkles, Zap } from "lucide-react";

interface AuthModalProps {
  authenticated: boolean;
  isConnecting: boolean;
  walletError: string | null;
  onPrivyConnect: () => void;
  onExtensionConnect: () => void;
  onClose: () => void;
  networkLabel: string;
}

export function AuthModal({
  isConnecting,
  walletError,
  onPrivyConnect,
  onExtensionConnect,
  onClose,
  networkLabel,
}: AuthModalProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-neutral-800 bg-[#080808] p-1 shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px]" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/5 blur-[100px]" />

      <div className="relative p-8 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/50 flex items-center justify-center mb-6 shadow-2xl">
          <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight text-center">Identity Layer</h2>
        <p className="text-[12px] text-neutral-500 mt-2 text-center max-w-[280px]">
          Connect your Starknet identity to sign transactions on <span className="text-neutral-300 font-bold">{networkLabel}</span>
        </p>

        <div className="w-full grid grid-cols-1 gap-4 mt-10">
          <button
            onClick={onPrivyConnect}
            disabled={isConnecting}
            className="group relative flex flex-col p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800 hover:border-amber-500/30 transition-all duration-300 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-sm font-bold text-white">Cloud Authentication</span>
              </div>
              <div className="px-2 py-0.5 rounded-full bg-amber-500 text-[8px] font-black uppercase tracking-widest text-black">
                Fastest
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
              Log in with Email, Google, or Social. No extension needed. Gasless experience powered by AVNU Paymaster.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
              {isConnecting ? "Initiating..." : "Launch Cloud Login"}
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          <button
            onClick={onExtensionConnect}
            disabled={isConnecting}
            className="group flex flex-col p-5 rounded-2xl bg-neutral-950/20 border border-neutral-800 hover:border-neutral-700 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Globe className="w-4 h-4 text-neutral-400" />
              </div>
              <span className="text-sm font-bold text-neutral-300">Local Extensions</span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-medium">
              Use your existing ArgentX or Braavos browser wallet. Best for heavy users.
            </p>
            <div className="mt-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              {isConnecting ? "Polling..." : "Connect Extension"}
            </div>
          </button>
        </div>

        {walletError && (
          <div className="mt-6 w-full p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-3 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Handshake Failed</span>
              <p className="text-[10px] text-red-300/80 leading-tight font-medium">{walletError}</p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-8 text-[11px] font-bold text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
        >
          Nevermind
        </button>
      </div>
    </div>
  );
}
