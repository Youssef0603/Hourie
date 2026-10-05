import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";

export function InsuranceFilterPanel({
  status,
  projectId,
  sites,
  onStatusChange,
  onProjectChange,
  onClose,
  onClear,
}: {
  status: "all" | "active" | "soon" | "expired";
  projectId: string;
  sites: Array<{ id: number; name: string }>;
  onStatusChange: (value: "all" | "active" | "soon" | "expired") => void;
  onProjectChange: (value: string) => void;
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
            <p className="section-label">Assurances</p>
            <h2>Filtres</h2>
            <p>Affinez la liste des polices.</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="insurance-filter-content">
          <label>
            Statut
            <SearchableSelect
              ariaLabel="Statut de la police"
              value={status}
              onChange={(value) => onStatusChange(value as typeof status)}
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
            Site / projet
            <SearchableSelect
              ariaLabel="Site ou projet assuré"
              value={projectId}
              onChange={onProjectChange}
              placeholder="Tous les sites et projets"
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
