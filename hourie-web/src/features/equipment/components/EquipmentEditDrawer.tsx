import { fr, type Language } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { isAssetCategoryCode } from "../assetCategories";
import type { Equipment, EquipmentFilterOptions } from "../types";
import { AssetForm } from "./AssetForm";
import { EquipmentEditForm } from "./EquipmentEditForm";

export function EquipmentEditDrawer({
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
            <button className="primary-button save-button" type="submit" form={formId}>{fr.common.save}</button>
            <button className="creation-panel-close" type="button" aria-label={fr.common.close} onClick={onClose}>
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
