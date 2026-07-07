import { useState } from "react";
import type { TransactionStatus } from "../../workspace/types";
import { TRANSACTIONS } from "../../workspace/data";

// Step 1 reference solution: working client-side pagination over the filtered
// rows. It's the straightforward, naive version — correct as long as the filter
// doesn't change — but it stores the page index and never reconciles it when the
// filtered row count shrinks, which is the out-of-range bug Step 2 fixes.
const PAGE_SIZE = 8;
type Filter = TransactionStatus | "all";

export function TransactionsTable() {
  const [status, setStatus] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  const filtered = status === "all" ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.status === status);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
        <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
          Previous
        </button>
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
