import { useState, type ReactNode } from "react";

export function PaginatedDocumentList<T extends { id: number }>({
  documents,
  emptyMessage,
  renderDocument,
  pageSize = 3,
}: {
  documents: T[];
  emptyMessage: string;
  renderDocument: (document: T) => ReactNode;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const safePageSize = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(documents.length / safePageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = documents.slice(
    currentPage * safePageSize,
    currentPage * safePageSize + safePageSize,
  );

  if (!documents.length) {
    return <p className="document-list-empty">{emptyMessage}</p>;
  }

  return (
    <div className="paginated-document-list">
      <div className="invoice-list">{visible.map(renderDocument)}</div>
      {pageCount > 1 && (
        <nav
          className="document-list-pagination"
          aria-label="Pagination des documents"
        >
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Précédent
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            Suivant
          </button>
        </nav>
      )}
    </div>
  );
}
