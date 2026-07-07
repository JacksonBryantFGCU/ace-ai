import { useState } from "react";

/** The current page's slice plus everything a pager UI needs to render controls. */
export interface Pagination<T> {
  /** 1-indexed page number, for display. */
  page: number;
  pageCount: number;
  /** The items on the current page. */
  items: T[];
  canPrev: boolean;
  canNext: boolean;
  next: () => void;
  prev: () => void;
}

/**
 * Reusable client-side pagination. Given a list and a page size, it owns the page
 * index and derives everything else — including clamping the page back into range
 * when `all` shrinks (the Step 2 fix), so any list can be paged without repeating
 * that logic.
 */
export function usePagination<T>(all: T[], pageSize: number): Pagination<T> {
  const [index, setIndex] = useState(0);

  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const current = Math.min(index, pageCount - 1);
  const items = all.slice(current * pageSize, current * pageSize + pageSize);

  return {
    page: current + 1,
    pageCount,
    items,
    canPrev: current > 0,
    canNext: current < pageCount - 1,
    next: () => setIndex(current + 1),
    prev: () => setIndex(current - 1),
  };
}
