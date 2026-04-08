/** @type {import('next').NextConfig} */
const nextConfig = {
  /* starkzap and its peer dependencies often need transpilation in Next.js */
  transpilePackages: [
    "starkzap", 
    "starknet", 
    "@avnu/avnu-sdk", 
    "@hyperlane-xyz/sdk", 
    "@hyperlane-xyz/registry", 
    "@hyperlane-xyz/utils",
    "ethers"
  ],
  

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
