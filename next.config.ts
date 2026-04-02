import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  transpilePackages: ["starkzap", "ethers", "@hyperlane-xyz/sdk", "@hyperlane-xyz/multicollateral"],
  productionBrowserSourceMaps: false,
  experimental: {
    turbo: false,
    cpus: 4,
  },
  webpack: (config) => {
    config.resolve.alias["@arbitrum/sdk"] = path.resolve(__dirname, "./lib/stubs/arbitrum-sdk.ts");
    return config;
  },
};

export default nextConfig;
