import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { operationsText } from "../../../i18n/operations";

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
  const text = operationsText().insurance;

  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={text.filters}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">{text.title}</p>
            <h2>{text.filters}</h2>
            <p>{text.filterSubtitle}</p>
          </div>
          <button type="button" aria-label={text.close} onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="insurance-filter-content">
          <label>
            {text.policyStatus}
            <SearchableSelect
              ariaLabel={text.policyStatusAria}
              value={status}
              onChange={(value) => onStatusChange(value as typeof status)}
              placeholder={text.allStatuses}
              includeEmpty={false}
              options={[
                { value: "all", label: text.allStatuses },
                { value: "active", label: text.statuses.active },
                { value: "soon", label: text.statuses.soon },
                { value: "expired", label: text.statuses.expired },
              ]}
            />
          </label>
          <label>
            {text.siteProject}
            <SearchableSelect
              ariaLabel={text.insuredProjectAria}
              value={projectId}
              onChange={onProjectChange}
              placeholder={text.allProjects}
              options={sites.map((site) => ({
                value: String(site.id),
                label: site.name,
              }))}
            />
          </label>
        </div>
        <footer className="insurance-filter-actions">
          <button type="button" onClick={onClear}>
            {text.clearFilters}
          </button>
          <button className="save-button" type="button" onClick={onClose}>
            {text.showResults}
          </button>
        </footer>
      </aside>
    </div>
  );
}
