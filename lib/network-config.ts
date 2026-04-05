import { ChainId } from "starkzap";

export type Network = "mainnet" | "sepolia";

export interface NetworkConfig {
  network: Network;
  label: string;
  rpcUrl: string;
  starkscan: string;
  voyager: string;
  explorer: string; // preferred explorer: starkscan on mainnet, voyager on sepolia
  chainId: ChainId;
}

export function getNetworkConfig(network: Network): NetworkConfig {
  const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

  if (network === "mainnet") {
    const rpcUrl = process.env.STARKNET_RPC_URL_MAINNET || 
                   (alchemyKey ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}` : "https://free-rpc.nethermind.io/mainnet-juno/v0_8");
    return {
      network: "mainnet",
      label: "Starknet Mainnet",
      rpcUrl,
      starkscan: "https://starkscan.co",
      voyager: "https://voyager.online",
      explorer: "https://starkscan.co",
      chainId: ChainId.MAINNET,
    };
  }

  const rpcUrl = process.env.STARKNET_RPC_URL_SEPOLIA || 
                 (alchemyKey ? `https://starknet-sepolia.g.alchemy.com/v2/${alchemyKey}` : "https://free-rpc.nethermind.io/sepolia-juno/v0_8");
  return {
    network: "sepolia",
    label: "Starknet Sepolia",
    rpcUrl,
    starkscan: "https://sepolia.starkscan.co",
    voyager: "https://sepolia.voyager.online",
    explorer: "https://sepolia.voyager.online",
    chainId: ChainId.SEPOLIA,
  };
}
