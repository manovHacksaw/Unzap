"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function UnzapProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#06b6d4",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
          solana: { createOnLogin: "all-users" },
        },
      }}
    >
      {children}
    </PrivyProvider>
    </TooltipProvider>
  );
}
