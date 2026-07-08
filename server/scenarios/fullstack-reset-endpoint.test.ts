import { afterEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

const TSX = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const SERVER_ENTRY = join(
  process.cwd(),
  "content",
  "interview-scenarios",
  "fullstack-react-node",
  "customer-feedback-dashboard",
  "workspace",
  "backend",
  "src",
  "server.ts",
);

const processes = new Set<ChildProcessWithoutNullStreams>();

async function waitFor(url: string, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep polling until the process is ready or times out
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startServer(nodeEnv: "development" | "test", port: number) {
  const child = spawn(process.execPath, [TSX, SERVER_ENTRY], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      PORT: String(port),
    },
    stdio: "pipe",
  });
  processes.add(child);
  await waitFor(`http://127.0.0.1:${port}/health`);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      child.kill();
      processes.delete(child);
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
    },
  };
}

afterEach(async () => {
  await Promise.all(
    [...processes].map(
      (child) =>
        new Promise<void>((resolve) => {
          child.once("exit", () => resolve());
          child.kill();
        }),
    ),
  );
  processes.clear();
});

describe("customer feedback dashboard reset endpoint", () => {
  it("is unavailable outside test mode", async () => {
    const runtime = await startServer("development", 4410);
    try {
      const response = await fetch(`${runtime.baseUrl}/__test/reset`, { method: "POST" });
      expect(response.status).toBe(404);
    } finally {
      await runtime.stop();
    }
  });

  it("is available in test mode for deterministic verification resets", async () => {
    const runtime = await startServer("test", 4411);
    try {
      const response = await fetch(`${runtime.baseUrl}/__test/reset`, { method: "POST" });
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true });
    } finally {
      await runtime.stop();
    }
  });
});
