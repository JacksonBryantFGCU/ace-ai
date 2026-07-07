import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Explorer } from "../workspace/Explorer";
import { insertNode, renameNode } from "../workspace/tree";
import { INITIAL_TREE } from "../workspace/initialTree";
import type { TreeNode } from "../workspace/types";

// Step 2's graded contract: selection, and create/rename/delete wired
// through the pure tree helpers. Deleting a NESTED node is exercised in
// Step 3, where the reference implementation has a real bug.
afterEach(cleanup);

test("insertNode appends into the named folder without mutating the input", () => {
  const before = JSON.parse(JSON.stringify(INITIAL_TREE));
  const newFile: TreeNode = { id: "new-1", name: "new.ts", type: "file" };

  const after = insertNode(INITIAL_TREE, "src-utils", newFile);

  expect(INITIAL_TREE).toEqual(before);
  const utils = after.find((n) => n.id === "src")?.children?.find((n) => n.id === "src-utils");
  expect(utils?.children?.map((c) => c.name)).toEqual(["index.ts", "new.ts"]);
});

test("insertNode with a null parent appends at the top level", () => {
  const newFolder: TreeNode = { id: "new-2", name: "docs", type: "folder", children: [] };
  const after = insertNode(INITIAL_TREE, null, newFolder);

  expect(after[after.length - 1]).toEqual(newFolder);
});

test("renameNode renames a deeply nested node by id, not position", () => {
  const after = renameNode(INITIAL_TREE, "components-button", "PrimaryButton.tsx");

  const button = after
    .find((n) => n.id === "src")
    ?.children?.find((n) => n.id === "src-components")
    ?.children?.find((n) => n.id === "components-button");
  expect(button?.name).toBe("PrimaryButton.tsx");
});

test("selecting an item highlights only it", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByText("public"));
  fireEvent.click(screen.getByText("assets"));

  const publicItem = screen.getByText("public").closest('[role="treeitem"]');
  const assetsItem = screen.getByText("assets").closest('[role="treeitem"]');
  expect(publicItem).toHaveAttribute("aria-selected", "false");
  expect(assetsItem).toHaveAttribute("aria-selected", "true");
});

test("rename and delete are disabled until something is selected", () => {
  render(<Explorer />);

  expect(screen.getByRole("button", { name: "Rename" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

  fireEvent.click(screen.getByText("README.md"));

  expect(screen.getByRole("button", { name: "Rename" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
});

test("creating a new top-level file adds it to the tree", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByRole("button", { name: "New File" }));
  const input = screen.getByLabelText("New file name");
  fireEvent.change(input, { target: { value: "CHANGELOG.md" } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(screen.getByText("CHANGELOG.md")).toBeInTheDocument();
});

test("renaming the selected item updates its label", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByText("README.md"));
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));

  const input = screen.getByLabelText("Rename README.md");
  fireEvent.change(input, { target: { value: "GUIDE.md" } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(screen.queryByText("README.md")).not.toBeInTheDocument();
  expect(screen.getByText("GUIDE.md")).toBeInTheDocument();
});

test("deleting a selected top-level item removes it and clears selection", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByText("README.md"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.queryByText("README.md")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
});
