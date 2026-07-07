import type { Transaction } from "./types";

// A fixed slice of a transactions ledger. In a real app this would come from an
// API; here it's in-memory and constant so the table logic is the focus. 23 rows,
// so 8-per-page pagination yields three pages, and each status filter yields a
// different number of pages.
export const TRANSACTIONS: Transaction[] = [
  { id: "TX-1001", customer: "Ada Lovelace", date: "2024-01-03", amount: 1240.0, status: "paid" },
  { id: "TX-1002", customer: "Bruno Katz", date: "2024-01-05", amount: 89.5, status: "pending" },
  { id: "TX-1003", customer: "Chloe Park", date: "2024-01-06", amount: 540.0, status: "paid" },
  { id: "TX-1004", customer: "Diego Marsh", date: "2024-01-08", amount: 1999.99, status: "overdue" },
  { id: "TX-1005", customer: "Elena Fischer", date: "2024-01-09", amount: 305.25, status: "paid" },
  { id: "TX-1006", customer: "Farid Naderi", date: "2024-01-11", amount: 76.0, status: "pending" },
  { id: "TX-1007", customer: "Grace Okoro", date: "2024-01-12", amount: 1420.1, status: "paid" },
  { id: "TX-1008", customer: "Hassan Ali", date: "2024-01-14", amount: 250.0, status: "overdue" },
  { id: "TX-1009", customer: "Ivy Chen", date: "2024-01-15", amount: 640.75, status: "pending" },
  { id: "TX-1010", customer: "Jonas Vidal", date: "2024-01-17", amount: 115.0, status: "paid" },
  { id: "TX-1011", customer: "Keiko Sato", date: "2024-01-18", amount: 980.0, status: "paid" },
  { id: "TX-1012", customer: "Liam Brady", date: "2024-01-20", amount: 42.0, status: "pending" },
  { id: "TX-1013", customer: "Mara Blum", date: "2024-01-21", amount: 1750.0, status: "overdue" },
  { id: "TX-1014", customer: "Noah Rees", date: "2024-01-23", amount: 512.4, status: "paid" },
  { id: "TX-1015", customer: "Omar Said", date: "2024-01-24", amount: 88.88, status: "pending" },
  { id: "TX-1016", customer: "Priya Nair", date: "2024-01-26", amount: 1330.0, status: "paid" },
  { id: "TX-1017", customer: "Quinn Rivera", date: "2024-01-27", amount: 205.0, status: "paid" },
  { id: "TX-1018", customer: "Rosa Lopez", date: "2024-01-29", amount: 460.0, status: "pending" },
  { id: "TX-1019", customer: "Sven Aas", date: "2024-01-30", amount: 725.5, status: "paid" },
  { id: "TX-1020", customer: "Tomas Vega", date: "2024-02-01", amount: 1580.0, status: "overdue" },
  { id: "TX-1021", customer: "Uma Devi", date: "2024-02-02", amount: 310.0, status: "pending" },
  { id: "TX-1022", customer: "Zed Miller", date: "2024-02-04", amount: 95.0, status: "overdue" },
  { id: "TX-1023", customer: "Wendy Cho", date: "2024-02-05", amount: 1215.0, status: "paid" },
];
