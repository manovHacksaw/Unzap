import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["starkzap", "ethers", "@hyperlane-xyz/sdk", "@hyperlane-xyz/multicollateral"],
  productionBrowserSourceMaps: false,
  webpack: (config) => {
    // Alias heavy/broken packages to lightweight stubs
    config.resolve.alias["@arbitrum/sdk"] = path.resolve(process.cwd(), "./lib/stubs/arbitrum-sdk.ts");

    // Ensure proper fallbacks for node built-ins used in browser bundles
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Stub hyperlane packages — starkzap's bridge module pulls these in
    // but they have version conflicts with the installed SDK (v29 removed TokenStandard)
    config.resolve.alias["@hyperlane-xyz/sdk"] = path.resolve(process.cwd(), "./lib/stubs/hyperlane-sdk.ts");
    config.resolve.alias["@hyperlane-xyz/registry"] = path.resolve(process.cwd(), "./lib/stubs/hyperlane-registry.ts");

    // Limit parallelism to reduce peak memory during build
    config.parallelism = 1;

    return config;
  },
};

export default nextConfig;
