import { fr } from "../../i18n/fr";
import type { PaginationMeta } from "../api/pagination";

type PaginationProps = {
  meta: Pick<PaginationMeta, "current_page" | "last_page" | "from" | "to" | "total">;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
  /** Hide the bar when every result fits on one page (default). */
  hideWhenSinglePage?: boolean;
};

export function Pagination({
  meta,
  onPageChange,
  disabled = false,
  label = fr.equipment.pagination,
  hideWhenSinglePage = true,
}: PaginationProps) {
  const { current_page: page, last_page: lastPage } = meta;
  if (hideWhenSinglePage && lastPage <= 1) return null;

  return (
    <nav className="pagination" aria-label={label}>
      <span>{fr.equipment.results(meta.from, meta.to, meta.total)}</span>
      <div>
        <button
          type="button"
          disabled={page <= 1 || disabled}
          onClick={() => onPageChange(page - 1)}
        >
          {fr.common.previous}
        </button>
        <span>{fr.equipment.page(page, lastPage)}</span>
        <button
          type="button"
          disabled={page >= lastPage || disabled}
          onClick={() => onPageChange(page + 1)}
        >
          {fr.common.next}
        </button>
      </div>
    </nav>
  );
}
