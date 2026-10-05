import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { bondTypeOptions } from "../bondDisplay";
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
        aria-label="Filtres"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">Cautions</p>
            <h2>Filtres</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="insurance-filter-content">
          <label>
            Statut
            <SearchableSelect
              ariaLabel="Statut"
              value={status}
              onChange={(value) => onStatus(value as BondStatus | "all")}
              placeholder="Tous les statuts"
              includeEmpty={false}
              options={[
                { value: "all", label: "Tous les statuts" },
                { value: "active", label: "Active" },
                { value: "soon", label: "Expire bientôt" },
                { value: "expired", label: "Expirée" },
              ]}
            />
          </label>
          <label>
            Type de caution
            <SearchableSelect
              ariaLabel="Type de caution"
              value={type}
              onChange={(value) => onType(value as BondType | "all")}
              placeholder="Tous les types"
              includeEmpty={false}
              options={[
                { value: "all", label: "Tous les types" },
                ...bondTypeOptions,
              ]}
            />
          </label>
          <label>
            Site / projet
            <SearchableSelect
              ariaLabel="Site"
              value={siteId}
              onChange={onSite}
              placeholder="Tous les sites"
              options={sites.map((site) => ({
                value: String(site.id),
                label: site.name,
              }))}
            />
          </label>
        </div>
        <footer className="insurance-filter-actions">
          <button type="button" onClick={onClear}>
            Effacer les filtres
          </button>
          <button className="save-button" type="button" onClick={onClose}>
            Afficher les résultats
          </button>
        </footer>
      </aside>
    </div>
  );
}
