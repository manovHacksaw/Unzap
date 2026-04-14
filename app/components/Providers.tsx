"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { TooltipProvider } from "@/components/ui/tooltip";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function UnzapProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ["email", "google", "wallet"],
          appearance: {
            theme: "dark",
            accentColor: "#06b6d4",
          },
          // Unzap is a Starknet app — no EVM/Solana embedded wallets needed.
          // The Starknet wallet is provisioned via StarkZap after Privy login.
        }}
      >
        {children}
      </PrivyProvider>
    </TooltipProvider>
  );
}
