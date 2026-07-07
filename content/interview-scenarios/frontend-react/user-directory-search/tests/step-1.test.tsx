import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor, cleanup } from "@testing-library/react";
import type { User } from "../workspace/types";
import { UserSearch } from "../workspace/UserSearch";
import { searchUsers } from "../workspace/api";

// The component talks to the directory only through ./api, so we mock that seam
// to control what each search returns and when it resolves. Tests assert only
// observable behavior (what the user sees), never internal structure — so any
// reasonable implementation passes.
vi.mock("../workspace/api", () => ({ searchUsers: vi.fn() }));
const mockSearch = vi.mocked(searchUsers);

function deferred<T = User[]>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders the users returned for a query", async () => {
  mockSearch.mockResolvedValue([{ id: 1, name: "Alice Nguyen", email: "alice@example.com" }]);

  render(<UserSearch />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ali" } });

  expect(await screen.findByText(/Alice Nguyen/)).toBeInTheDocument();
  expect(mockSearch).toHaveBeenCalledWith("ali");
});

test("does not show results until the request resolves", async () => {
  const d = deferred();
  mockSearch.mockReturnValue(d.promise);

  render(<UserSearch />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ali" } });

  // While the request is in flight, no results are shown.
  expect(screen.queryByText(/Alice Nguyen/)).not.toBeInTheDocument();

  await act(async () => {
    d.resolve([{ id: 1, name: "Alice Nguyen", email: "alice@example.com" }]);
  });

  expect(screen.getByText(/Alice Nguyen/)).toBeInTheDocument();
});

test("clears the results when a later search returns nothing", async () => {
  mockSearch.mockResolvedValueOnce([{ id: 1, name: "Alice Nguyen", email: "alice@example.com" }]);

  render(<UserSearch />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ali" } });
  expect(await screen.findByText(/Alice Nguyen/)).toBeInTheDocument();

  mockSearch.mockResolvedValueOnce([]);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });

  await waitFor(() => {
    expect(screen.queryByText(/Alice Nguyen/)).not.toBeInTheDocument();
  });
});
