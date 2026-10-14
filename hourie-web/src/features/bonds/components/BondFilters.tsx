import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { bondTypeLabel, bondTypeOptions } from "../bondDisplay";
import { operationPhrase } from "../../../i18n/operations";
import type { BondSite as Site, BondStatus, BondType } from "../types";

export function BondFilters({
  sites,
  status,
  type,
  siteId,
  onStatus,
  onType,
  onSite,
  onClose,
  onClear,
}: {
  sites: Site[];
  status: BondStatus | "all";
  type: BondType | "all";
  siteId: string;
  onStatus: (value: BondStatus | "all") => void;
  onType: (value: BondType | "all") => void;
  onSite: (value: string) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={operationPhrase("Filtres")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">{operationPhrase("Cautions")}</p>
            <h2>{operationPhrase("Filtres")}</h2>
          </div>
          <button type="button" aria-label={operationPhrase("Fermer")} onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="insurance-filter-content">
          <label>
            {operationPhrase("Statut")}
            <SearchableSelect
              ariaLabel={operationPhrase("Statut")}
              value={status}
              onChange={(value) => onStatus(value as BondStatus | "all")}
              placeholder={operationPhrase("Tous les statuts")}
              includeEmpty={false}
              options={[
                { value: "all", label: operationPhrase("Tous les statuts") },
                { value: "active", label: operationPhrase("Active") },
                { value: "soon", label: operationPhrase("Expire bientôt") },
                { value: "expired", label: operationPhrase("Expirée") },
              ]}
            />
          </label>
          <label>
            {operationPhrase("Type de caution")}
            <SearchableSelect
              ariaLabel={operationPhrase("Type de caution")}
              value={type}
              onChange={(value) => onType(value as BondType | "all")}
              placeholder={operationPhrase("Tous les types")}
              includeEmpty={false}
              options={[
                { value: "all", label: operationPhrase("Tous les types") },
                ...bondTypeOptions.map((option) => ({ ...option, label: bondTypeLabel(option.value) })),
              ]}
            />
          </label>
          <label>
            {operationPhrase("Site / projet")}
            <SearchableSelect
              ariaLabel={operationPhrase("Site")}
              value={siteId}
              onChange={onSite}
              placeholder={operationPhrase("Tous les sites")}
              options={sites.map((site) => ({
                value: String(site.id),
                label: site.name,
              }))}
            />
          </label>
        </div>
        <footer className="insurance-filter-actions">
          <button type="button" onClick={onClear}>
            {operationPhrase("Effacer les filtres")}
          </button>
          <button className="save-button" type="button" onClick={onClose}>
            {operationPhrase("Afficher les résultats")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
