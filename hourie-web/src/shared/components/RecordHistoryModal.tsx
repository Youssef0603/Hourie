import { EmptyState } from "./EmptyState";
import { LoadingSpinner } from "./LoadingSpinner";
import { Modal } from "./Modal";

export type RecordHistoryEntry = {
  id: number;
  action: string;
  actor: { id: number; name: string } | null;
  occurred_at: string;
};

type RecordHistoryModalProps = {
  title: string;
  entries: RecordHistoryEntry[];
  actionLabels: Record<string, string>;
  emptyDescription: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
};

const historyDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

export function RecordHistoryModal({ title, entries, actionLabels, emptyDescription, loading = false, error, onClose }: RecordHistoryModalProps) {
  return <Modal title={title} onClose={onClose}>
    {loading ? <LoadingSpinner label="Chargement de l’historique…" /> : error ? <div className="form-alert" role="alert">{error}</div> : entries.length ? <div className="audit-list audit-modal-list">
      {entries.map((entry) => <article key={entry.id}>
        <span className="audit-dot" aria-hidden="true" />
        <div>
          <strong>{actionLabels[entry.action] ?? "Modification enregistrée"}</strong>
          <p>Par {entry.actor?.name ?? "le système"} · <time dateTime={entry.occurred_at}>{historyDate(entry.occurred_at)}</time></p>
        </div>
      </article>)}
    </div> : <EmptyState compact icon="history" title="Aucun historique disponible" description={emptyDescription} />}
  </Modal>;
}
