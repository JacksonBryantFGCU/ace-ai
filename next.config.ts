import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't infer it from an unrelated lockfile
  // elsewhere on the machine (a stray package-lock.json in the home directory).
  turbopack: {
    root: __dirname,
  },
  // Authored scenario content (scenario.md, workspace/, tests/, solution/) is read
  // from disk at runtime via dynamic paths the tracer can't see, so it must be
  // explicitly included in the server output for the interview routes. Without this
  // the production server can't load scenarios, run verification, or resolve
  // checkpoints. Keys are route globs; values resolve from the project root.
  outputFileTracingIncludes: {
    "/technical-interview": ["./content/interview-scenarios/**/*"],
    "/playground": ["./content/interview-scenarios/**/*"],
  },
};

export default nextConfig;
