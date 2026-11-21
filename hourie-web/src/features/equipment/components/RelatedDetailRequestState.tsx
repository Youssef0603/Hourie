import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { operationPhrase as t } from "../../../i18n/operations";

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
        aria-label={t("Détail lié")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">{t("Détail lié")}</p>
            <h2>{status === "loading" ? t("Chargement") : t("Détail indisponible")}</h2>
          </div>
          <button type="button" aria-label={t("Fermer")} onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content related-detail-request-state">
          {status === "loading" ? (
            <LoadingSpinner className="detail-loading" label={t("Chargement…")} />
          ) : (
            <EmptyState
              compact
              icon="refresh"
              title={t("Impossible de charger ce détail.")}
              description={t("Vérifiez votre connexion puis réessayez.")}
              action={
                <button
                  className="equipment-edit-button detail-toolbar-button"
                  type="button"
                  onClick={onRetry}
                >
                  <ActionIcon name="refresh" />
                  {t("Réessayer")}
                </button>
              }
            />
          )}
        </div>
      </aside>
    </div>
  );
}
