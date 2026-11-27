import { useCallback, useEffect, useState } from "react";
import { ClearFiltersButton } from "../../../shared/components/FilterDrawer";
import { apiRequest } from "../../../shared/api/http";
import { FilterToggleButton, ToolbarIconButton } from "../../../shared/components/ToolbarButtons";
import { Pagination } from "../../../shared/components/Pagination";
import { SearchField } from "../../../shared/components/SearchField";
import { clickableRow } from "../../../shared/clickableRow";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import {
  bondStatusLabel,
  bondTypeLabel,
  formatBondAmount,
  formatBondDate,
  getBondStatus,
} from "../bondDisplay";
import type { Bond, BondSite as Site, BondStatus, BondType } from "../types";
import { BondDetails } from "../components/BondDetails";
import { BondFilters } from "../components/BondFilters";
import { BondForm } from "../components/BondForm";
import { RenewBondDialog } from "../components/RenewBondDialog";
import type { PaginatedResponse } from "../../../shared/api/pagination";
import { usePaginatedList } from "../../../shared/usePaginatedList";
import { operationPhrase } from "../../../i18n/operations";
import { TotalCount } from "../../../shared/components/TotalCount";

type BondsPageProps = {
  initialSiteId?: number | null;
  /** False for read-only roles: no add, edit, renew, delete or upload. */
  canManage?: boolean;
};

export function BondsPage({ initialSiteId = null, canManage = true }: BondsPageProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BondStatus | "all">("all");
  const [type, setType] = useState<BondType | "all">("all");
  const [siteId, setSiteId] = useState(initialSiteId ? String(initialSiteId) : "");
  const [showFilters, setShowFilters] = useState(false);
  const filterCount = Number(status !== "all") + Number(type !== "all") + Number(Boolean(siteId));
  function clearFilters() {
    setStatus("all");
    setType("all");
    setSiteId("");
    setPage(1);
  }
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Bond | null>(null);
  const [renewing, setRenewing] = useState<Bond | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Bond | null>(null);

  const fetchBonds = useCallback((page: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("bond_type", type);
    if (siteId) params.set("project_id", siteId);
    return apiRequest<PaginatedResponse<Bond>>(`/api/v1/bonds?${params}`);
  }, [search, siteId, status, type]);
  const { items: bonds, setItems: setBonds, meta: pagination, setPage, loading, error: listError, reload: refresh } = usePaginatedList<Bond>(
    fetchBonds,
    operationPhrase("Impossible de charger les cautions."),
  );

  useEffect(() => {
    setSiteId(initialSiteId ? String(initialSiteId) : "");
    setPage(1);
  }, [initialSiteId, setPage]);

  useEffect(() => {
    apiRequest<PaginatedResponse<Site>>("/api/v1/sites?per_page=100")
      .then((response) => setSites(response.data))
      .catch(() => setSites([]));
  }, []);

  const visible = bonds;

  useEffect(() => {
    if (selectedId === null) {
      const timer = window.setTimeout(() => setSelected(null), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    apiRequest<{ data: Bond }>(`/api/v1/bonds/${selectedId}`)
      .then((response) => { if (active) setSelected(response.data); })
      .catch(() => { if (active) setSelectedId(null); });
    return () => { active = false; };
  }, [selectedId]);

  const updateBond = (bond: Bond) => {
    setSelected((current) => current?.id === bond.id ? bond : current);
    setBonds((current) =>
      current.map((item) => (item.id === bond.id ? bond : item)),
    );
  };

  return (
    <main className="equipment-page asset-page insurance-workspace bonds-workspace">
      <section className="insurance-heading">
        <div>
          <p className="section-label">{operationPhrase("Gestion")}</p>
          <h1>{operationPhrase("Cautions")}</h1>
          <p>{operationPhrase("Suivez les garanties financières liées aux chantiers, leurs montants et leurs échéances.")}</p>
        </div>
        <TotalCount
          value={pagination?.total ?? visible.length}
          label={operationPhrase("Cautions")}
          loading={loading}
        />
      </section>
      {listError && <div className="form-alert" role="alert">{listError}</div>}
      <section className="insurance-list-area inventory-panel">
        <div className="filter-bar">
          <SearchField
            id="bond-search"
            label={operationPhrase("Rechercher")}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={operationPhrase("Type, banque, localisation ou chantier")}
          />
          <div className="filter-toolbar-actions">
            <FilterToggleButton
              label={operationPhrase("Filtres")}
              active={showFilters}
              count={filterCount}
              onClick={() => setShowFilters(true)}
            />
            {canManage && <ToolbarIconButton icon="add" label={operationPhrase("Ajouter une caution")} onClick={() => setShowAdd(true)} />}
            <ToolbarIconButton icon="refresh" label={operationPhrase("Actualiser")} onClick={() => void refresh()} />
            <ClearFiltersButton count={filterCount} onClear={clearFilters} />
          </div>
        </div>
        <div className="equipment-table-wrap">
          <table className="equipment-table insurance-table bonds-table">
            <thead>
              <tr>
                <th>{operationPhrase("Chantier")}</th>
                <th>{operationPhrase("Localisation physique")}</th>
                <th>{operationPhrase("Type de caution")}</th>
                <th>{operationPhrase("Émetteur")}</th>
                <th>{operationPhrase("Montant")}</th>
                <th>{operationPhrase("Date de début")}</th>
                <th>{operationPhrase("Date de fin")}</th>
                <th>{operationPhrase("État")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="insurance-empty-row">
                  <td colSpan={8} className="insurance-table-empty">
                    <LoadingSpinner label={operationPhrase("Chargement des cautions…")} />
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr className="insurance-empty-row">
                  <td colSpan={8} className="insurance-table-empty">
                    <EmptyState
                      icon="invoice"
                      title={operationPhrase("Aucune caution trouvée")}
                      description={operationPhrase("Ajoutez une caution ou modifiez votre recherche et vos filtres.")}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((bond) => {
                  const state = getBondStatus(bond);
                  return (
                    <tr
                      key={bond.id}
                      className={selectedId === bond.id ? "selected" : ""}
                      {...clickableRow(() => setSelectedId(bond.id))}
                    >
                      <td>
                        <strong>{bond.project?.name || operationPhrase("À compléter")}</strong>
                      </td>
                      <td>{bond.location?.name || operationPhrase("À compléter")}</td>
                      <td>{bondTypeLabel(bond.bond_type)}</td>
                      <td>{bond.issuer || operationPhrase("À compléter")}</td>
                      <td>
                        <strong>
                          {formatBondAmount(bond.amount, bond.currency)}
                        </strong>
                      </td>
                      <td className="bond-date-cell">
                        {formatBondDate(bond.issued_on)}
                      </td>
                      <td className="bond-date-cell">
                        {formatBondDate(bond.expires_on)}
                      </td>
                      <td>
                        <em className={`insurance-status ${state}`}>
                          {bondStatusLabel(state)}
                        </em>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && pagination && (
          <Pagination meta={pagination} onPageChange={setPage} hideWhenSinglePage={false} />
        )}
      </section>
      {showFilters && (
        <BondFilters
          sites={sites}
          status={status}
          type={type}
          siteId={siteId}
          onStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onType={(value) => {
            setType(value);
            setPage(1);
          }}
          onSite={(value) => {
            setSiteId(value);
            setPage(1);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
      {showAdd && (
        <BondForm
          sites={sites}
          onClose={() => setShowAdd(false)}
          onSaved={(bond) => {
            setBonds((current) => [bond, ...current]);
            setSelectedId(bond.id);
            setShowAdd(false);
          }}
        />
      )}
      {editing && (
        <BondForm
          sites={sites}
          bond={editing}
          onClose={() => setEditing(null)}
          onSaved={(bond) => {
            updateBond(bond);
            setEditing(null);
          }}
        />
      )}
      {selected && !editing && (
        <BondDetails
          key={selected.id}
          bond={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setEditing(selected);
          }}
          onRenew={() => setRenewing(selected)}
          readOnly={!canManage}
          onChanged={updateBond}
          onDeleted={() => {
            setBonds((current) =>
              current.filter((bond) => bond.id !== selected.id),
            );
            setSelectedId(null);
          }}
        />
      )}
      {renewing && (
        <RenewBondDialog
          bond={renewing}
          onClose={() => setRenewing(null)}
          onRenewed={(bond) => {
            updateBond(bond);
            setRenewing(null);
          }}
        />
      )}
    </main>
  );
}
