import "@testing-library/jest-dom/vitest";
import { afterEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import type { User } from "../workspace/types";
import { UserSearch } from "../workspace/UserSearch";
import { searchUsers } from "../workspace/api";

// Step 2's graded contract: the LATEST query always wins, even when an earlier
// request resolves last. This asserts the observable outcome only — an ignore
// flag, an AbortController, or a latest-query comparison all satisfy it equally.
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

test("shows results for the latest query even if an earlier request resolves last", async () => {
  const firstRequest = deferred(); // for the earlier query "al"
  const secondRequest = deferred(); // for the later query "ali"
  mockSearch.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise);

  render(<UserSearch />);
  const box = screen.getByRole("searchbox");
  fireEvent.change(box, { target: { value: "al" } });
  fireEvent.change(box, { target: { value: "ali" } });

  // Out-of-order: the LATER query ("ali") resolves first...
  await act(async () => {
    secondRequest.resolve([{ id: 1, name: "Alice Nguyen", email: "alice@example.com" }]);
  });
  // ...and the EARLIER, now-stale query ("al") resolves last.
  await act(async () => {
    firstRequest.resolve([{ id: 2, name: "Alfred Stone", email: "alfred@example.com" }]);
  });

  // The latest query's results must remain; the stale response must be ignored.
  expect(screen.getByText(/Alice Nguyen/)).toBeInTheDocument();
  expect(screen.queryByText(/Alfred Stone/)).not.toBeInTheDocument();
});
