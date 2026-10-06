import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import { getEquipmentItem } from "../api";
import type { Equipment, EquipmentFilterOptions } from "../types";
import { EquipmentDetailPanel } from "./EquipmentDetailPanel";

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

  useEffect(() => {
    getEquipmentItem(equipmentId)
      .then(setEquipment)
      .catch(() => setEquipment(null));
  }, [equipmentId]);

  return (
    <EquipmentDetailPanel
      user={user}
      language={language}
      selected={equipment}
      options={options}
      isLoadingDetail={equipment === null}
      isEditingEquipment={false}
      readOnly
      nested
      onClose={onClose}
      onDelete={() => undefined}
      onEditingChange={() => undefined}
      onChanged={() => undefined}
      onRefreshSelected={async () => {
        setEquipment(await getEquipmentItem(equipmentId));
      }}
      onMaintenanceChanged={async () => {
        setEquipment(await getEquipmentItem(equipmentId));
      }}
    />
  );
}
