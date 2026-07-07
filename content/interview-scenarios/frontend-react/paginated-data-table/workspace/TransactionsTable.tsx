import { useState } from "react";
import type { TransactionStatus } from "./types";
import { TRANSACTIONS } from "./data";

type Filter = TransactionStatus | "all";

// A transactions table with a working status filter. It currently renders EVERY
// matching row at once — fine for a handful of rows, not for a real ledger.
//
// TODO (Step 1): add client-side pagination — show 8 rows per page, with Previous
// and Next controls and a "Page X of Y" indicator. Disable Previous on the first
// page and Next on the last. (The filter above should keep working.)
export function TransactionsTable() {
  const [status, setStatus] = useState<Filter>("all");
  const filtered = status === "all" ? TRANSACTIONS : TRANSACTIONS.filter((t) => t.status === status);

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
          {filtered.map((t) => (
            <tr key={t.id}>
              <td>{t.customer}</td>
              <td>{t.date}</td>
              <td>${t.amount.toFixed(2)}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
