import { useState, useEffect, useCallback } from "react";
import type { HistoryData, TransactionData, DeploymentData } from "../types";

interface UseHistoryProps {
  privyReady: boolean;
  authenticated: boolean;
  getAccessToken: () => Promise<string | null>;
}

export function useHistory({ privyReady, authenticated, getAccessToken }: UseHistoryProps) {
  const [history, setHistory] = useState<HistoryData>({ deployments: [], transactions: [] });

  // Fetch history on auth & sync with cache
  useEffect(() => {
    const loadHistory = async () => {
      const cached = localStorage.getItem("unzap:history");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.deployments || parsed.transactions) setHistory(parsed);
        } catch {
          /* ignore bad cache */
        }
      }

      if (privyReady && authenticated) {
        try {
          const token = await getAccessToken();
          const res = await fetch("/api/history", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setHistory(data);
            localStorage.setItem("unzap:history", JSON.stringify(data));
          }
        } catch (e) {
          console.error("Failed to sync history:", e);
        }
      }
    };
    loadHistory();
  }, [authenticated, getAccessToken, privyReady]);

  const refreshHistory = useCallback(async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      const hRes = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (hRes.ok) {
        const data = await hRes.json();
        setHistory(data);
        localStorage.setItem("unzap:history", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to refresh history:", e);
    }
  }, [authenticated, getAccessToken]);

  const logTransaction = useCallback(
    async (data: TransactionData) => {
      if (!authenticated) return;
      try {
        const token = await getAccessToken();
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: "transaction", data }),
        });
        await refreshHistory();
      } catch (e) {
        console.error("Log transaction error:", e);
      }
    },
    [authenticated, getAccessToken, refreshHistory]
  );

  const logDeployment = useCallback(
    async (data: DeploymentData) => {
      if (!authenticated) return;
      try {
        const token = await getAccessToken();
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: "deployment", data }),
        });
        await refreshHistory();
      } catch (e) {
        console.error("Log deployment error:", e);
      }
    },
    [authenticated, getAccessToken, refreshHistory]
  );

  return { history, setHistory, logTransaction, logDeployment };
}
