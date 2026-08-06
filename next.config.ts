import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // A stray package-lock.json in ~/dev/youtube breaks workspace-root inference
    root: __dirname,
  },
};

export default nextConfig;
