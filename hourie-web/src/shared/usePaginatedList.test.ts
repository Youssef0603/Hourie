import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedList } from "./usePaginatedList";

type Page = { data: string[]; meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null } };

function page(data: string[], current = 1): Page {
  return { data, meta: { current_page: current, last_page: 2, per_page: 10, total: data.length, from: 1, to: data.length } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("usePaginatedList", () => {
  it("loads the first page after the search delay", async () => {
    const load = vi.fn((pageNumber: number) => Promise.resolve(page(["a", "b"], pageNumber)));
    const { result } = renderHook(() => usePaginatedList<string, Page>(load, "Erreur", 0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(load).toHaveBeenCalledWith(1);
    expect(result.current.items).toEqual(["a", "b"]);
    expect(result.current.meta?.total).toBe(2);
  });

  it("never lets an older, slower answer overwrite a newer search", async () => {
    const slow = deferred<Page>();
    const fast = deferred<Page>();
    const { result, rerender } = renderHook(
      ({ term }) => usePaginatedList<string, Page>(term === "old" ? () => slow.promise : () => fast.promise, "Erreur", 0),
      { initialProps: { term: "old" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(true));
    rerender({ term: "new" });
    await act(async () => { await new Promise((done) => setTimeout(done, 5)); });

    await act(async () => { fast.resolve(page(["new result"])); });
    await act(async () => { slow.resolve(page(["old result"])); });

    expect(result.current.items).toEqual(["new result"]);
    expect(result.current.loading).toBe(false);
  });

  it("shows the error message when loading fails, and clears it on the next success", async () => {
    let fail = true;
    const load = vi.fn(() => (fail ? Promise.reject(new Error("down")) : Promise.resolve(page(["back"]))));
    const { result } = renderHook(() => usePaginatedList<string, Page>(load, "Impossible de charger.", 0));

    await waitFor(() => expect(result.current.error).toBe("Impossible de charger."));
    fail = false;
    await act(async () => { await result.current.reload(); });

    expect(result.current.error).toBeNull();
    expect(result.current.items).toEqual(["back"]);
  });

  it("loads the requested page when the page changes", async () => {
    const load = vi.fn((pageNumber: number) => Promise.resolve(page([`page ${pageNumber}`], pageNumber)));
    const { result } = renderHook(() => usePaginatedList<string, Page>(load, "Erreur", 0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(2));

    await waitFor(() => expect(result.current.items).toEqual(["page 2"]));
    expect(load).toHaveBeenLastCalledWith(2);
  });
});
