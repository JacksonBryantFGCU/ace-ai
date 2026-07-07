import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Explorer } from "../workspace/Explorer";

// Step 1's graded contract: the tree renders recursively to unlimited depth,
// and folders can be expanded and collapsed. Selection and file operations
// are exercised starting in Step 2.
afterEach(cleanup);

test("renders the top level and hides nested items until expanded", () => {
  render(<Explorer />);

  const tree = screen.getByRole("tree", { name: "File Explorer" });
  expect(tree).toBeInTheDocument();

  expect(screen.getByText("src")).toBeInTheDocument();
  expect(screen.getByText("public")).toBeInTheDocument();
  expect(screen.getByText("assets")).toBeInTheDocument();
  expect(screen.getByText("README.md")).toBeInTheDocument();

  expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();
  expect(screen.queryByText("favicon.ico")).not.toBeInTheDocument();
});

test("expanding a folder reveals its direct children", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByRole("button", { name: "Expand src" }));

  expect(screen.getByText("index.ts")).toBeInTheDocument();
  expect(screen.getByText("components")).toBeInTheDocument();
  expect(screen.getByText("utils")).toBeInTheDocument();
  expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();
});

test("expanding a nested folder works to unlimited depth", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByRole("button", { name: "Expand src" }));
  fireEvent.click(screen.getByRole("button", { name: "Expand components" }));

  expect(screen.getByText("Button.tsx")).toBeInTheDocument();
  expect(screen.getByText("Card.tsx")).toBeInTheDocument();
});

test("collapsing a folder hides its children again", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByRole("button", { name: "Expand src" }));
  expect(screen.getByText("index.ts")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Collapse src" }));
  expect(screen.queryByText("index.ts")).not.toBeInTheDocument();
});

test("files render without an expand control", () => {
  render(<Explorer />);

  expect(screen.queryByRole("button", { name: /README.md/ })).not.toBeInTheDocument();
});
