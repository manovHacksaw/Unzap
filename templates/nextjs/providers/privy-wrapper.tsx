'use client';

import { type ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
import { PrivyProvider, usePrivy, useLogin } from '@privy-io/react-auth';
import { StarkZap, OnboardStrategy, accountPresets } from 'starkzap';
import { WalletAccount, Account } from 'starknet';
import { connect as connectStarknet } from '@starknet-io/get-starknet';
import { WalletContext } from '@/hooks/wallet';
import { RPC_URL } from '@/lib/contract';

function PrivyWalletProvider({ children }: { children: ReactNode }) {
  const { authenticated, getAccessToken, logout } = usePrivy();

  const [account, setAccount] = useState<Account | WalletAccount | null>(null);
  const [szWallet, setSzWallet] = useState<any | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = useState<'extension' | 'privy' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sdk = useMemo(
    () =>
      new StarkZap({
        network: 'sepolia',
        rpcUrl: RPC_URL,
        paymaster: {
          headers: {
            'x-paymaster-api-key': process.env.NEXT_PUBLIC_AVNU_API_KEY ?? '',
          },
        },
      }),
    []
  );

  const connectPrivyWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const { wallet: connectedWallet } = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        privy: {
          resolve: async () => {
            const res = await fetch('/api/signer-context', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
            });
            const data = await res.json();
            if (!res.ok) throw new Error((data as any).error ?? 'Signer context failed');
            return data;
          },
        },
        accountPreset: accountPresets.argentXV050,
        feeMode: 'sponsored',
        deploy: 'whenever' as any,
      });
      setSzWallet(connectedWallet);
      setAccount(connectedWallet.getAccount() as unknown as Account);
      setAddress(connectedWallet.address);
      setWalletType('privy');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsConnecting(false);
    }
  }, [getAccessToken, sdk]);

  useEffect(() => {
    if (authenticated && !account && !isConnecting && sdk) {
      void connectPrivyWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, sdk]);

  const { login } = useLogin({
    onComplete: () => { void connectPrivyWallet(); },
    onError: () => { setIsConnecting(false); },
  });

  const connectExtensionWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const wallet = await connectStarknet({ modalMode: 'alwaysAsk' });
      if (!wallet) return;
      
      const walletAccount = await WalletAccount.connect(sdk.getProvider(), wallet);
      setAccount(walletAccount);
      setAddress(walletAccount.address);
      setWalletType('extension');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsConnecting(false);
    }
  }, [sdk]);

  const connect = useCallback(
    async (method: 'extension' | 'privy') => {
      if (method === 'extension') {
        await connectExtensionWallet();
        return;
      }
      if (authenticated) {
        await connectPrivyWallet();
      } else {
        setIsConnecting(true);
        login();
      }
    },
    [authenticated, login, connectPrivyWallet, connectExtensionWallet]
  );

  const disconnect = useCallback(() => {
    if (walletType === 'privy') logout();
    setSzWallet(null);
    setAccount(null);
    setAddress(null);
    setWalletType(null);
    setError(null);
  }, [walletType, logout]);

  return (
    <WalletContext.Provider
      value={{ account, szWallet, address, connect, disconnect, isConnecting, walletType, error }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export default function PrivyWrapper({
  appId,
  children,
}: {
  appId: string;
  children: ReactNode;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google', 'twitter', 'discord', 'github'],
      }}
    >
      <PrivyWalletProvider>{children}</PrivyWalletProvider>
    </PrivyProvider>
  );
}
