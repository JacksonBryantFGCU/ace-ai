import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createContainerSandboxExecutor, ML_SANDBOX_IMAGE_REF } from "@/server/scenarios/sandbox/container-sandbox-executor";

/**
 * REAL container integration tests — no mocks. Spins up actual `docker run`
 * invocations against the pinned `ace-ai-ml-runner` image to prove the
 * security controls documented in docs/README.md are genuinely enforced,
 * not merely configured. Gated behind a live Docker probe (mirrors the
 * `pytestAvailable` pattern in server/scenarios/machine-learning-runtime.test.ts)
 * so this suite degrades to a clean skip — not a failure — in an environment
 * without Docker (e.g. some CI runners), rather than blocking unrelated work.
 *
 * Run explicitly via `npm run sandbox:verify` once `npm run sandbox:build`
 * has produced the image locally.
 */

let dockerAvailable = false;

function runDocker(args: string[]): Promise<{ exitCode: number | null; stdout: string }> {
  return new Promise((resolvePromise) => {
    let stdout = "";
    const child = spawn("docker", args, { windowsHide: true });
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.once("error", () => resolvePromise({ exitCode: null, stdout: "" }));
    child.once("close", (code) => resolvePromise({ exitCode: code, stdout }));
  });
}

beforeAll(async () => {
  try {
    const info = await runDocker(["info", "--format", "{{.ServerVersion}}"]);
    const image = await runDocker(["image", "inspect", ML_SANDBOX_IMAGE_REF, "--format", "{{.Id}}"]);
    dockerAvailable = info.exitCode === 0 && image.exitCode === 0;
  } catch {
    dockerAvailable = false;
  }
}, 15_000);

const workspaces: string[] = [];

async function makeWorkspace(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ace-sandbox-it-"));
  workspaces.push(dir);
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, "utf8");
  }
  return dir;
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((dir) => rm(dir, { recursive: true, force: true }).catch(() => {})));
});

describe("container sandbox — real Docker integration", () => {
  it(
    "network access is blocked by default",
    async () => {
      if (!dockerAvailable) return;
      const workspace = await makeWorkspace({
        "main.py":
          "import socket\ns = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\ns.settimeout(2)\ntry:\n    s.connect(('8.8.8.8', 53))\n    print('CONNECTED')\nexcept OSError as e:\n    print('BLOCKED:' + str(e))\n",
      });
      const executor = createContainerSandboxExecutor();
      const result = await executor.execute({
        workspacePath: workspace,
        command: ["python", "main.py"],
        timeoutMs: 15_000,
      });
      expect(result.status).toBe("completed");
      expect(result.stdout).toContain("BLOCKED");
      expect(result.stdout).not.toContain("CONNECTED");
    },
    30_000,
  );

  it(
    "runs as a non-root user (uid 10001)",
    async () => {
      if (!dockerAvailable) return;
      const workspace = await makeWorkspace({ "main.py": "import os\nprint(os.getuid())\n" });
      const executor = createContainerSandboxExecutor();
      const result = await executor.execute({
        workspacePath: workspace,
        command: ["python", "main.py"],
        timeoutMs: 15_000,
      });
      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("10001");
    },
    30_000,
  );

  it(
    "host env vars are not leaked into the container beyond the small explicit set",
    async () => {
      if (!dockerAvailable) return;
      process.env.ACE_SANDBOX_TEST_HOST_MARKER = "host-only-value-should-not-leak";
      const workspace = await makeWorkspace({
        "main.py": "import os\nprint('LEAKED' if 'ACE_SANDBOX_TEST_HOST_MARKER' in os.environ else 'NOT_LEAKED')\n",
      });
      const executor = createContainerSandboxExecutor();
      const result = await executor.execute({
        workspacePath: workspace,
        command: ["python", "main.py"],
        timeoutMs: 15_000,
      });
      delete process.env.ACE_SANDBOX_TEST_HOST_MARKER;
      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("NOT_LEAKED");
    },
    30_000,
  );

  it(
    "root filesystem is read-only outside the bind-mounted workspace",
    async () => {
      if (!dockerAvailable) return;
      const workspace = await makeWorkspace({
        "main.py":
          "import os\ntry:\n    with open('/usr/local/bin/pwned', 'w') as f:\n        f.write('x')\n    print('WROTE_OUTSIDE')\nexcept OSError as e:\n    print('BLOCKED_OUTSIDE:' + str(e))\nwith open('output.txt', 'w') as f:\n    f.write('ok')\nprint('WROTE_WORKSPACE')\n",
      });
      const executor = createContainerSandboxExecutor();
      const result = await executor.execute({
        workspacePath: workspace,
        command: ["python", "main.py"],
        timeoutMs: 15_000,
      });
      expect(result.status).toBe("completed");
      expect(result.stdout).toContain("BLOCKED_OUTSIDE");
      expect(result.stdout).toContain("WROTE_WORKSPACE");
      const written = await readFile(join(workspace, "output.txt"), "utf8");
      expect(written).toBe("ok");
    },
    30_000,
  );

  it(
    "a hung process is killed at the configured timeout, well before it would finish on its own",
    async () => {
      if (!dockerAvailable) return;
      const workspace = await makeWorkspace({ "main.py": "import time\ntime.sleep(999)\n" });
      const executor = createContainerSandboxExecutor();
      const startedAt = Date.now();
      const result = await executor.execute({
        workspacePath: workspace,
        command: ["python", "main.py"],
        timeoutMs: 3_000,
      });
      const elapsedMs = Date.now() - startedAt;
      expect(result.status).toBe("timeout");
      expect(elapsedMs).toBeLessThan(15_000);
    },
    30_000,
  );

  it(
    "stdout beyond maxOutputChars is truncated, not returned unbounded",
    async () => {
      if (!dockerAvailable) return;
      const workspace = await makeWorkspace({
        "main.py": "for _ in range(200000):\n    print('x', end='')\n",
      });
      const executor = createContainerSandboxExecutor();
      const result = await executor.execute({
        workspacePath: workspace,
        command: ["python", "main.py"],
        timeoutMs: 15_000,
        maxOutputChars: 2_000,
      });
      expect(result.status).toBe("completed");
      expect(result.stdout.length).toBeLessThan(3_000);
      expect(result.stdout).toContain("truncated");
    },
    30_000,
  );

  it(
    "the container is removed after both a successful run and a timed-out run",
    async () => {
      if (!dockerAvailable) return;
      const executor = createContainerSandboxExecutor();

      const okWorkspace = await makeWorkspace({ "main.py": "print('ok')\n" });
      await executor.execute({ workspacePath: okWorkspace, command: ["python", "main.py"], timeoutMs: 15_000 });

      const hangWorkspace = await makeWorkspace({ "main.py": "import time\ntime.sleep(999)\n" });
      await executor.execute({ workspacePath: hangWorkspace, command: ["python", "main.py"], timeoutMs: 2_000 });

      // --rm cleanup can lag the process exit by a moment; poll briefly.
      let remaining = "";
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const list = await runDocker(["ps", "-a", "--filter", "name=ace-ml-", "--format", "{{.Names}}"]);
        remaining = list.stdout.trim();
        if (remaining === "") break;
        await new Promise((r) => setTimeout(r, 500));
      }
      expect(remaining).toBe("");
    },
    60_000,
  );
});
