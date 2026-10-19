import { z } from "zod";

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 20;

// Shape of every paged list: `nextCursor` is opaque and absent on the last page.
export const Paged = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().optional() });

export interface Paged<T> {
  items: T[];
  nextCursor?: string;
}

// Query values arrive as strings, so the limit is coerced.
export const PagingQuery = z.object({
  cursor: z.string().min(1).max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PagingQuery = z.infer<typeof PagingQuery>;
