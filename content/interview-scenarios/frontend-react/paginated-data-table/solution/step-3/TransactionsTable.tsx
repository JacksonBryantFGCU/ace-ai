import { useState } from "react";
import type { TransactionStatus } from "../../workspace/types";
import { TRANSACTIONS } from "../../workspace/data";
import { usePagination } from "./usePagination";

// Step 3 reference solution: the pagination logic (page index, page count, current
// slice, clamping, and controls) is extracted into a reusable `usePagination` hook
// so another screen can page a list without copy-paste. Behavior is identical to
// Step 2 — this is one valid shape; the step is graded on reusability, not on the
// exact hook signature.
const PAGE_SIZE = 8;
type Filter = TransactionStatus | "all";

export function TransactionsTable() {
  const [status, setStatus] = useState<Filter>("all");
  const filtered = status === "all" ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.status === status);
  const { page, pageCount, items, canPrev, canNext, next, prev } = usePagination(filtered, PAGE_SIZE);

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
          {items.map((t) => (
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
        <button type="button" onClick={prev} disabled={!canPrev}>
          Previous
        </button>
        <span>
          Page {page} of {pageCount}
        </span>
        <button type="button" onClick={next} disabled={!canNext}>
          Next
        </button>
      </div>
    </div>
  );
}
