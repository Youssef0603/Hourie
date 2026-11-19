import { fr, type Language } from "../../i18n/fr";
import { assetCategoryLabel, isAssetCategoryCode } from "./assetCategories";
import type { Equipment } from "./types";

/** Human-readable label for an equipment history entry. */
export function equipmentAuditLabel(
  type: Equipment["changes"][number]["type"],
  categoryCode: string,
  language: Language,
): string {
  if (categoryCode === "generator") return fr.audit.equipmentActions[type];

  const category = isAssetCategoryCode(categoryCode)
    ? assetCategoryLabel(categoryCode, language)
    : fr.assets.title;

  if (type === "initial_import") return fr.audit.assetImported(category);
  if (type === "identity_updated") return fr.audit.assetIdentityUpdated(category);
  if (type === "specifications_updated") return fr.audit.assetSpecificationsUpdated(category);
  if (type === "archived") return fr.audit.assetArchived(category);

  return fr.audit.equipmentActions[type];
}
