import { useState } from "react";
import type { TransactionStatus } from "../../workspace/types";
import { TRANSACTIONS } from "../../workspace/data";

// Step 2 reference solution: the out-of-range bug is fixed by clamping the page
// index to the last valid page at render time. When a filter shrinks the list so
// the stored page no longer exists, `currentPage` falls back into range instead of
// slicing an empty window. This is one valid fix — resetting the page when the
// filter changes is equally acceptable; the tests assert the observable outcome.
const PAGE_SIZE = 8;
type Filter = TransactionStatus | "all";

export function TransactionsTable() {
  const [status, setStatus] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  const filtered = status === "all" ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.status === status);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Never trust the stored page blindly: keep it within [0, pageCount - 1] so a
  // shrunken result set can't leave us pointing past the end.
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as Filter)}>
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </label>

      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((t) => (
            <tr key={t.id}>
              <td>{t.customer}</td>
              <td>{t.date}</td>
              <td>${t.amount.toFixed(2)}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}>
          Previous
        </button>
        <span>
          Page {currentPage + 1} of {pageCount}
        </span>
        <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
