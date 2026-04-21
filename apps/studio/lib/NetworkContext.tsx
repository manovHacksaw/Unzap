"use client";

import { createContext, useContext, useState, useMemo } from "react";
import type { Network } from "./network-config";

interface NetworkContextValue {
  network: Network;
  setNetwork: (n: Network) => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: "mainnet",
  setNetwork: () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetwork] = useState<Network>("mainnet");
  
  const value = useMemo(() => ({
    network,
    setNetwork
  }), [network]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
