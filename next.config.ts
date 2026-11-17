import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep local builds usable on the development machine's limited memory.
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
