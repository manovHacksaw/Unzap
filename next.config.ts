import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["starkzap", "ethers", "@hyperlane-xyz/sdk", "@hyperlane-xyz/multicollateral"],
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    // Alias heavy/broken packages to lightweight stubs
    config.resolve.alias["@arbitrum/sdk"] = path.resolve(process.cwd(), "./lib/stubs/arbitrum-sdk.ts");

    // Ensure proper fallbacks for node built-ins used in browser bundles
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Stub @hyperlane-xyz/sdk on server — it's only needed client-side
    if (isServer) {
      config.resolve.alias["@hyperlane-xyz/sdk"] = path.resolve(process.cwd(), "./lib/stubs/hyperlane-sdk.ts");
    }

    // Limit parallelism to reduce peak memory during build
    config.parallelism = 1;

    return config;
  },
};

export default nextConfig;
