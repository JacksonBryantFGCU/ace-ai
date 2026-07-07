import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.TransactionsTable;

type Mode = "default" | "empty" | "large-dataset";

interface PreviewRow {
  id: string;
  customer: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
}

// "default"/"mobile" render the ACTUAL live candidate code — the starter's
// 23-row ledger, all rendered at once (pagination isn't wired up yet).
// "empty" illustrates a filter with zero matches; "large-dataset" illustrates
// a much bigger ledger at realistic pagination density (the kind of volume
// pagination actually exists for). Both are self-contained, deterministic,
// read-only mock UI.
const NAMES = [
  "Ada Lovelace", "Bruno Katz", "Chloe Park", "Diego Marsh", "Elena Fischer", "Farid Naderi",
  "Grace Okoro", "Hassan Ali", "Ivy Chen", "Jonas Vidal", "Keiko Sato", "Liam Brady",
];
const STATUSES: PreviewRow["status"][] = ["paid", "pending", "overdue"];

function largeDataset(): PreviewRow[] {
  return Array.from({ length: 120 }, (_, i) => ({
    id: `TX-${2000 + i}`,
    customer: NAMES[i % NAMES.length]!,
    date: `2024-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`,
    amount: 25 + ((i * 37) % 2000) / 10,
    status: STATUSES[i % STATUSES.length]!,
  }));
}

const PAGE_SIZE = 8;

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : (
        <IllustrativeTable rows={mode === "empty" ? [] : largeDataset()} />
      )}
    </Frame>
  );
}

function IllustrativeTable({ rows }: { rows: PreviewRow[] }) {
  const page = rows.slice(0, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  return (
    <div>
      <label>
        Status
        <select value="all" onChange={() => {}} aria-label="Filter by status" style={{ marginLeft: 8 }}>
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </label>

      {rows.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>No transactions match this filter.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr>
                {["Customer", "Date", "Amount", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: "6px 4px" }}>{t.customer}</td>
                  <td style={{ padding: "6px 4px" }}>{t.date}</td>
                  <td style={{ padding: "6px 4px" }}>${t.amount.toFixed(2)}</td>
                  <td style={{ padding: "6px 4px" }}>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <button disabled aria-label="Previous page">Previous</button>
            <span style={{ color: "#6b7280", fontSize: 13 }}>Page 1 of {totalPages}</span>
            <button disabled={totalPages <= 1} aria-label="Next page">Next</button>
          </div>
        </>
      )}
    </div>
  );
}
