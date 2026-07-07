export const config = {
  title: "Product Catalog API Explorer",
  defaultExampleId: "list-products",
};

export const apiExamples = [
  {
    id: "list-products",
    label: "List products",
    method: "GET",
    path: "/products",
  },
  {
    id: "get-product",
    label: "Get product by ID",
    method: "GET",
    path: "/products/1",
  },
  {
    id: "filter-electronics",
    label: "Filter electronics",
    method: "GET",
    path: "/products?category=electronics",
  },
  {
    id: "filter-active",
    label: "Filter active products",
    method: "GET",
    path: "/products?active=true",
  },
  {
    id: "sort-price",
    label: "Sort by price",
    method: "GET",
    path: "/products?sort=price",
  },
  {
    id: "create-product",
    label: "Create product",
    method: "POST",
    path: "/products",
    body: {
      name: "Desk Lamp",
      category: "home",
      price_cents: 3999,
      stock: 12,
      is_active: true,
    },
  },
];
