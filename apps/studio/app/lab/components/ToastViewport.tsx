"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { clsx } from "clsx";
import type { StudioToast } from "../types";

interface ToastViewportProps {
  toasts: StudioToast[];
  onDismiss: (id: string) => void;
}

const toneStyles = {
  success: {
    accent: "bg-emerald-500",
    title: "text-neutral-100",
    body: "text-neutral-400",
    close: "text-neutral-500 hover:text-neutral-200",
  },
  error: {
    accent: "bg-red-500",
    title: "text-neutral-100",
    body: "text-neutral-400",
    close: "text-neutral-500 hover:text-neutral-200",
  },
  warning: {
    accent: "bg-amber-500",
    title: "text-neutral-100",
    body: "text-neutral-400",
    close: "text-neutral-500 hover:text-neutral-200",
  },
  info: {
    accent: "bg-sky-500",
    title: "text-neutral-100",
    body: "text-neutral-400",
    close: "text-neutral-500 hover:text-neutral-200",
  },
} as const;

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-[140] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-auto overflow-hidden rounded-xl border border-neutral-800 bg-[#0b0b0c]/95 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              <div className={clsx("h-px w-full opacity-80", styles.accent)} />
              <div className="flex items-start gap-3 p-3.5">
                <div className={clsx("mt-1.5 h-2 w-2 flex-shrink-0 rounded-full", styles.accent)} />

                <div className="min-w-0 flex-1">
                  <p className={clsx("text-[11px] font-semibold tracking-[0.01em]", styles.title)}>{toast.title}</p>
                  {toast.description && (
                    <p className={clsx("mt-1 text-[10px] leading-relaxed", styles.body)}>{toast.description}</p>
                  )}
                </div>

                <button
                  onClick={() => onDismiss(toast.id)}
                  className={clsx("rounded-md p-1 transition-colors", styles.close)}
                  aria-label="Dismiss toast"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
