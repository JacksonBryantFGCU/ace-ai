export const config = {
  title: "Order Management API Explorer",
  defaultExampleId: "list-orders",
};

export const apiExamples = [
  { id: "list-orders", label: "List orders", method: "GET", path: "/orders" },
  { id: "filter-pending", label: "Filter pending orders", method: "GET", path: "/orders?status=pending" },
  { id: "get-order", label: "Get order by ID", method: "GET", path: "/orders/1" },
  {
    id: "create-order",
    label: "Create order",
    method: "POST",
    path: "/orders",
    body: {
      customer_id: 1,
      items: [
        { product_id: 1, quantity: 2 },
        { product_id: 2, quantity: 1 },
      ],
    },
  },
  {
    id: "update-status",
    label: "Mark order paid",
    method: "PATCH",
    path: "/orders/1/status",
    body: { status: "paid" },
  },
];
