import { useState, type ReactNode } from "react";
import type { AuthenticatedUser } from "../../auth/types";
import { fr, type Language } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal } from "../../../shared/components/Modal";
import { EquipmentEditForm } from "./EquipmentEditForm";
import { AssetForm } from "./AssetForm";
import {
  assetCategory,
  assetCategoryLabel,
  assetFieldLabel,
  isAssetCategoryCode,
} from "../assetCategories";
import { EquipmentImages } from "./EquipmentImages";
import { EquipmentInvoices } from "./EquipmentInvoices";
import { MaintenanceSection } from "./MaintenanceSection";
import { catalogBadgeStyle, catalogLabel } from "../catalogs";
import { displayedValue, locationName, measurement } from "../equipmentDisplay";
import type { Equipment, EquipmentFilterOptions } from "../types";
import { GeneratorTransferForm } from "./GeneratorTransferForm";
import { formatMoney } from "../../../shared/formatMoney";
import { EmptyState } from "../../../shared/components/EmptyState";
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
  const [relatedRecord, setRelatedRecord] = useState<{
    type: "insurance" | "temporary-admission";
    id: number;
  } | null>(null);
  if (!selected && !isLoadingDetail) return null;
  const categoryCode = selected?.category.code ?? "generator";
  const isSold =
    selected?.condition === "sold" ||
    catalogLabel(
      options?.catalogs,
      "equipment_condition",
      selected?.condition ?? "",
    )
      .trim()
      .toLocaleLowerCase("fr-FR") === "vendu";
  const isOtherAsset = isAssetCategoryCode(categoryCode);
  const isInsurableAsset = ["car", "truck_dumper", "equipment"].includes(
    categoryCode,
  );
  const assetDefinition = isOtherAsset ? assetCategory(categoryCode) : null;
  const canManageEquipment = !readOnly && user.permissions.manage_equipment;
  const canDeleteEquipment = !readOnly && user.permissions.delete_equipment;
  const canManageMaintenance = !readOnly && user.permissions.manage_maintenance;
  const canDeleteMaintenance = !readOnly && user.permissions.delete_maintenance;
  const openHistory = () => {
    if (!selected) return;
    const section = document.getElementById(
      `equipment-history-${selected.id}`,
    ) as HTMLDetailsElement | null;
    if (!section) return;
    section.open = true;
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

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

  return (
    <>
      <div
        className={`detail-backdrop${nested ? " nested-detail-backdrop" : ""}`}
        onMouseDown={() => !isLoadingDetail && onClose()}
      >
        <aside
          className="detail-panel"
          role="dialog"
          aria-modal="true"
          aria-label={isOtherAsset ? fr.assets.details : fr.equipment.details}
          aria-live="polite"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {isLoadingDetail ? (
            <LoadingSpinner
              className="detail-loading"
              label={fr.common.loading}
            />
          ) : (
            selected && (
              <>
                <header className="detail-header">
                  <div>
                    <p className="section-label">{selected.category.name}</p>
                    <h2>{selected.asset_code}</h2>
                    <p>
                      {[selected.brand, selected.model]
                        .filter(Boolean)
                        .join(" ") || fr.common.notProvided}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={fr.common.close}
                    onClick={onClose}
                  >
                    <ActionIcon name="close" />
                  </button>
                </header>
                <div className="detail-content">
                  <div
                    className={`detail-primary-actions${isEditingEquipment ? " editing" : ""}`}
                  >
                    {canManageEquipment && options && (
                      <button
                        className="equipment-edit-button detail-toolbar-button"
                        type="button"
                        onClick={() => onEditingChange(true)}
                      >
                        <ActionIcon name="edit" />
                        {fr.common.edit}
                      </button>
                    )}
                    {!isEditingEquipment && canDeleteEquipment && (
                      <button
                        className="danger-button detail-delete-button"
                        type="button"
                        onClick={onDelete}
                      >
                        <ActionIcon name="delete" />
                        {isOtherAsset
                          ? fr.assets.delete
                          : fr.equipment.deleteGenerator}
                      </button>
                    )}
                    {!isEditingEquipment &&
                      !isOtherAsset &&
                      options &&
                      canManageEquipment && (
                        <button
                          className="equipment-transfer-button detail-toolbar-button"
                          type="button"
                          onClick={() => setShowTransfer(true)}
                        >
                          <ActionIcon name="transfer" />
                          {fr.equipment.transfer}
                        </button>
                      )}
                    {!isEditingEquipment && (
                      <button
                        className="equipment-history-button detail-toolbar-button"
                        type="button"
                        onClick={openHistory}
                      >
                        <ActionIcon name="history" />
                        {fr.audit.viewButton}
                      </button>
                    )}
                  </div>
                  <DetailSection
                    title={fr.equipment.assignment}
                    icon="location"
                    defaultOpen
                    className="detail-assignment"
                  >
                    <dl>
                      <div>
                        <dt>{fr.equipment.project}</dt>
                        <dd>
                          {selected.current_project_assignment?.project.name ??
                            fr.common.notProvided}
                        </dd>
                      </div>
                      <div>
                        <dt>{fr.equipment.location}</dt>
                        <dd>{locationName(selected)}</dd>
                      </div>
                      <div>
                        <dt>
                          {categoryCode === "car"
                            ? fr.equipment.assignedTo
                            : fr.equipment.custodian}
                        </dt>
                        <dd>
                          {selected.responsible ? (
                            <>
                              {selected.responsible.name}
                              {selected.responsible_source === "site" && (
                                <small className="responsibility-source">
                                  {fr.equipment.inheritedFromSite}
                                </small>
                              )}
                            </>
                          ) : (
                            fr.common.notProvided
                          )}
                        </dd>
                      </div>
                    </dl>
                  </DetailSection>
                  {categoryCode === "generator" && (
                    <DetailSection
                      title="Historique des transferts"
                      icon="transfer"
                      defaultOpen
                      className="detail-transfer-history"
                    >
                      <GeneratorTransferHistory
                        changes={selected.changes.filter(
                          (change) => change.source === "transfer",
                        )}
                      />
                    </DetailSection>
                  )}
                  <DetailSection
                    title={fr.equipment.identification}
                    icon="identification"
                    defaultOpen
                    className="detail-identification"
                  >
                    <dl>
                      <div>
                        <dt>
                          {categoryCode === "car"
                            ? fr.equipment.registrationNumber
                            : fr.equipment.serialNumber}
                        </dt>
                        <dd>{displayedValue(selected.serial_number)}</dd>
                      </div>
                      {isOtherAsset && (
                        <div>
                          <dt>{fr.equipment.model}</dt>
                          <dd>{displayedValue(selected.model)}</dd>
                        </div>
                      )}
                      {!isOtherAsset && (
                        <div>
                          <dt>{fr.equipment.model}</dt>
                          <dd>{displayedValue(selected.model)}</dd>
                        </div>
                      )}
                      <div>
                        <dt>{fr.equipment.manufactureYear}</dt>
                        <dd>{displayedValue(selected.manufacture_year)}</dd>
                      </div>
                      <div>
                        <dt>{fr.equipment.purchaseDate}</dt>
                        <dd>{displayedValue(selected.purchase_date)}</dd>
                      </div>
                      <div>
                        <dt>{fr.equipment.condition}</dt>
                        <dd>
                          {selected.condition ? (
                            <span
                              className={`status-badge status-${selected.condition}`}
                              style={catalogBadgeStyle(
                                options?.catalogs,
                                "equipment_condition",
                                selected.condition,
                              )}
                            >
                              {catalogLabel(
                                options?.catalogs,
                                "equipment_condition",
                                selected.condition,
                              )}
                            </span>
                          ) : (
                            fr.common.notProvided
                          )}
                        </dd>
                      </div>
                      {categoryCode === "generator" && isSold && (
                        <div>
                          <dt>Acheteur</dt>
                          <dd>
                            {selected.generator_details?.sold_to ??
                              fr.common.notProvided}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>{fr.equipment.situation}</dt>
                        <dd>
                          {selected.operational_situation ? (
                            <span
                              className="status-badge"
                              style={catalogBadgeStyle(
                                options?.catalogs,
                                "operational_situation",
                                selected.operational_situation,
                              )}
                            >
                              {catalogLabel(
                                options?.catalogs,
                                "operational_situation",
                                selected.operational_situation,
                              )}
                            </span>
                          ) : (
                            fr.common.notProvided
                          )}
                        </dd>
                      </div>
                    </dl>
                  </DetailSection>
                  {isInsurableAsset && (
                    <DetailSection title="Assurance" icon="invoice" defaultOpen>
                      <EquipmentInsuranceCoverage
                        policies={selected.insurance_policies}
                        onOpenPolicy={
                          readOnly
                            ? undefined
                            : (id) =>
                                setRelatedRecord({ type: "insurance", id })
                        }
                      />
                    </DetailSection>
                  )}
                  <DetailSection
                    title="Admission temporaire"
                    icon="identification"
                    defaultOpen
                  >
                    <EquipmentTemporaryAdmissions
                      admissions={selected.temporary_admissions}
                      onOpenAdmission={
                        readOnly
                          ? undefined
                          : (id) =>
                              setRelatedRecord({
                                type: "temporary-admission",
                                id,
                              })
                      }
                    />
                  </DetailSection>
                  {isOtherAsset && assetDefinition && (
                    <DetailSection
                      title={fr.assets.specifications}
                      icon="specifications"
                      defaultOpen
                      className="detail-characteristics"
                    >
                      <dl>
                        {assetDefinition.fields.map((field) => {
                          const value = selected.asset_details?.[field.key];
                          const isCost =
                            field.key === "purchase_price" ||
                            field.key === "shipping_cost";
                          const display =
                            value === null ||
                            value === undefined ||
                            value === ""
                              ? fr.common.notProvided
                              : isCost
                                ? formatMoney(
                                    value,
                                    priceCurrencyLabel(
                                      selected.asset_details?.[
                                        `${field.key}_currency`
                                      ],
                                    ),
                                  )
                                : `${value}${field.unit ? ` ${field.unit}` : ""}`;

                          return (
                            <div key={field.key}>
                              <dt>{assetFieldLabel(field, language)}</dt>
                              <dd>{display}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    </DetailSection>
                  )}
                  {!isOtherAsset && selected.generator_details && (
                    <DetailSection
                      title={fr.equipment.technicalDetails}
                      icon="specifications"
                      defaultOpen
                      className="detail-characteristics"
                    >
                      <dl>
                        <div>
                          <dt>{fr.equipment.apparentPower}</dt>
                          <dd>
                            {measurement(
                              selected.generator_details.apparent_power_kva,
                              "kVA",
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.activePower}</dt>
                          <dd>
                            {measurement(
                              selected.generator_details.active_power_kw,
                              "kW",
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.voltage}</dt>
                          <dd>
                            {displayedValue(
                              selected.generator_details.voltage_rating,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.frequency}</dt>
                          <dd>
                            {displayedValue(
                              selected.generator_details.frequency_hz,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.current}</dt>
                          <dd>
                            {displayedValue(
                              selected.generator_details.current_rating,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.phases}</dt>
                          <dd>
                            {displayedValue(selected.generator_details.phases)}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.fuel}</dt>
                          <dd>
                            {selected.generator_details.fuel_type ? (
                              <span
                                className="status-badge"
                                style={catalogBadgeStyle(
                                  options?.catalogs,
                                  "fuel_type",
                                  selected.generator_details.fuel_type,
                                )}
                              >
                                {catalogLabel(
                                  options?.catalogs,
                                  "fuel_type",
                                  selected.generator_details.fuel_type,
                                )}
                              </span>
                            ) : (
                              fr.common.notProvided
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.tank}</dt>
                          <dd>
                            {displayedValue(
                              selected.generator_details.tank_capacity_litres,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.engineHours}</dt>
                          <dd>
                            {displayedValue(
                              selected.generator_details.current_engine_hours,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>{fr.equipment.purchasePrice}</dt>
                          <dd>
                            {selected.generator_details.purchase_price_fcfa ===
                            null
                              ? fr.common.notProvided
                              : formatMoney(
                                  selected.generator_details
                                    .purchase_price_fcfa,
                                )}
                          </dd>
                        </div>
                      </dl>
                    </DetailSection>
                  )}
                  <DetailSection title={fr.equipment.observations} icon="note">
                    <p className="observations">
                      {displayedValue(selected.observations)}
                    </p>
                  </DetailSection>
                  <DetailSection title={fr.assets.photos} icon="photo">
                    <EquipmentImages
                      equipment={selected}
                      canManage={canManageEquipment}
                      hideHeading
                      onChanged={async () => {
                        await onRefreshSelected();
                      }}
                    />
                  </DetailSection>
                  <DetailSection title={fr.assets.invoices} icon="invoice">
                    <EquipmentInvoices
                      equipment={selected}
                      canManage={canManageEquipment}
                      hideHeading
                      onChanged={async () => {
                        await onRefreshSelected();
                      }}
                    />
                  </DetailSection>
                  {!isOtherAsset && (
                    <DetailSection
                      title={fr.maintenance.count(selected.maintenances.length)}
                      icon="maintenance"
                    >
                      <MaintenanceSection
                        equipment={selected}
                        employees={options?.employees ?? []}
                        canManage={canManageMaintenance}
                        canDelete={canDeleteMaintenance}
                        catalogs={options?.catalogs ?? []}
                        hideHeading
                        onChanged={async () => {
                          await onMaintenanceChanged();
                        }}
                      />
                    </DetailSection>
                  )}
                  <DetailSection
                    id={`equipment-history-${selected.id}`}
                    title={fr.audit.button}
                    icon="history"
                  >
                    {selected.changes.filter(
                      (change) => change.source !== "transfer",
                    ).length > 0 ? (
                      <div className="audit-list detail-audit-list">
                        {selected.changes
                          .filter((change) => change.source !== "transfer")
                          .map((change) => (
                            <article key={change.id}>
                              <span className="audit-dot" aria-hidden="true" />
                              <div>
                                <strong>
                                  {equipmentAuditLabel(
                                    change.type,
                                    selected.category.code,
                                    language,
                                  )}
                                </strong>
                                <p>
                                  {fr.audit.by(
                                    change.actor?.name ?? fr.audit.system,
                                  )}{" "}
                                  ·{" "}
                                  <time dateTime={change.occurred_at}>
                                    {auditDate(change.occurred_at)}
                                  </time>
                                </p>
                              </div>
                            </article>
                          ))}
                      </div>
                    ) : (
                      <EmptyState
                        compact
                        icon="history"
                        title={fr.audit.empty}
                        description="Les modifications de cet actif apparaîtront ici."
                      />
                    )}
                  </DetailSection>
                </div>
                {showTransfer && options && (
                  <Modal
                    title={fr.equipment.transferTitle}
                    onClose={() => setShowTransfer(false)}
                  >
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
            )
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

function EquipmentEditDrawer({
  categoryCode,
  equipment,
  language,
  options,
  onClose,
  onChanged,
}: {
  categoryCode: string;
  equipment: Equipment;
  language: Language;
  options: EquipmentFilterOptions;
  onClose: () => void;
  onChanged: (equipment: Equipment) => void;
}) {
  const isOtherAsset = isAssetCategoryCode(categoryCode);
  const formId = `equipment-edit-form-${equipment.id}`;
  const title = isOtherAsset ? fr.assets.edit : fr.equipment.editTitle;

  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-add-drawer creation-panel asset-edit-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header creation-panel-header insurance-add-header">
          <div>
            <p className="section-label">{equipment.category.name}</p>
            <h2>{title}</h2>
            <p>{equipment.asset_code}</p>
          </div>
          <div className="creation-panel-header-actions">
            <button
              className="primary-button save-button"
              type="submit"
              form={formId}
            >
              {fr.common.save}
            </button>
            <button
              className="creation-panel-close"
              type="button"
              aria-label={fr.common.close}
              onClick={onClose}
            >
              <ActionIcon name="close" />
            </button>
          </div>
        </header>
        <div className="detail-content creation-panel-content">
          {isOtherAsset ? (
            <AssetForm
              key={equipment.id}
              formId={formId}
              hideEditChrome
              categoryCode={categoryCode}
              language={language}
              options={options}
              equipment={equipment}
              onSaved={onChanged}
              onCancel={onClose}
            />
          ) : (
            <EquipmentEditForm
              key={equipment.id}
              formId={formId}
              forceOpen
              equipment={equipment}
              employees={options.employees}
              projects={options.projects}
              locations={options.locations}
              catalogs={options.catalogs}
              onChanged={onChanged}
              onEditingChange={(editing) => {
                if (!editing) onClose();
              }}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function EquipmentInsuranceCoverage({
  policies,
  onOpenPolicy,
}: {
  policies: Equipment["insurance_policies"];
  onOpenPolicy?: (policyId: number) => void;
}) {
  const activePolicy = policies.find((policy) => policyIsActive(policy));
  const policy = activePolicy ?? policies[0];

  if (!policy)
    return (
      <EmptyState
        compact
        icon="invoice"
        title="Aucune assurance liée"
        description="La police apparaîtra ici dès que ce véhicule sera ajouté à une assurance équipement."
      />
    );

  return (
    <div className="equipment-insurance-coverage">
      <div className="equipment-insurance-coverage-heading">
        <span
          className={`insurance-status ${activePolicy ? "active" : "expired"}`}
        >
          {activePolicy ? "Assurance active" : "Assurance expirée"}
        </span>
        {policies.length > 1 && <small>{policies.length} polices liées</small>}
      </div>
      <dl>
        <div>
          <dt>N° de police</dt>
          <dd>{policy.policy_number}</dd>
        </div>
        <div>
          <dt>Assureur</dt>
          <dd>{policy.source || fr.common.notProvided}</dd>
        </div>
        <div>
          <dt>Expiration</dt>
          <dd>{formatInsuranceDate(policy.ends_on)}</dd>
        </div>
        <div>
          <dt>Prime TTC</dt>
          <dd>
            {policy.total_amount === null
              ? fr.common.notProvided
              : formatMoney(policy.total_amount)}
          </dd>
        </div>
      </dl>
      {onOpenPolicy && (
        <button
          type="button"
          className="insurance-policy-document"
          onClick={() => onOpenPolicy(policy.id)}
        >
          <ActionIcon name="invoice" />
          Voir l’assurance
        </button>
      )}
    </div>
  );
}

function EquipmentTemporaryAdmissions({
  admissions,
  onOpenAdmission,
}: {
  admissions: Equipment["temporary_admissions"];
  onOpenAdmission?: (admissionId: number) => void;
}) {
  if (!admissions.length) {
    return (
      <EmptyState
        compact
        icon="identification"
        title="Aucune admission temporaire liée"
        description="L’admission apparaîtra ici lorsque cet équipement sera ajouté à un dossier AT."
      />
    );
  }

  return (
    <div className="equipment-insurance-coverage equipment-temporary-admissions">
      {admissions.map((admission) => (
        <article key={admission.id}>
          <div className="equipment-insurance-coverage-heading">
            <span
              className={`insurance-status ${admission.status === "renewed" ? "active" : admission.status}`}
            >
              {temporaryAdmissionStatusLabel(admission.status)}
            </span>
          </div>
          <dl>
            <div>
              <dt>Référence douane</dt>
              <dd>{admission.customs_reference}</dd>
            </div>
            <div>
              <dt>Entrée</dt>
              <dd>{formatInsuranceDate(admission.entered_on)}</dd>
            </div>
            <div>
              <dt>Échéance</dt>
              <dd>{formatInsuranceDate(admission.expires_on)}</dd>
            </div>
            {admission.status === "cleared" && (
              <div>
                <dt>Droits payés</dt>
                <dd>
                  {admission.customs_duty_amount === null
                    ? fr.common.notProvided
                    : formatMoney(admission.customs_duty_amount)}
                </dd>
              </div>
            )}
          </dl>
          {onOpenAdmission && (
            <button
              type="button"
              className="insurance-policy-document"
              onClick={() => onOpenAdmission(admission.id)}
            >
              <ActionIcon name="identification" />
              Voir l’admission temporaire
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function temporaryAdmissionStatusLabel(
  status: Equipment["temporary_admissions"][number]["status"],
) {
  return {
    active: "Active",
    renewed: "Renouvelée",
    returned: "Retournée",
    cleared: "Dédouanée",
    expired: "Expirée",
  }[status];
}

function policyIsActive(policy: Equipment["insurance_policies"][number]) {
  return (
    policy.ends_on !== null &&
    policy.ends_on >= new Date().toISOString().slice(0, 10)
  );
}

function formatInsuranceDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
        new Date(`${value}T00:00:00`),
      )
    : fr.common.notProvided;
}

function priceCurrencyLabel(currency: unknown): string {
  return currency === "EUR" || currency === "USD" ? currency : "FCFA";
}

function auditDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function GeneratorTransferHistory({
  changes,
}: {
  changes: Equipment["changes"];
}) {
  const [page, setPage] = useState(0);
  const pageSize = 3;
  const pageCount = Math.max(1, Math.ceil(changes.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleChanges = changes.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  if (changes.length === 0) {
    return (
      <EmptyState
        compact
        icon="transfer"
        title="Aucun transfert enregistré"
        description="Les prochains déplacements de ce groupe apparaîtront ici."
      />
    );
  }

  return (
    <div className="generator-transfer-history">
      {visibleChanges.map((change) => (
        <article key={change.id}>
          <header>
            <time dateTime={change.occurred_at}>
              {auditDate(change.occurred_at)}
            </time>
            <span>{change.actor?.name ?? fr.audit.system}</span>
          </header>
          <div className="generator-transfer-route">
            <div>
              <small>Depuis</small>
              <strong>{transferPlace(change.transfer?.from)}</strong>
            </div>
            <ActionIcon name="transfer" />
            <div>
              <small>Vers</small>
              <strong>{transferPlace(change.transfer?.to)}</strong>
            </div>
          </div>
        </article>
      ))}
      {pageCount > 1 && (
        <nav
          className="transfer-history-pagination"
          aria-label="Pagination des transferts"
        >
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Précédent
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Suivant
          </button>
        </nav>
      )}
    </div>
  );
}

function transferPlace(
  place: { project: string | null; location: string | null } | undefined,
): string {
  return place
    ? [place.project, place.location].filter(Boolean).join(" · ") ||
        fr.common.notProvided
    : fr.common.notProvided;
}

function equipmentAuditLabel(
  type: Equipment["changes"][number]["type"],
  categoryCode: string,
  language: Language,
): string {
  if (categoryCode === "generator") return fr.audit.equipmentActions[type];

  const category = isAssetCategoryCode(categoryCode)
    ? assetCategoryLabel(categoryCode, language)
    : fr.assets.title;

  if (type === "initial_import") return fr.audit.assetImported(category);
  if (type === "identity_updated")
    return fr.audit.assetIdentityUpdated(category);
  if (type === "specifications_updated")
    return fr.audit.assetSpecificationsUpdated(category);
  if (type === "archived") return fr.audit.assetArchived(category);

  return fr.audit.equipmentActions[type];
}

function DetailSection({
  id,
  className,
  title,
  children,
  defaultOpen = false,
  icon,
}: {
  id?: string;
  className?: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?:
    | "location"
    | "identification"
    | "specifications"
    | "note"
    | "photo"
    | "invoice"
    | "maintenance"
    | "history"
    | "transfer";
}) {
  return (
    <details
      id={id}
      className={`detail-section${className ? ` ${className}` : ""}`}
      open={defaultOpen}
    >
      <summary>
        <h3>
          {icon && <ActionIcon name={icon} />}
          {title}
        </h3>
        <ActionIcon name="expand" />
      </summary>
      <div className="detail-section-body">{children}</div>
    </details>
  );
}
