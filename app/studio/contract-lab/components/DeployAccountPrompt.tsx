import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Shield, X } from "lucide-react";
import { clsx } from "clsx";

interface DeployAccountPromptProps {
  isOpen: boolean;
  onClose: () => void;
  networkLabel: string;
  isDeployingAccount: boolean;
  onDeployAccount: () => void;
}

export function DeployAccountPrompt({
  isOpen,
  onClose,
  networkLabel,
  isDeployingAccount,
  onDeployAccount,
}: DeployAccountPromptProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-[3px] z-[90]"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-sm"
          >
            <div className="rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Account Not Deployed</h2>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-4 h-4 text-neutral-600" />
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mb-6 leading-relaxed">
                Your wallet is connected but the account contract hasn&apos;t been deployed on {networkLabel} yet. You need to deploy it once before you can sign transactions.
              </p>
              <p className="text-[10px] text-amber-500/80 mb-6 leading-relaxed">
                Make sure your wallet has enough STRK/ETH on {networkLabel} to cover the deployment fee.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-700 text-neutral-400 font-bold text-[11px] uppercase tracking-widest hover:border-neutral-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={onDeployAccount}
                  disabled={isDeployingAccount}
                  className={clsx(
                    "flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px] uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  )}
                >
                  {isDeployingAccount ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deploying...</> : "Deploy Account"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
