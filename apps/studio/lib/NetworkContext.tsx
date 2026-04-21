"use client";

import { createContext, useContext, useState } from "react";
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
  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
