import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Work around a local Windows build-worker crash while keeping default behavior elsewhere.
    webpackBuildWorker: process.platform === "win32" ? false : undefined,
  },
  outputFileTracingIncludes: {
    "/*": ["./dev.db"],
  },
};

export default nextConfig;
