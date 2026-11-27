import type { ReactNode } from "react";
import { fr } from "../../i18n/fr";
import { ActionIcon } from "./ActionIcon";

/**
 * The side drawer every list page opens from its "Filtres" button. Filters
 * apply as soon as they change; clearing them is the toolbar's
 * ClearFiltersButton, next to the "Filtres" button, on every page.
 */
export function FilterDrawer({
  section,
  onClose,
  children,
}: {
  /** Small label above the title: the page the filters belong to. */
  section: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
            <p className="section-label">{section}</p>
            <h2>{fr.equipment.filters}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={fr.common.close}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="filter-drawer-content">{children}</div>
      </aside>
    </div>
  );
}

/** The main block of filters in a drawer, laid out as a two-column grid. */
export function FilterGroup({ children }: { children: ReactNode }) {
  return (
    <fieldset className="drawer-basic-filters">
      <legend>{fr.equipment.filters}</legend>
      <div className="advanced-filter-grid">{children}</div>
    </fieldset>
  );
}

/** Toolbar button that resets every filter; shown only while some are active. */
export function ClearFiltersButton({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <button className="clear-filters" type="button" onClick={onClear}>
      {fr.equipment.clearFilters}
    </button>
  );
}
