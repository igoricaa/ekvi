import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "brainy-bird-50.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
