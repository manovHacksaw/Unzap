import { ChainId } from "starkzap";

export type Network = "mainnet" | "sepolia";

export interface NetworkConfig {
  network: Network;
  label: string;
  rpcUrl: string;
  starkscan: string;
  voyager: string;
  chainId: ChainId;
}

export function getNetworkConfig(network: Network): NetworkConfig {
  if (network === "mainnet") {
    return {
      network: "mainnet",
      label: "Starknet Mainnet",
      rpcUrl: "https://starknet-mainnet.public.blastapi.io/rpc/v0_8",
      starkscan: "https://starkscan.co",
      voyager: "https://voyager.online",
      chainId: ChainId.MAINNET,
    };
  }
  return {
    network: "sepolia",
    label: "Starknet Sepolia",
    rpcUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
    starkscan: "https://sepolia.starkscan.co",
    voyager: "https://sepolia.voyager.online",
    chainId: ChainId.SEPOLIA,
  };
}
