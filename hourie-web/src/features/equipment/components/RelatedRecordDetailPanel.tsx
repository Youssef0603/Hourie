import { useEffect, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { InsuranceDetailPanel } from "../../insurance/components/InsuranceDetailPanel";
import type { InsurancePolicy } from "../../insurance/types";
import { fetchTemporaryAdmission } from "../../temporary-admissions/api";
import { TemporaryAdmissionDetails } from "../../temporary-admissions/components/TemporaryAdmissionDetails";
import type { TemporaryAdmission } from "../../temporary-admissions/types";

export function RelatedRecordDetailPanel({
  record,
  onClose,
}: {
  record: { type: "insurance" | "temporary-admission"; id: number };
  onClose: () => void;
}) {
  const [item, setItem] = useState<InsurancePolicy | TemporaryAdmission | null>(
    null,
  );

  useEffect(() => {
    if (record.type === "insurance") {
      apiRequest<{ data: InsurancePolicy }>(
        `/api/v1/insurance-policies/${record.id}`,
      )
        .then((result) => setItem(result.data))
        .catch(() => setItem(null));
      return;
    }
    fetchTemporaryAdmission(record.id)
      .then(setItem)
      .catch(() => setItem(null));
  }, [record]);

  if (!item) {
    return (
      <div className="detail-backdrop nested-detail-backdrop">
        <aside className="detail-panel">
          <LoadingSpinner label="Chargement…" />
        </aside>
      </div>
    );
  }

  if (record.type === "insurance") {
    const policy = item as InsurancePolicy;
    return (
      <InsuranceDetailPanel
        policy={policy}
        readOnly
        nested
        onClose={onClose}
        onEdit={() => undefined}
        onDocumentsChanged={() => undefined}
        onDeleted={() => undefined}
      />
    );
  }

  return (
    <TemporaryAdmissionDetails
      item={item as TemporaryAdmission}
      canManage={false}
      nested
      onClose={onClose}
      onEdit={() => undefined}
      onChanged={() => undefined}
      onDeleted={() => undefined}
    />
  );
}
