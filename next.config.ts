import type { NextConfig } from "next";

// Stubs are now handled via tsconfig.json paths for better cross-bundler compatibility.
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
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
