import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["starkzap", "ethers", "@hyperlane-xyz/sdk", "@hyperlane-xyz/multicollateral"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    resolveAlias: {
      "@arbitrum/sdk": "./lib/stubs/arbitrum-sdk.ts",
    },
  },
};

export default nextConfig;
