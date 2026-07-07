export const config = {
  title: "Banking Transfers API Explorer",
  defaultExampleId: "list-accounts",
};

export const apiExamples = [
  { id: "list-accounts", label: "List accounts", method: "GET", path: "/accounts" },
  { id: "open-accounts", label: "Open accounts", method: "GET", path: "/accounts?status=open" },
  { id: "customer-accounts", label: "Customer accounts", method: "GET", path: "/accounts?customer_id=1" },
  { id: "account-detail", label: "Account detail", method: "GET", path: "/accounts/1" },
  {
    id: "create-transfer",
    label: "Create transfer",
    method: "POST",
    path: "/transfers",
    body: {
      idempotency_key: "transfer_preview_001",
      from_account_id: 1,
      to_account_id: 2,
      amount_cents: 2500,
      description: "Preview transfer",
    },
  },
  {
    id: "duplicate-transfer",
    label: "Retry transfer",
    method: "POST",
    path: "/transfers",
    body: {
      idempotency_key: "transfer_001",
      from_account_id: 1,
      to_account_id: 2,
      amount_cents: 2500,
      description: "Ignored duplicate payload",
    },
  },
  { id: "transfer-detail", label: "Transfer detail", method: "GET", path: "/transfers/1" },
];
