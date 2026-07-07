// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "@/components/ui/markdown";

afterEach(cleanup);

const SAMPLE = `# Heading

Some **bold** and *italic* text with \`inline code\`.

- first bullet
- second bullet

1. step one
2. step two

> a blockquote

[docs](https://example.com) and [rel](/local)

\`\`\`ts
const answer: number = 42;
\`\`\`

| Name | Role |
| ---- | ---- |
| Ana  | Dev  |
| Bo   | PM   |
`;

function renderMd(children: string, headingBaseLevel?: number) {
  // Markdown requires `children`; passing it via props (not a JSX child) is the
  // clean form for createElement in a .ts test.
  // eslint-disable-next-line react/no-children-prop
  return render(createElement(Markdown, { children, headingBaseLevel }));
}

describe("Markdown — structure", () => {
  it("offsets headings by headingBaseLevel (keeps a valid outline)", () => {
    const { container } = renderMd("# Heading", 3);
    expect(container.querySelector("h3")).not.toBeNull();
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders headings at their natural level by default", () => {
    const { container } = renderMd("# Heading");
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it("renders bullet and numbered lists", () => {
    const { container } = renderMd(SAMPLE);
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
  });

  it("renders bold, italic, and a blockquote", () => {
    const { container } = renderMd(SAMPLE);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("blockquote")).not.toBeNull();
  });
});

describe("Markdown — links", () => {
  it("opens external links in a new tab with safe rel; keeps internal links in place", () => {
    const { container } = renderMd(SAMPLE);
    const [external, internal] = Array.from(container.querySelectorAll("a"));
    expect(external?.getAttribute("href")).toBe("https://example.com");
    expect(external?.getAttribute("target")).toBe("_blank");
    expect(external?.getAttribute("rel")).toContain("noopener");
    expect(internal?.getAttribute("target")).toBeNull();
  });
});

describe("Markdown — code", () => {
  it("renders inline code distinct from fenced blocks", () => {
    const { container } = renderMd(SAMPLE);
    const inline = container.querySelector("code:not(pre code)");
    expect(inline?.textContent).toBe("inline code");
  });

  it("syntax-highlights fenced code (rehype-highlight token spans)", () => {
    const { container } = renderMd(SAMPLE);
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    const code = pre?.querySelector("code");
    expect(code?.className).toMatch(/hljs|language-ts/);
    // At least one highlighted token (e.g. the `const` keyword).
    expect(pre?.querySelectorAll("[class*='hljs-']").length ?? 0).toBeGreaterThan(0);
  });
});

describe("Markdown — GFM tables", () => {
  it("renders a table with headers and rows inside a horizontal-scroll container", () => {
    const { container } = renderMd(SAMPLE);
    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("tbody td")).toHaveLength(4);
    expect(table?.parentElement?.className).toContain("overflow-x-auto");
  });
});
