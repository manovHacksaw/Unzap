import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { RpcProvider, WalletAccount, Account } from 'starknet';
import { connect as connectStarknet } from '@starknet-io/get-starknet';
import { RPC_URL } from '@/lib/contract';

interface WalletContextValue {
  account: Account | WalletAccount | null;
  /** StarkZap wallet — provided by privy-wrapper when walletType === 'privy' */
  szWallet: any | null;
  address: string | null;
  connect: (method: 'extension' | 'privy') => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  walletType: 'extension' | 'privy' | null;
  error: string | null;
}

export const WalletContext = createContext<WalletContextValue>({
  account: null,
  szWallet: null,
  address: null,
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
  walletType: null,
  error: null,
});

/** 
 * Extension-only fallback provider. 
 * providers/privy-wrapper.tsx overrides this context when PRIVY is used.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = useState<'extension' | 'privy' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (method: 'extension' | 'privy') => {
    if (method === 'privy') {
      setError('Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local to enable Privy login.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const wallet = await connectStarknet({ modalMode: 'alwaysAsk' });
      if (!wallet) return;
      
      const provider = new RpcProvider({ nodeUrl: RPC_URL });
      const walletAccount = await WalletAccount.connect(provider, wallet);
      
      setAccount(walletAccount);
      setAddress(walletAccount.address);
      setWalletType('extension');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setAddress(null);
    setWalletType(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider value={{ 
      account, 
      szWallet: null, 
      address, 
      connect, 
      disconnect, 
      isConnecting, 
      walletType, 
      error 
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
