import { useState, useCallback } from "react";
import type { StudioToast, StudioToastInput } from "../types";

export function useToasts() {
  const [toasts, setToasts] = useState<StudioToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: StudioToastInput) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextToast: StudioToast = {
      id,
      title: toast.title,
      description: toast.description,
      tone: toast.tone ?? "info",
    };

    setToasts([nextToast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== id));
    }, 3600);
  }, []);

  return { toasts, dismissToast, pushToast };
}
