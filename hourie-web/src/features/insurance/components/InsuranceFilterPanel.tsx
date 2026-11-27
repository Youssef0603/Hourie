import { FilterDrawer, FilterGroup } from "../../../shared/components/FilterDrawer";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { operationsText } from "../../../i18n/operations";

export function InsuranceFilterPanel({
  status,
  projectId,
  sites,
  onStatusChange,
  onProjectChange,
  onClose,
}: {
  status: "all" | "active" | "soon" | "expired";
  projectId: string;
  sites: Array<{ id: number; name: string }>;
  onStatusChange: (value: "all" | "active" | "soon" | "expired") => void;
  onProjectChange: (value: string) => void;
  onClose: () => void;
}) {
  const text = operationsText().insurance;

  return (
    <FilterDrawer section={text.title} onClose={onClose}>
      <FilterGroup>
        <label>
          <span>{text.policyStatus}</span>
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
          <span>{text.siteProject}</span>
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
      </FilterGroup>
    </FilterDrawer>
  );
}
