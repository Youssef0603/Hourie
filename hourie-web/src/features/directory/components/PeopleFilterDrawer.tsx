import { fr } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";

export type AccessFilter = "" | "with_access" | "without_access";
export type ActivityFilter = "" | "active" | "inactive";
export type RoleFilter =
  "" | "manager" | "cms_manager" | "generator_manager" | "viewer";

type PeopleFilterDrawerProps = {
  accessFilter: AccessFilter;
  roleFilter: RoleFilter;
  activityFilter: ActivityFilter;
  onAccessChange: (value: AccessFilter) => void;
  onRoleChange: (value: RoleFilter) => void;
  onActivityChange: (value: ActivityFilter) => void;
  onClose: () => void;
};

export function PeopleFilterDrawer({
  accessFilter,
  roleFilter,
  activityFilter,
  onAccessChange,
  onRoleChange,
  onActivityChange,
  onClose,
}: PeopleFilterDrawerProps) {
  return (
    <div className="filter-drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={fr.equipment.filters}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="section-label">PERSONNEL</p>
            <h2>{fr.equipment.filters}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={fr.common.close}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="filter-drawer-content">
          <fieldset className="drawer-basic-filters">
            <legend>{fr.equipment.filters}</legend>
            <div className="advanced-filter-grid">
              <label>
                <span>Accès au système</span>
                <SearchableSelect
                  ariaLabel="Accès au système"
                  value={accessFilter}
                  onChange={(value) => onAccessChange(value as AccessFilter)}
                  placeholder={fr.common.all}
                  options={[
                    { value: "with_access", label: "Avec accès" },
                    { value: "without_access", label: "Sans accès" },
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
                  options={Object.entries(fr.roles).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
              <label>
                <span>Statut</span>
                <SearchableSelect
                  ariaLabel="Statut"
                  value={activityFilter}
                  onChange={(value) =>
                    onActivityChange(value as ActivityFilter)
                  }
                  placeholder={fr.common.all}
                  options={[
                    { value: "active", label: "Actif" },
                    { value: "inactive", label: "Inactif" },
                  ]}
                />
              </label>
            </div>
          </fieldset>
        </div>
      </aside>
    </div>
  );
}
