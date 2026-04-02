import type { NextConfig } from "next";
import path from "path";

// Absolute paths for webpack (works cross-platform)
const webpackStubs = {
  "@arbitrum/sdk": path.resolve(process.cwd(), "./lib/stubs/arbitrum-sdk.ts"),
  "@hyperlane-xyz/sdk": path.resolve(process.cwd(), "./lib/stubs/hyperlane-sdk.ts"),
  "@hyperlane-xyz/registry": path.resolve(process.cwd(), "./lib/stubs/hyperlane-registry.ts"),
};

// Turbopack on Windows does NOT support absolute paths in resolveAlias — use relative paths
const turbopackStubs = {
  "@arbitrum/sdk": "./lib/stubs/arbitrum-sdk.ts",
  "@hyperlane-xyz/sdk": "./lib/stubs/hyperlane-sdk.ts",
  "@hyperlane-xyz/registry": "./lib/stubs/hyperlane-registry.ts",
};

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  transpilePackages: ["starkzap", "ethers"],
  productionBrowserSourceMaps: false,
  // Turbopack — used by `next dev`
  turbopack: {
    resolveAlias: turbopackStubs,
  },
  // Webpack — used by `next build` and Vercel
  webpack: (config) => {
    Object.assign(config.resolve.alias, webpackStubs);

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.parallelism = 1;

    return config;
  },
};

export default nextConfig;
