import { useEffect, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { operationPhrase } from "../../../i18n/operations";
import {
  RecordHistory,
  type RecordHistoryEntry,
} from "../../../shared/components/RecordHistory";
import type { InsurancePolicy as Policy } from "../types";

export function InsuranceHistory({ policy }: { policy: Policy }) {
  const [history, setHistory] = useState<RecordHistoryEntry[]>(
    policy.changes ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ data: Policy }>(`/api/v1/insurance-policies/${policy.id}`)
      .then((response) => {
        if (active) setHistory(response.data.changes ?? []);
      })
      .catch(() => {
        if (active)
          setError(operationPhrase("Impossible de charger l’historique de cette police."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [policy.id]);

  return (
    <details id={`insurance-history-${policy.id}`} className="detail-section">
      <summary>
        <h3>
          <ActionIcon name="history" />
          {operationPhrase("Historique")}
        </h3>
        <ActionIcon name="expand" />
      </summary>
      <div className="detail-section-body">
        <RecordHistory
          entries={history}
          loading={loading}
          error={error}
          actionLabels={{
            created: operationPhrase("Police créée"),
            updated: operationPhrase("Police modifiée"),
            document_added: operationPhrase("Document ajouté"),
            document_deleted: operationPhrase("Document supprimé"),
          }}
          emptyDescription={operationPhrase("Les modifications de cette police apparaîtront ici.")}
        />
      </div>
    </details>
  );
}
