import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginationMeta } from "./api/pagination";

type PageResponse<T> = { data?: T[]; meta?: PaginationMeta | null };

/**
 * One page of a server list, with the search/filter debounce, loading and
 * error states every list screen needs.
 *
 * `load` fetches a page with the current filters; wrap it in useCallback so
 * it only changes when a filter changes. Typing waits `delayMs` before
 * loading, and a response that arrives after a newer request is dropped, so
 * a slow answer can never overwrite the results of a later search.
 */
export function usePaginatedList<T, R extends PageResponse<T> = PageResponse<T>>(
  load: (page: number) => Promise<R>,
  errorMessage: string | ((caught: unknown) => string),
  delayMs = 200,
) {
  const [items, setItems] = useState<T[]>([]);
  const [response, setResponse] = useState<R | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const fetchPage = useCallback(async (pageToLoad: number) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const result = await load(pageToLoad);
      if (requestId !== latestRequest.current) return;
      setItems(result.data ?? []);
      setMeta(result.meta ?? null);
      setResponse(result);
      setError(null);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(typeof errorMessage === "function" ? errorMessage(caught) : errorMessage);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [load, errorMessage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchPage(page), delayMs);
    return () => window.clearTimeout(timer);
  }, [fetchPage, page, delayMs]);

  /** Loads the current page again, at once (after a save or a delete). */
  const reload = useCallback(() => fetchPage(page), [fetchPage, page]);

  // `error` is the list's own load error; a page keeps its other messages
  // (save or delete failures) in its own state so a reload never hides them.
  return { items, setItems, meta, response, page, setPage, loading, error, reload };
}
