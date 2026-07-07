import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Explorer } from "../workspace/Explorer";
import { deleteNode } from "../workspace/tree";
import { INITIAL_TREE } from "../workspace/initialTree";

// Step 3's graded contract: deleting a node works no matter how deep it
// sits, not just at the top level.
afterEach(cleanup);

test("deleteNode removes a deeply nested node, not just top-level ones", () => {
  const after = deleteNode(INITIAL_TREE, "components-button");

  const components = after.find((n) => n.id === "src")?.children?.find((n) => n.id === "src-components");
  expect(components?.children?.map((c) => c.id)).toEqual(["components-card"]);
});

test("deleteNode removes a nested folder along with all of its descendants", () => {
  const after = deleteNode(INITIAL_TREE, "src-components");

  const src = after.find((n) => n.id === "src");
  expect(src?.children?.some((c) => c.id === "src-components")).toBe(false);
  expect(after.flatMap((n) => n.children ?? [])).not.toContainEqual(
    expect.objectContaining({ id: "components-button" }),
  );
});

test("deleting a deeply selected file removes it from the rendered tree", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByRole("button", { name: "Expand src" }));
  fireEvent.click(screen.getByRole("button", { name: "Expand components" }));
  fireEvent.click(screen.getByText("Button.tsx"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();
  expect(screen.getByText("Card.tsx")).toBeInTheDocument();
});

test("deleting a nested folder removes its children with it", () => {
  render(<Explorer />);

  fireEvent.click(screen.getByRole("button", { name: "Expand src" }));
  fireEvent.click(screen.getByText("components"));
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.queryByText("components")).not.toBeInTheDocument();
  expect(screen.queryByText("Button.tsx")).not.toBeInTheDocument();
  expect(screen.queryByText("Card.tsx")).not.toBeInTheDocument();
  expect(screen.getByText("utils")).toBeInTheDocument();
});
