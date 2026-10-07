import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import { getEquipmentItem } from "../api";
import type { Equipment, EquipmentFilterOptions } from "../types";
import { EquipmentDetailPanel } from "./EquipmentDetailPanel";
import { RelatedDetailRequestState } from "./RelatedDetailRequestState";

export function RelatedEquipmentDetailPanel({
  equipmentId,
  user,
  language,
  options,
  onClose,
}: {
  equipmentId: number;
  user: AuthenticatedUser;
  language: Language;
  options: EquipmentFilterOptions | null;
  onClose: () => void;
}) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    await Promise.resolve();
    setStatus("loading");
    setEquipment(null);
    try {
      const result = await getEquipmentItem(equipmentId);
      if (version !== requestVersion.current) return;
      setEquipment(result);
      setStatus("success");
    } catch {
      if (version === requestVersion.current) setStatus("error");
    }
  }, [equipmentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestVersion.current += 1;
    };
  }, [load]);

  if (status !== "success" || !equipment) {
    return <RelatedDetailRequestState status={status === "error" ? "error" : "loading"} onClose={onClose} onRetry={load} />;
  }

  return (
    <EquipmentDetailPanel
      user={user}
      language={language}
      selected={equipment}
      options={options}
      isLoadingDetail={false}
      isEditingEquipment={false}
      readOnly
      nested
      onClose={onClose}
      onDelete={() => undefined}
      onEditingChange={() => undefined}
      onChanged={() => undefined}
      onRefreshSelected={async () => {
        await load();
      }}
      onMaintenanceChanged={async () => {
        await load();
      }}
    />
  );
}
