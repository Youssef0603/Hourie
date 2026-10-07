import { useState } from "react";
import type { AuthenticatedUser } from "../../auth/types";
import { fr, type Language } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal } from "../../../shared/components/Modal";
import { assetCategory, isAssetCategoryCode } from "../assetCategories";
import { catalogLabel } from "../catalogs";
import { displayedValue } from "../equipmentDisplay";
import type { Equipment, EquipmentFilterOptions } from "../types";
import { EquipmentCoverageDetails } from "./EquipmentCoverageDetails";
import { EquipmentDetailSection } from "./EquipmentDetailSection";
import { EquipmentEditDrawer } from "./EquipmentEditDrawer";
import { EquipmentAuditHistory, GeneratorTransferHistory } from "./EquipmentHistoryDetails";
import { EquipmentImages } from "./EquipmentImages";
import { EquipmentInvoices } from "./EquipmentInvoices";
import {
  AssetSpecificationDetails,
  EquipmentAssignmentDetails,
  EquipmentIdentificationDetails,
  GeneratorTechnicalDetails,
} from "./EquipmentOverviewDetails";
import { GeneratorTransferForm } from "./GeneratorTransferForm";
import { MaintenanceSection } from "./MaintenanceSection";
import { RelatedRecordDetailPanel } from "./RelatedRecordDetailPanel";

type EquipmentDetailPanelProps = {
  user: AuthenticatedUser;
  language: Language;
  selected: Equipment | null;
  options: EquipmentFilterOptions | null;
  isLoadingDetail: boolean;
  isEditingEquipment: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEditingChange: (editing: boolean) => void;
  onChanged: (equipment: Equipment) => void;
  onRefreshSelected: () => Promise<void>;
  onMaintenanceChanged: () => Promise<void>;
  readOnly?: boolean;
  nested?: boolean;
};

type RelatedRecord = {
  type: "insurance" | "temporary-admission";
  id: number;
};

export function EquipmentDetailPanel({
  user,
  language,
  selected,
  options,
  isLoadingDetail,
  isEditingEquipment,
  onClose,
  onDelete,
  onEditingChange,
  onChanged,
  onRefreshSelected,
  onMaintenanceChanged,
  readOnly = false,
  nested = false,
}: EquipmentDetailPanelProps) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [relatedRecord, setRelatedRecord] = useState<RelatedRecord | null>(null);

  if (!selected && !isLoadingDetail) return null;

  const categoryCode = selected?.category.code ?? "generator";
  const isOtherAsset = isAssetCategoryCode(categoryCode);
  const assetDefinition = isOtherAsset ? assetCategory(categoryCode) : null;
  const isInsurableAsset = ["car", "truck_dumper", "equipment"].includes(categoryCode);
  const isSold = selected?.condition === "sold" || catalogLabel(
    options?.catalogs,
    "equipment_condition",
    selected?.condition ?? "",
  ).trim().toLocaleLowerCase("fr-FR") === "vendu";
  const canManageEquipment = !readOnly && user.permissions.manage_equipment;
  const canDeleteEquipment = !readOnly && user.permissions.delete_equipment;
  const canManageMaintenance = !readOnly && user.permissions.manage_maintenance;
  const canDeleteMaintenance = !readOnly && user.permissions.delete_maintenance;

  if (isEditingEquipment && selected && options) {
    return (
      <EquipmentEditDrawer
        categoryCode={categoryCode}
        equipment={selected}
        language={language}
        options={options}
        onClose={() => onEditingChange(false)}
        onChanged={(equipment) => {
          onChanged(equipment);
          onEditingChange(false);
        }}
      />
    );
  }

  const openHistory = () => {
    if (!selected) return;
    const section = document.getElementById(`equipment-history-${selected.id}`) as HTMLDetailsElement | null;
    if (!section) return;
    section.open = true;
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <>
      <div className={`detail-backdrop${nested ? " nested-detail-backdrop" : ""}`} onMouseDown={() => !isLoadingDetail && onClose()}>
        <aside
          className="detail-panel"
          role="dialog"
          aria-modal="true"
          aria-label={isOtherAsset ? fr.assets.details : fr.equipment.details}
          aria-live="polite"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {isLoadingDetail ? (
            <LoadingSpinner className="detail-loading" label={fr.common.loading} />
          ) : selected && (
            <>
              <DetailHeader equipment={selected} onClose={onClose} />
              <div className="detail-content">
                <DetailActions
                  isOtherAsset={isOtherAsset}
                  canManage={canManageEquipment && options !== null}
                  canDelete={canDeleteEquipment}
                  onEdit={() => onEditingChange(true)}
                  onDelete={onDelete}
                  onTransfer={() => setShowTransfer(true)}
                  onHistory={openHistory}
                />

                <EquipmentDetailSection title={fr.equipment.assignment} icon="location" defaultOpen className="detail-assignment">
                  <EquipmentAssignmentDetails equipment={selected} categoryCode={categoryCode} />
                </EquipmentDetailSection>

                {categoryCode === "generator" && (
                  <EquipmentDetailSection title="Historique des transferts" icon="transfer" defaultOpen className="detail-transfer-history">
                    <GeneratorTransferHistory changes={selected.changes.filter((change) => change.source === "transfer")} />
                  </EquipmentDetailSection>
                )}

                <EquipmentDetailSection title={fr.equipment.identification} icon="identification" defaultOpen className="detail-identification">
                  <EquipmentIdentificationDetails equipment={selected} categoryCode={categoryCode} catalogs={options?.catalogs} isSold={isSold} />
                </EquipmentDetailSection>

                <EquipmentCoverageDetails
                  equipment={selected}
                  showInsurance={isInsurableAsset}
                  readOnly={readOnly}
                  onOpenRecord={setRelatedRecord}
                />

                {assetDefinition && (
                  <EquipmentDetailSection title={fr.assets.specifications} icon="specifications" defaultOpen className="detail-characteristics">
                    <AssetSpecificationDetails equipment={selected} definition={assetDefinition} language={language} />
                  </EquipmentDetailSection>
                )}

                {!isOtherAsset && selected.generator_details && (
                  <EquipmentDetailSection title={fr.equipment.technicalDetails} icon="specifications" defaultOpen className="detail-characteristics">
                    <GeneratorTechnicalDetails equipment={selected} catalogs={options?.catalogs} />
                  </EquipmentDetailSection>
                )}

                <EquipmentDetailSection title={fr.equipment.observations} icon="note">
                  <p className="observations">{displayedValue(selected.observations)}</p>
                </EquipmentDetailSection>

                <EquipmentDetailSection title={fr.assets.photos} icon="photo">
                  <EquipmentImages equipment={selected} canManage={canManageEquipment} hideHeading onChanged={onRefreshSelected} />
                </EquipmentDetailSection>

                <EquipmentDetailSection title={fr.assets.invoices} icon="invoice">
                  <EquipmentInvoices equipment={selected} canManage={canManageEquipment} hideHeading onChanged={onRefreshSelected} />
                </EquipmentDetailSection>

                {!isOtherAsset && (
                  <EquipmentDetailSection title={fr.maintenance.count(selected.maintenances.length)} icon="maintenance">
                    <MaintenanceSection
                      equipment={selected}
                      employees={options?.employees ?? []}
                      canManage={canManageMaintenance}
                      canDelete={canDeleteMaintenance}
                      catalogs={options?.catalogs ?? []}
                      hideHeading
                      onChanged={onMaintenanceChanged}
                    />
                  </EquipmentDetailSection>
                )}

                <EquipmentDetailSection id={`equipment-history-${selected.id}`} title={fr.audit.button} icon="history">
                  <EquipmentAuditHistory equipment={selected} language={language} />
                </EquipmentDetailSection>
              </div>

              {showTransfer && options && (
                <Modal title={fr.equipment.transferTitle} onClose={() => setShowTransfer(false)}>
                  <GeneratorTransferForm
                    equipment={selected}
                    options={options}
                    onCancel={() => setShowTransfer(false)}
                    onTransferred={(equipment) => {
                      setShowTransfer(false);
                      onChanged(equipment);
                    }}
                  />
                </Modal>
              )}
            </>
          )}
        </aside>
      </div>

      {relatedRecord && (
        <RelatedRecordDetailPanel
          key={`${relatedRecord.type}-${relatedRecord.id}`}
          record={relatedRecord}
          onClose={() => setRelatedRecord(null)}
        />
      )}
    </>
  );
}

function DetailHeader({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  return (
    <header className="detail-header">
      <div>
        <p className="section-label">{equipment.category.name}</p>
        <h2>{equipment.asset_code}</h2>
        <p>{[equipment.brand, equipment.model].filter(Boolean).join(" ") || fr.common.notProvided}</p>
      </div>
      <button type="button" aria-label={fr.common.close} onClick={onClose}><ActionIcon name="close" /></button>
    </header>
  );
}

function DetailActions({
  isOtherAsset,
  canManage,
  canDelete,
  onEdit,
  onDelete,
  onTransfer,
  onHistory,
}: {
  isOtherAsset: boolean;
  canManage: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="detail-primary-actions">
      {canManage && <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={onEdit}><ActionIcon name="edit" />{fr.common.edit}</button>}
      {canDelete && <button className="danger-button detail-delete-button" type="button" onClick={onDelete}><ActionIcon name="delete" />{isOtherAsset ? fr.assets.delete : fr.equipment.deleteGenerator}</button>}
      {!isOtherAsset && canManage && <button className="equipment-transfer-button detail-toolbar-button" type="button" onClick={onTransfer}><ActionIcon name="transfer" />{fr.equipment.transfer}</button>}
      <button className="equipment-history-button detail-toolbar-button" type="button" onClick={onHistory}><ActionIcon name="history" />{fr.audit.viewButton}</button>
    </div>
  );
}
