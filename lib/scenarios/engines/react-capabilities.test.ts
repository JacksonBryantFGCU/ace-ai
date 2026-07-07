// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { runAuthoredTests } from "@/lib/scenarios/engines/browser-test-runtime";
import type { SnapshotFile, TestRunResult } from "@/lib/scenarios/engines/contracts";

/**
 * Capability matrix for the `frontend-react` (component) engine. Each case drives a
 * tiny candidate + authored test through the REAL runtime and asserts the test
 * passes — proving every kind of React interview question can be authored and
 * graded: components, hooks, utilities, state, async, API mocking, routing,
 * context, accessibility, and responsive behavior.
 */

async function run(files: Record<string, string>, testSrc: string): Promise<TestRunResult> {
  const workspaceFiles: SnapshotFile[] = Object.entries(files).map(([path, content]) => ({
    path,
    content,
    role: "edit",
  }));
  return runAuthoredTests({
    workspaceFiles,
    testFiles: [{ path: "tests/probe.test.tsx", content: testSrc }],
  });
}

function expectAllPass(result: TestRunResult) {
  const detail = [
    ...result.errors.map((e) => `LOAD: ${e.message}`),
    ...result.tests.filter((t) => !t.passed).map((t) => `${t.name}: ${t.message ?? ""}`),
  ].join("\n");
  expect(result.errors, detail).toEqual([]);
  expect(result.tests.length, "no tests ran").toBeGreaterThan(0);
  expect(
    result.tests.every((t) => t.passed),
    detail,
  ).toBe(true);
}

describe("frontend-react engine capabilities", () => {
  it("renders and asserts React components", async () => {
    const result = await run(
      {
        "Greeting.tsx": `export function Greeting({ name }: { name: string }) { return <h1>Hello {name}</h1>; }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      import { Greeting } from "../workspace/Greeting";
      test("renders heading", () => {
        render(<Greeting name="Ada" />);
        expect(screen.getByRole("heading")).toHaveTextContent("Hello Ada");
      });`,
    );
    expectAllPass(result);
  });

  it("tests custom hooks (renderHook + act)", async () => {
    const result = await run(
      {
        "useCounter.ts": `
        import { useState, useCallback } from "react";
        export function useCounter(init: number) {
          const [count, setCount] = useState(init);
          const inc = useCallback(() => setCount((c) => c + 1), []);
          return { count, inc };
        }`,
      },
      `
      import { renderHook, act } from "@testing-library/react";
      import { useCounter } from "../workspace/useCounter";
      test("increments", () => {
        const { result } = renderHook(() => useCounter(5));
        act(() => result.current.inc());
        expect(result.current.count).toBe(6);
      });`,
    );
    expectAllPass(result);
  });

  it("tests pure utilities (core matchers, toThrow, asymmetric)", async () => {
    const result = await run(
      {
        "slugify.ts": `
        export function slugify(s: string) {
          if (typeof s !== "string") throw new Error("slugify expects a string");
          return s.trim().toLowerCase().replace(/\\s+/g, "-");
        }`,
      },
      `
      import { slugify } from "../workspace/slugify";
      test("slugifies", () => {
        expect(slugify("Hello World")).toBe("hello-world");
        expect(slugify("  A B  ")).toBe("a-b");
      });
      test("throws on non-string", () => {
        expect(() => (slugify as any)(42)).toThrow("string");
      });
      test("asymmetric + number + string matchers", () => {
        expect({ a: 1, b: 2 }).toEqual(expect.objectContaining({ a: 1 }));
        expect([1, 2, 3]).toEqual(expect.arrayContaining([2]));
        expect(3.14159).toBeCloseTo(3.14, 2);
        expect("hello").toMatch(/ell/);
        expect(4).toBeGreaterThan(3);
      });`,
    );
    expectAllPass(result);
  });

  it("tests state management via user interaction (user-event)", async () => {
    const result = await run(
      {
        "Counter.tsx": `
        import { useState } from "react";
        export function Counter() {
          const [n, setN] = useState(0);
          return <button onClick={() => setN(n + 1)}>count: {n}</button>;
        }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      import userEvent from "@testing-library/user-event";
      import { Counter } from "../workspace/Counter";
      test("clicks update state", async () => {
        render(<Counter />);
        const btn = screen.getByRole("button");
        expect(btn).toHaveTextContent("count: 0");
        const user = userEvent.setup({ delay: null });
        await user.click(btn);
        await user.click(btn);
        expect(btn).toHaveTextContent("count: 2");
      });`,
    );
    expectAllPass(result);
  });

  it("tests async behavior — real (findBy/waitFor) and fake timers (debounce)", async () => {
    const result = await run(
      {
        "AsyncName.tsx": `
        import { useEffect, useState } from "react";
        export function AsyncName({ load }: { load: () => Promise<string> }) {
          const [name, setName] = useState<string | null>(null);
          useEffect(() => { let ok = true; load().then((n) => ok && setName(n)); return () => { ok = false; }; }, [load]);
          return <div>{name === null ? "Loading..." : name}</div>;
        }`,
        "Debounced.tsx": `
        import { useEffect, useState } from "react";
        export function Debounced({ onSettle }: { onSettle: (v: string) => void }) {
          const [v, setV] = useState("");
          useEffect(() => { const id = setTimeout(() => onSettle(v), 500); return () => clearTimeout(id); }, [v, onSettle]);
          return <input aria-label="q" value={v} onChange={(e) => setV(e.target.value)} />;
        }`,
      },
      `
      import { render, screen, fireEvent } from "@testing-library/react";
      import { AsyncName } from "../workspace/AsyncName";
      import { Debounced } from "../workspace/Debounced";
      test("shows loading then the resolved value", async () => {
        const load = vi.fn().mockResolvedValue("Ada");
        render(<AsyncName load={load} />);
        expect(screen.getByText("Loading...")).toBeInTheDocument();
        expect(await screen.findByText("Ada")).toBeInTheDocument();
      });
      test("debounces with fake timers", () => {
        vi.useFakeTimers();
        const onSettle = vi.fn();
        render(<Debounced onSettle={onSettle} />);
        fireEvent.change(screen.getByLabelText("q"), { target: { value: "hello" } });
        vi.advanceTimersByTime(499);
        expect(onSettle).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onSettle).toHaveBeenCalledWith("hello");
        vi.useRealTimers();
      });`,
    );
    expectAllPass(result);
  });

  it("tests API mocking (vi.mock module + vi.stubGlobal fetch)", async () => {
    const result = await run(
      {
        "api.ts": `export async function fetchUser(id: string) { return { name: "REAL:" + id }; }`,
        "UserCard.tsx": `
        import { useEffect, useState } from "react";
        import { fetchUser } from "./api";
        export function UserCard({ id }: { id: string }) {
          const [u, setU] = useState<{ name: string } | null>(null);
          useEffect(() => { fetchUser(id).then(setU); }, [id]);
          return <div>{u ? u.name : "…"}</div>;
        }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      vi.mock("../workspace/api", () => ({ fetchUser: vi.fn().mockResolvedValue({ name: "Neo" }) }));
      import { UserCard } from "../workspace/UserCard";
      test("mocks the api module", async () => {
        render(<UserCard id="1" />);
        expect(await screen.findByText("Neo")).toBeInTheDocument();
      });
      test("stubs global fetch", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve({ ok: true }) }));
        const res = await fetch("/x");
        expect(await res.json()).toEqual({ ok: true });
        vi.unstubAllGlobals();
      });`,
    );
    expectAllPass(result);
  });

  it("tests routing (react-router-dom)", async () => {
    const result = await run(
      {
        "App.tsx": `
        import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
        function Home() { return <div><p>Home Page</p><Link to="/about">About</Link></div>; }
        function About() { return <p>About Page</p>; }
        export function App() {
          return (
            <MemoryRouter initialEntries={["/"]}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </MemoryRouter>
          );
        }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      import userEvent from "@testing-library/user-event";
      import { App } from "../workspace/App";
      test("navigates between routes", async () => {
        render(<App />);
        expect(screen.getByText("Home Page")).toBeInTheDocument();
        await userEvent.setup({ delay: null }).click(screen.getByRole("link", { name: "About" }));
        expect(screen.getByText("About Page")).toBeInTheDocument();
      });`,
    );
    expectAllPass(result);
  });

  it("tests React context", async () => {
    const result = await run(
      {
        "Theme.tsx": `
        import { createContext, useContext, ReactNode } from "react";
        const ThemeCtx = createContext("light");
        export function ThemeProvider({ value, children }: { value: string; children: ReactNode }) {
          return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
        }
        export function ThemedButton() { return <button>{useContext(ThemeCtx)}</button>; }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      import { ThemeProvider, ThemedButton } from "../workspace/Theme";
      test("consumes provided context", () => {
        render(<ThemeProvider value="dark"><ThemedButton /></ThemeProvider>);
        expect(screen.getByRole("button")).toHaveTextContent("dark");
      });`,
    );
    expectAllPass(result);
  });

  it("tests accessibility (roles + jest-dom a11y matchers)", async () => {
    const result = await run(
      {
        "Field.tsx": `
        export function Field() {
          return (
            <div>
              <input type="search" aria-label="Search users" />
              <button disabled>Submit</button>
            </div>
          );
        }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      import { Field } from "../workspace/Field";
      test("exposes accessible names, attributes, and states", () => {
        render(<Field />);
        const input = screen.getByRole("searchbox");
        expect(input).toHaveAttribute("aria-label", "Search users");
        expect(input).toHaveAccessibleName("Search users");
        expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
      });`,
    );
    expectAllPass(result);
  });

  it("tests responsive behavior (matchMedia)", async () => {
    const result = await run(
      {
        "Viewport.tsx": `
        import { useEffect, useState } from "react";
        export function Viewport() {
          const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 600px)").matches);
          useEffect(() => {
            const mq = window.matchMedia("(max-width: 600px)");
            const on = () => setMobile(mq.matches);
            mq.addEventListener("change", on);
            return () => mq.removeEventListener("change", on);
          }, []);
          return <div>{mobile ? "Mobile" : "Desktop"}</div>;
        }`,
      },
      `
      import { render, screen } from "@testing-library/react";
      import { Viewport } from "../workspace/Viewport";
      test("reads a matchMedia breakpoint", () => {
        window.matchMedia = ((q: string) => ({
          matches: q.includes("max-width: 600px"), media: q, onchange: null,
          addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
          dispatchEvent: () => false,
        })) as any;
        render(<Viewport />);
        expect(screen.getByText("Mobile")).toBeInTheDocument();
      });`,
    );
    expectAllPass(result);
  });
});
