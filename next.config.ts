import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["starkzap"],
  turbopack: {
    resolveAlias: {
      "@arbitrum/sdk": "./lib/stubs/arbitrum-sdk.ts",
    },
  },
};

export default nextConfig;
