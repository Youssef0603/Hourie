import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { InsuranceDetailPanel } from "../../insurance/components/InsuranceDetailPanel";
import type { InsurancePolicy } from "../../insurance/types";
import { fetchTemporaryAdmission } from "../../temporary-admissions/api";
import { TemporaryAdmissionDetails } from "../../temporary-admissions/components/TemporaryAdmissionDetails";
import type { TemporaryAdmission } from "../../temporary-admissions/types";
import { RelatedDetailRequestState } from "./RelatedDetailRequestState";

export function RelatedRecordDetailPanel({
  record,
  onClose,
}: {
  record: { type: "insurance" | "temporary-admission"; id: number };
  onClose: () => void;
}) {
  const [item, setItem] = useState<InsurancePolicy | TemporaryAdmission | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    await Promise.resolve();
    setStatus("loading");
    setItem(null);

    try {
      const result = record.type === "insurance"
        ? (await apiRequest<{ data: InsurancePolicy }>(`/api/v1/insurance-policies/${record.id}`)).data
        : await fetchTemporaryAdmission(record.id);
      if (version !== requestVersion.current) return;
      setItem(result);
      setStatus("success");
    } catch {
      if (version === requestVersion.current) setStatus("error");
    }
  }, [record.id, record.type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestVersion.current += 1;
    };
  }, [load]);

  if (status !== "success" || !item) {
    return <RelatedDetailRequestState status={status === "error" ? "error" : "loading"} onClose={onClose} onRetry={load} />;
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
