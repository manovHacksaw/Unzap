import type { NextConfig } from "next";
import path from "path";

const stubs = {
  "@arbitrum/sdk": path.resolve(process.cwd(), "./lib/stubs/arbitrum-sdk.ts"),
  "@hyperlane-xyz/sdk": path.resolve(process.cwd(), "./lib/stubs/hyperlane-sdk.ts"),
  "@hyperlane-xyz/registry": path.resolve(process.cwd(), "./lib/stubs/hyperlane-registry.ts"),
};

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["starkzap", "ethers"],
  productionBrowserSourceMaps: false,
  // Turbopack config — used by `next dev`
  turbopack: {
    resolveAlias: stubs,
  },
  // Webpack config — used by `next build`
  webpack: (config) => {
    Object.assign(config.resolve.alias, stubs);

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Limit parallelism to reduce peak memory during build
    config.parallelism = 1;

    return config;
  },
};

export default nextConfig;
