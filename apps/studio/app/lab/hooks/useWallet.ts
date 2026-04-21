import { useState, useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { WalletAccount, Account, RpcProvider, type ProviderInterface } from "starknet";
import { StarkZap, OnboardStrategy, accountPresets } from "starkzap";
import { getNetworkConfig, type Network } from "@/lib/network-config";
import {
  CONTRACT_LAB_WALLET_SESSION_KEY,
  STRK_TOKEN,
  type SzWalletType,
  type StudioToastInput,
} from "../types";

interface UseWalletProps {
  network: Network;
  sdkRef: MutableRefObject<StarkZap | null>;
  privyReady: boolean;
  authenticated: boolean;
  getAccessToken: () => Promise<string | null>;
  login: () => void;
  logout: () => void;
  addLog: (log: string) => void;
  pushToast: (toast: StudioToastInput) => void;
}

type WalletConnectOptions = {
  silent?: boolean;
  restore?: boolean;
};

export function useWallet({
  network,
  sdkRef,
  privyReady,
  authenticated,
  getAccessToken,
  login,
  logout,
  addLog,
  pushToast,
}: UseWalletProps) {
  const [szWallet, setSzWallet] = useState<SzWalletType | null>(null);
  const [starknetAccount, setStarknetAccount] = useState<Account | WalletAccount | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletType, setWalletType] = useState<"privy" | "extension" | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [strkBalance, setStrkBalance] = useState<string | null>(null);
  const [mainnetBalance, setMainnetBalance] = useState<string | null>(null);
  const [sepoliaBalance, setSepoliaBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  const walletReconnectAttemptRef = useRef<string | null>(null);

  // --- Session persistence ---
  const persistWalletSession = useCallback((type: "privy" | "extension", address: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        CONTRACT_LAB_WALLET_SESSION_KEY,
        JSON.stringify({ type, address, updatedAt: Date.now() })
      );
    } catch {
      // Ignore storage write failures
    }
  }, []);

  const clearWalletSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(CONTRACT_LAB_WALLET_SESSION_KEY);
    } catch {
      // Ignore storage cleanup failures
    }
  }, []);

  const getStoredWalletSession = useCallback((): { type: "privy" | "extension"; address?: string } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(CONTRACT_LAB_WALLET_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { type?: unknown; address?: unknown };
      if (parsed.type !== "privy" && parsed.type !== "extension") return null;
      return {
        type: parsed.type,
        address: typeof parsed.address === "string" ? parsed.address : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  // --- Balance helpers ---
  const readStrkBalance = useCallback(async (provider: ProviderInterface, address: string) => {
    const result = await provider.callContract({
      contractAddress: STRK_TOKEN,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    const low = BigInt(result[0] ?? "0x0");
    const high = BigInt(result[1] ?? "0x0");
    return low + (high << BigInt(128));
  }, []);

  const formatStrkAmount = useCallback((raw: bigint) => {
    return (Number(raw) / 1e18).toFixed(4);
  }, []);

  const fetchStrkBalance = useCallback(
    async (address: string) => {
      if (!sdkRef.current) return;
      setIsFetchingBalance(true);
      try {
        const provider = sdkRef.current.getProvider();
        const raw = await readStrkBalance(provider, address);
        setStrkBalance(formatStrkAmount(raw));
      } catch {
        setStrkBalance(null);
      } finally {
        setIsFetchingBalance(false);
      }
    },
    [formatStrkAmount, readStrkBalance, sdkRef]
  );

  const fetchDualBalances = useCallback(
    async (address: string) => {
      const mainnetCfg = getNetworkConfig("mainnet");
      const sepoliaCfg = getNetworkConfig("sepolia");
      const mainProvider = new RpcProvider({ nodeUrl: mainnetCfg.rpcUrl });
      const sepProvider = new RpcProvider({ nodeUrl: sepoliaCfg.rpcUrl });

      const fetchBal = async (prov: RpcProvider) => {
        try {
          const raw = await readStrkBalance(prov, address);
          return formatStrkAmount(raw);
        } catch {
          return "0.0000";
        }
      };

      const [main, sep] = await Promise.all([fetchBal(mainProvider), fetchBal(sepProvider)]);
      setMainnetBalance(main);
      setSepoliaBalance(sep);
      setStrkBalance(network === "mainnet" ? main : sep);
    },
    [formatStrkAmount, network, readStrkBalance]
  );

  // --- Connection handlers ---
  const connectPrivyWallet = useCallback(
    async ({ silent = false, restore = false }: WalletConnectOptions = {}) => {
      if (!privyReady) return;
      if (!authenticated) {
        if (!silent) login();
        return;
      }
      if (!sdkRef.current) return;

      setIsWalletConnecting(true);
      if (!silent) setWalletError(null);

      try {
        const accessToken = await getAccessToken();
        const { wallet: connectedWallet } = await sdkRef.current.onboard({
          strategy: OnboardStrategy.Privy,
          privy: {
            resolve: async () => {
              const res = await fetch("/api/signer-context", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              const data = await res.json();
              if (!res.ok) throw new Error((data as { error?: string }).error ?? "Signer context failed");
              return data;
            },
          },
          accountPreset: accountPresets.argentXV050,
          feeMode: "user_pays",
          deploy: "never",
        });

        setSzWallet(connectedWallet);
        setStarknetAccount(connectedWallet.getAccount() as unknown as Account);
        setWalletAddress(connectedWallet.address);
        setWalletType("privy");
        setShowAuthModal(false);
        persistWalletSession("privy", connectedWallet.address);

        addLog(
          `${restore ? "Restored" : "Connected"} Privy wallet: ${connectedWallet.address.slice(0, 10)}...`
        );

        if (!restore) {
          pushToast({
            tone: "success",
            title: "Privy wallet connected",
            description: "Gasless execution is ready in the studio.",
          });
        }

        void fetchStrkBalance(connectedWallet.address);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Connection failed";
        const isTransientFetchError =
          restore && (message.includes("fetch") || message.includes("Load failed"));

        if (!silent) {
          setWalletError(message);
          pushToast({ tone: "error", title: "Privy connection failed", description: message });
        } else if (!isTransientFetchError) {
          console.warn("Silent Privy restore failed:", message);
        }
      } finally {
        setIsWalletConnecting(false);
      }
    },
    [addLog, authenticated, fetchStrkBalance, getAccessToken, login, persistWalletSession, privyReady, pushToast, sdkRef]
  );

  const connectExtensionWallet = useCallback(
    async ({ silent = false, restore = false }: WalletConnectOptions = {}) => {
      if (!sdkRef.current) return;

      setIsWalletConnecting(true);
      if (!silent) setWalletError(null);

      try {
        const swo = (
          window as unknown as {
            starknet?: {
              id?: string;
              name?: string;
              request: (args: { type: string; params?: unknown }) => Promise<string[]>;
            };
          }
        ).starknet;
        if (!swo) throw new Error("No Starknet browser extension found. Install ArgentX or Braavos.");

        const provider = sdkRef.current.getProvider();
        const walletAccount = await WalletAccount.connect(
          provider,
          swo as Parameters<typeof WalletAccount.connect>[1]
        );
        setStarknetAccount(walletAccount);
        setWalletAddress(walletAccount.address);
        setWalletType("extension");
        setShowAuthModal(false);
        persistWalletSession("extension", walletAccount.address);
        addLog(
          `${restore ? "Restored" : "Connected"} extension wallet: ${walletAccount.address.slice(0, 10)}...`
        );
        if (!restore) {
          pushToast({
            tone: "success",
            title: "Extension wallet connected",
            description: "Self-managed execution is ready in the studio.",
          });
        }
        fetchStrkBalance(walletAccount.address);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Extension connection failed";
        if (!silent) {
          setWalletError(message);
          pushToast({ tone: "error", title: "Extension connection failed", description: message });
        } else console.warn("Silent extension restore failed:", message);
      } finally {
        setIsWalletConnecting(false);
      }
    },
    [addLog, fetchStrkBalance, persistWalletSession, pushToast, sdkRef]
  );

  const disconnectWallet = useCallback(() => {
    if (walletType === "privy") logout();
    clearWalletSession();
    walletReconnectAttemptRef.current = null;
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setStrkBalance(null);
    addLog("Wallet disconnected.");
    pushToast({
      tone: "info",
      title: "Wallet disconnected",
      description: "Studio execution has been disconnected for this session.",
    });
  }, [addLog, clearWalletSession, logout, pushToast, walletType]);

  // --- Auto-reconnect effect ---
  useEffect(() => {
    if (!privyReady || !sdkRef.current || starknetAccount || isWalletConnecting) return;

    const session = getStoredWalletSession();
    if (!session) return;
    if (session.type === "privy" && !authenticated) return;

    const attemptKey = `${session.type}:${network}:${authenticated}`;
    if (walletReconnectAttemptRef.current === attemptKey) return;
    walletReconnectAttemptRef.current = attemptKey;

    if (session.type === "privy") {
      void connectPrivyWallet({ silent: true, restore: true });
      return;
    }

    void connectExtensionWallet({ silent: true, restore: true });
  }, [
    authenticated,
    connectExtensionWallet,
    connectPrivyWallet,
    getStoredWalletSession,
    isWalletConnecting,
    network,
    privyReady,
    sdkRef,
    starknetAccount,
  ]);

  // --- Privy logout cleanup ---
  useEffect(() => {
    if (!privyReady || authenticated || walletType !== "privy") return;

    clearWalletSession();
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setStrkBalance(null);
  }, [authenticated, clearWalletSession, privyReady, walletType]);

  // --- Reset wallet state on network change ---
  const resetWalletState = useCallback(() => {
    setSzWallet(null);
    setStarknetAccount(null);
    setWalletAddress("");
    setWalletType(null);
    setWalletError(null);
    setStrkBalance(null);
  }, []);

  return {
    szWallet,
    starknetAccount,
    walletAddress,
    walletType,
    isWalletConnecting,
    showAuthModal,
    setShowAuthModal,
    showAccountModal,
    setShowAccountModal,
    walletError,
    setWalletError,
    strkBalance,
    setStrkBalance,
    mainnetBalance,
    sepoliaBalance,
    isFetchingBalance,
    connectPrivyWallet,
    connectExtensionWallet,
    disconnectWallet,
    fetchStrkBalance,
    fetchDualBalances,
    readStrkBalance,
    formatStrkAmount,
    resetWalletState,
  };
}
