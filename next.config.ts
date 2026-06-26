import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from an unrelated lockfile
  // elsewhere on the machine (a stray package-lock.json in the home directory).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
