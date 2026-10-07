import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";

export function RelatedDetailRequestState({
  status,
  onClose,
  onRetry,
}: {
  status: "loading" | "error";
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      className="detail-backdrop nested-detail-backdrop"
      onMouseDown={onClose}
    >
      <aside
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Détail lié"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">Détail lié</p>
            <h2>{status === "loading" ? "Chargement" : "Détail indisponible"}</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content related-detail-request-state">
          {status === "loading" ? (
            <LoadingSpinner className="detail-loading" label="Chargement…" />
          ) : (
            <EmptyState
              compact
              icon="refresh"
              title="Impossible de charger ce détail."
              description="Vérifiez votre connexion puis réessayez."
              action={
                <button
                  className="equipment-edit-button detail-toolbar-button"
                  type="button"
                  onClick={onRetry}
                >
                  <ActionIcon name="refresh" />
                  Réessayer
                </button>
              }
            />
          )}
        </div>
      </aside>
    </div>
  );
}
