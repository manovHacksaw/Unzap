import type { NextConfig } from "next";

// Null-alias for webpack: treats these as empty modules.
// Using false is more reliable than stub file paths on Windows.
// starkzap → @hyperlane-xyz/sdk → @safe-global/protocol-kit → zksync-web3
// → requires ethers/lib/utils (v5 path) which doesn't exist in ethers v6.
const webpackStubs: Record<string, false> = {
  "@arbitrum/sdk": false,
  "@hyperlane-xyz/sdk": false,
  "@hyperlane-xyz/registry": false,
  "@hyperlane-xyz/utils": false,
  "@avnu/avnu-sdk": false,
};

// Turbopack on Windows does NOT support absolute paths in resolveAlias — use relative paths
const turbopackStubs = {
  "@arbitrum/sdk": "./lib/stubs/arbitrum-sdk.ts",
  "@hyperlane-xyz/sdk": "./lib/stubs/hyperlane-sdk.ts",
  "@hyperlane-xyz/registry": "./lib/stubs/hyperlane-registry.ts",
  "@hyperlane-xyz/utils": "./lib/stubs/hyperlane-sdk.ts",
  "@avnu/avnu-sdk": "./lib/stubs/avnu-sdk.ts",
};

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Required by Privy for popup-based OAuth flows (prevents 404 on COOP check)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
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
