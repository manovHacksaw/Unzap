/** @type {import('next').NextConfig} */
const nextConfig = {
  // starkzap and ethers ship as ESM — Next.js must transpile them
  transpilePackages: ["starknet", "starkzap", "ethers"],

  // Next.js 16 uses Turbopack by default. 
  // Silence the 'webpack config with no turbopack config' error and add stubs.
  turbopack: {
    resolveAlias: {
      "@hyperlane-xyz/sdk": "./lib/stubs/generic.ts",
      "@hyperlane-xyz/registry": "./lib/stubs/generic.ts",
      "@hyperlane-xyz/utils": "./lib/stubs/generic.ts",
      "@arbitrum/sdk": "./lib/stubs/generic.ts",
      "@solana/web3.js": "./lib/stubs/generic.ts",
      "@fatsolutions/tongo-sdk": "./lib/stubs/generic.ts",
    },
  },

  webpack: (config) => {
    // starkzap → @hyperlane-xyz/* → @provablehq/wasm causes a multi-minute
    // compilation hang. Stub the whole hyperlane chain — it's not used at runtime.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@hyperlane-xyz/sdk": false,
      "@hyperlane-xyz/registry": false,
      "@hyperlane-xyz/utils": false,
      "@arbitrum/sdk": false,
      // Privy's Solana adapter — not needed for Starknet
      "@farcaster/mini-app-solana": false,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    return config;
  },

  async headers() {
    return [
      {
        // Privy OAuth popup flows require this COOP policy on every page.
        // Without it, Privy logs "Cross-Origin-Opener-Policy policy would block..."
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
