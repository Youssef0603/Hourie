import { useState, type ReactNode } from "react";

export function PaginatedDocumentList<T extends { id: number }>({
  documents,
  emptyMessage,
  renderDocument,
}: {
  documents: T[];
  emptyMessage: string;
  renderDocument: (document: T) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(documents.length / 3));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = documents.slice(currentPage * 3, currentPage * 3 + 3);

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
