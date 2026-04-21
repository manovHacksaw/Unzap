'use client';

import dynamic from 'next/dynamic';
import { type ReactNode } from 'react';
import { WalletProvider } from '@/hooks/wallet';

const PrivyWrapper = dynamic(() => import('./privy-wrapper'), { ssr: false });
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

export function Providers({ children }: { children: ReactNode }) {
  if (PRIVY_APP_ID) {
    return <PrivyWrapper appId={PRIVY_APP_ID}>{children}</PrivyWrapper>;
  }

  return <WalletProvider>{children}</WalletProvider>;
}
