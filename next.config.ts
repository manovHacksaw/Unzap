import type { NextConfig } from "next";
import path from "path";

const root = process.cwd();

// Stubs are now handled via tsconfig.json paths for better cross-bundler compatibility.
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
  // Webpack — used by `next build` and Vercel
  webpack: (config) => {
    // These heavy libraries cause multi-minute compilation hangs in Webpack
    // due to nested WASM or massive dependency chains. We stub them here.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@hyperlane-xyz/sdk": path.join(root, "./lib/stubs/generic.ts"),
      "@hyperlane-xyz/registry": path.join(root, "./lib/stubs/generic.ts"),
      "@hyperlane-xyz/utils": path.join(root, "./lib/stubs/generic.ts"),
      "@arbitrum/sdk": path.join(root, "./lib/stubs/generic.ts"),
      "@solana/web3.js": path.join(root, "./lib/stubs/generic.ts"),
      "@fatsolutions/tongo-sdk": path.join(root, "./lib/stubs/generic.ts"),
      "@farcaster/mini-app-solana": path.join(root, "./lib/stubs/generic.ts"),
      "@cartridge/controller": path.join(root, "./lib/stubs/generic.ts"),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};

export default nextConfig;
