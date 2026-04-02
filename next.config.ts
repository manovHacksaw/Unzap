import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["starkzap", "ethers", "@hyperlane-xyz/sdk", "@hyperlane-xyz/multicollateral"],
  productionBrowserSourceMaps: false,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  turbopack: {
    resolveAlias: {
      "@arbitrum/sdk": "./lib/stubs/arbitrum-sdk.ts",
    },
  },
};

export default nextConfig;
