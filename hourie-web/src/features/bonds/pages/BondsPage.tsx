import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
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
import type { PaginatedResponse, PaginationMeta } from "../../../shared/api/pagination";

export function BondsPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BondStatus | "all">("all");
  const [type, setType] = useState<BondType | "all">("all");
  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Bond | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Bond | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (type !== "all") params.set("bond_type", type);
    if (siteId) params.set("project_id", siteId);
    try {
      const response = await apiRequest<PaginatedResponse<Bond>>(`/api/v1/bonds?${params}`);
      setBonds(response.data ?? []);
      setPagination(response.meta ?? null);
    } finally { setLoading(false); }
  }, [page, search, siteId, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 200);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    apiRequest<PaginatedResponse<Site>>("/api/v1/sites?per_page=100")
      .then((response) => setSites(response.data))
      .catch(() => setSites([]));
  }, []);

  const visible = bonds;
  const pageCount = pagination?.last_page ?? 1;
  const currentPage = pagination?.current_page ?? page;

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
          <p className="section-label">Gestion</p>
          <h1>Cautions</h1>
          <p>
            Suivez les garanties financières liées aux sites, leurs montants et
            leurs échéances.
          </p>
        </div>
      </section>
      <section className="insurance-list-area inventory-panel">
        <div className="filter-bar">
          <div className="search-field">
            <label htmlFor="bond-search">Rechercher</label>
            <input
              id="bond-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Type, banque, localisation ou site"
            />
          </div>
          <div className="filter-toolbar-actions">
            <button
              className={`advanced-filter-toggle${showFilters ? " active" : ""}`}
              type="button"
              onClick={() => setShowFilters(true)}
            >
              <ActionIcon name="filter" />
              <span>Filtres</span>
              {(status !== "all" || type !== "all" || siteId) && (
                <strong>
                  {Number(status !== "all") +
                    Number(type !== "all") +
                    Number(Boolean(siteId))}
                </strong>
              )}
            </button>
            <button
              className="table-refresh-button table-add-button"
              type="button"
              aria-label="Ajouter une caution"
              title="Ajouter une caution"
              onClick={() => setShowAdd(true)}
            >
              <ActionIcon name="add" />
            </button>
            <button
              className="table-refresh-button filter-refresh-button"
              type="button"
              aria-label="Actualiser"
              title="Actualiser"
              onClick={refresh}
            >
              <ActionIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className="equipment-table-wrap">
          <table className="equipment-table insurance-table bonds-table">
            <thead>
              <tr>
                <th>Site / projet</th>
                <th>Localisation physique</th>
                <th>Type de caution</th>
                <th>Émetteur</th>
                <th>Montant</th>
                <th>Date de début</th>
                <th>Date de fin</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="insurance-empty-row">
                  <td colSpan={8} className="insurance-table-empty">
                    <LoadingSpinner label="Chargement des cautions…" />
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr className="insurance-empty-row">
                  <td colSpan={8} className="insurance-table-empty">
                    <EmptyState
                      icon="invoice"
                      title="Aucune caution trouvée"
                      description="Ajoutez une caution ou modifiez votre recherche et vos filtres."
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
                      onClick={() => setSelectedId(bond.id)}
                    >
                      <td>
                        <strong>{bond.project?.name || "À compléter"}</strong>
                      </td>
                      <td>{bond.location?.name || "À compléter"}</td>
                      <td>{bondTypeLabel(bond.bond_type)}</td>
                      <td>{bond.issuer || "À compléter"}</td>
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
        {!loading && (
          <nav className="pagination insurance-pagination">
            <span>
              {pagination ? `${pagination.from ?? 0}–${pagination.to ?? 0} sur ${pagination.total}` : `${visible.length} caution(s)`}
            </span>
            <div>
              <button
                type="button"
                disabled={currentPage === 1 || loading}
                onClick={() => setPage(currentPage - 1)}
              >
                Précédent
              </button>
              <span>
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount || loading}
                onClick={() => setPage(currentPage + 1)}
              >
                Suivant
              </button>
            </div>
          </nav>
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
          onClear={() => {
            setStatus("all");
            setType("all");
            setSiteId("");
            setPage(1);
          }}
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
            setSelectedId(bond.id);
            setEditing(null);
          }}
        />
      )}
      {selected && (
        <BondDetails
          key={selected.id}
          bond={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setSelectedId(null);
            setEditing(selected);
          }}
          onChanged={updateBond}
          onDeleted={() => {
            setBonds((current) =>
              current.filter((bond) => bond.id !== selected.id),
            );
            setSelectedId(null);
          }}
        />
      )}
    </main>
  );
}
