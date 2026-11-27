import { fr } from "../../../i18n/fr";
import type { UserRoleCode } from "../../auth/types";
import { operationPhrase } from "../../../i18n/operations";
import { FilterDrawer, FilterGroup } from "../../../shared/components/FilterDrawer";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { catalogLabel, catalogOptions } from "../../equipment/catalogs";
import type { CatalogOption, NamedReference } from "../../equipment/types";

export type AccessFilter = "" | "with_access" | "without_access";
export type RoleFilter =
  "" | UserRoleCode;

type PeopleFilterDrawerProps = {
  accessFilter: AccessFilter;
  roleFilter: RoleFilter;
  jobTitleFilter: string;
  projectFilter: string;
  catalogs?: CatalogOption[];
  projects?: NamedReference[];
  onAccessChange: (value: AccessFilter) => void;
  onRoleChange: (value: RoleFilter) => void;
  onJobTitleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onClose: () => void;
};

export function PeopleFilterDrawer({
  accessFilter,
  roleFilter,
  jobTitleFilter,
  projectFilter,
  catalogs,
  projects,
  onAccessChange,
  onRoleChange,
  onJobTitleChange,
  onProjectChange,
  onClose,
}: PeopleFilterDrawerProps) {
  return (
    <FilterDrawer section={operationPhrase("PERSONNEL")} onClose={onClose}>
      <FilterGroup>
        <label>
          <span>{operationPhrase("Accès au système")}</span>
          <SearchableSelect
            ariaLabel={operationPhrase("Accès au système")}
            value={accessFilter}
            onChange={(value) => onAccessChange(value as AccessFilter)}
            placeholder={fr.common.all}
            options={[
              { value: "with_access", label: operationPhrase("Avec accès") },
              { value: "without_access", label: operationPhrase("Sans accès") },
            ]}
          />
        </label>
        <label>
          <span>{fr.directory.accountRole}</span>
          <SearchableSelect
            ariaLabel={fr.directory.accountRole}
            value={roleFilter}
            onChange={(value) => onRoleChange(value as RoleFilter)}
            placeholder={fr.common.all}
            options={Object.entries(fr.roles).filter(([value]) => value !== "generator_manager").map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </label>
        <label>
          <span>{fr.directory.jobTitle}</span>
          <SearchableSelect
            ariaLabel={fr.directory.jobTitle}
            value={jobTitleFilter}
            onChange={onJobTitleChange}
            placeholder={fr.common.all}
            options={catalogOptions(catalogs, "employee_job_title").map((option) => ({
              value: option.code,
              label: catalogLabel(catalogs, "employee_job_title", option.code),
            }))}
          />
        </label>
        <label>
          <span>{fr.directory.siteProject}</span>
          <SearchableSelect
            ariaLabel={fr.directory.siteProject}
            value={projectFilter}
            onChange={onProjectChange}
            placeholder={fr.common.all}
            options={(projects ?? []).map((project) => ({
              value: String(project.id),
              label: project.name,
            }))}
          />
        </label>
      </FilterGroup>
    </FilterDrawer>
  );
}
