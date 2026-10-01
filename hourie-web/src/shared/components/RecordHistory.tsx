import { EmptyState } from "./EmptyState";
import { LoadingSpinner } from "./LoadingSpinner";

export type RecordHistoryEntry = {
  id: number;
  action: string;
  actor: { id: number; name: string } | null;
  occurred_at: string;
};

type RecordHistoryProps = {
  entries: RecordHistoryEntry[];
  actionLabels: Record<string, string>;
  emptyDescription: string;
  loading?: boolean;
  error?: string;
};

const historyDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

export function RecordHistory({ entries, actionLabels, emptyDescription, loading = false, error }: RecordHistoryProps) {
  if (loading) return <LoadingSpinner label="Chargement de l’historique…" />;
  if (error) return <div className="form-alert" role="alert">{error}</div>;
  if (!entries.length) return <EmptyState compact icon="history" title="Aucun historique disponible" description={emptyDescription} />;

  return <div className="audit-list detail-audit-list">
    {entries.map((entry) => <article key={entry.id}>
      <span className="audit-dot" aria-hidden="true" />
      <div>
        <strong>{actionLabels[entry.action] ?? "Modification enregistrée"}</strong>
        <p>Par {entry.actor?.name ?? "le système"} · <time dateTime={entry.occurred_at}>{historyDate(entry.occurred_at)}</time></p>
      </div>
    </article>)}
  </div>;
}
