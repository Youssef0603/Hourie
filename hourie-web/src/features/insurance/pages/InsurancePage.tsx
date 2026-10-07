import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import {
  coveredInsuranceLabel,
  formatInsuranceDate,
  formatInsuranceMoney,
  insurancePolicyStatus,
  insuranceStatusLabel,
  insuranceTypeLabel,
  insuranceTypes,
} from "../policyDisplay";
import type {
  InsuranceEquipmentOption,
  InsuranceKind as Kind,
  InsurancePolicy as Policy,
} from "../types";
import { InsuranceDetailPanel } from "../components/InsuranceDetailPanel";
import { InsuranceFilterPanel } from "../components/InsuranceFilterPanel";
import { InsuranceAddPanel } from "../components/InsurancePolicyForm";
import { RelatedEquipmentDetailPanel } from "../../equipment/components/RelatedEquipmentDetailPanel";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import type { EquipmentFilterOptions } from "../../equipment/types";
import type { PaginatedResponse, PaginationMeta } from "../../../shared/api/pagination";

export function InsurancePage({
  initialSiteId = null,
  initialPolicyId = null,
  relatedEquipmentContext,
}: {
  initialSiteId?: number | null;
  initialPolicyId?: number | null;
  relatedEquipmentContext?: {
    user: AuthenticatedUser;
    language: Language;
    options: EquipmentFilterOptions | null;
  };
}) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState<Kind | "all">(
    initialSiteId ? "trc_rc" : "all",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "soon" | "expired">(
    "all",
  );
  const [projectId, setProjectId] = useState(
    initialSiteId ? String(initialSiteId) : "",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<
    InsuranceEquipmentOption[]
  >([]);
  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ id: number; name: string; birth_date: string | null }>
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialPolicyId);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [relatedEquipmentId, setRelatedEquipmentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (activeType !== "all") params.set("insurance_type", activeType);
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (projectId) params.set("project_id", projectId);
    try {
      const response = await apiRequest<PaginatedResponse<Policy> & { category_counts: Record<string, number> }>(`/api/v1/insurance-policies?${params}`);
      setPolicies(response.data ?? []);
      setPagination(response.meta ?? null);
      setCategoryCounts(response.category_counts ?? {});
    } finally {
      setLoading(false);
    }
  }, [activeType, page, projectId, search, status]);

  function refreshPolicies() {
    setLoading(true);
    loadPolicies();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPolicies(), 200);
    return () => window.clearTimeout(timer);
  }, [loadPolicies]);

  useEffect(() => {
    apiRequest<PaginatedResponse<{ id: number; name: string }>>("/api/v1/sites?per_page=100")
      .then((value) => setSites(value.data))
      .catch(() => setSites([]));
    apiRequest<{ data: InsuranceEquipmentOption[] }>(
      "/api/v1/insurance-equipment-options",
    )
      .then((value) => setEquipmentOptions(value.data))
      .catch(() => setEquipmentOptions([]));
    apiRequest<PaginatedResponse<{ id: number; name: string; birth_date: string | null }>>("/api/v1/employees?per_page=100")
      .then((value) => setEmployeeOptions(value.data))
      .catch(() => setEmployeeOptions([]));
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      const timer = window.setTimeout(() => setSelected(null), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    apiRequest<{ data: Policy }>(`/api/v1/insurance-policies/${selectedId}`)
      .then((response) => { if (active) setSelected(response.data); })
      .catch(() => { if (active) setSelectedId(null); });
    return () => { active = false; };
  }, [selectedId]);

  const filteredPolicies = policies;
  const filteredSiteName = sites.find(
    (site) => String(site.id) === projectId,
  )?.name;

  return (
    <main className="equipment-page asset-page insurance-workspace">
      <section className="insurance-heading">
        <div>
          <p className="section-label">Gestion</p>
          <h1>Assurances</h1>
          <p>
            {filteredSiteName
              ? `Polices TRC / RC liées au site ${filteredSiteName}.`
              : "Suivez les polices, les échéances et les éléments couverts."}
          </p>
        </div>
      </section>
      <section className="asset-category-section insurance-category-section">
        <h2>Catégories d’assurances</h2>
        <nav className="asset-categories" aria-label="Catégories d’assurance">
          <button
            className={`asset-category-card${activeType === "all" ? " active" : ""}`}
            type="button"
            onClick={() => { setActiveType("all"); setPage(1); }}
          >
            <span>Toutes les polices</span>
            <strong>{Object.values(categoryCounts).reduce((total, count) => total + count, 0)}</strong>
          </button>
          {insuranceTypes.map((type) => (
            <button
              key={type.code}
              className={`asset-category-card${activeType === type.code ? " active" : ""}`}
              type="button"
              onClick={() => {
                setActiveType(type.code);
                setPage(1);
                if (type.code !== "trc_rc") setProjectId("");
              }}
            >
              <span>{type.label}</span>
              <strong>
                {
                  categoryCounts[type.code] ?? 0
                }
              </strong>
            </button>
          ))}
        </nav>
      </section>
      <section className="insurance-list-area inventory-panel">
        <div className="filter-bar">
          <div className="search-field">
            <label htmlFor="insurance-search">Rechercher</label>
            <input
              id="insurance-search"
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="N° de police, assureur, projet ou équipement"
            />
          </div>
          <div className="filter-toolbar-actions">
            <button
              className={`advanced-filter-toggle${showFilters ? " active" : ""}`}
              type="button"
              onClick={() => setShowFilters((value) => !value)}
            >
              <ActionIcon name="filter" />
              <span>Filtres</span>
              {(status !== "all" || projectId) && (
                <strong>
                  {Number(status !== "all") + Number(Boolean(projectId))}
                </strong>
              )}
            </button>
            <button
              className="table-refresh-button table-add-button"
              type="button"
              aria-label="Ajouter une police"
              title="Ajouter une police"
              onClick={() => setShowAdd(true)}
            >
              <ActionIcon name="add" />
            </button>
            <button
              className="table-refresh-button filter-refresh-button"
              type="button"
              aria-label="Actualiser"
              title="Actualiser"
              onClick={() => refreshPolicies()}
            >
              <ActionIcon name="refresh" />
            </button>
          </div>
        </div>
        <div className="equipment-table-wrap">
          <table className="equipment-table insurance-table">
            <thead>
              <tr>
                <th>N° de police</th>
                <th>Assureur</th>
                <th>Type</th>
                <th>Éléments couverts</th>
                <th>Période</th>
                <th>Montant total</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="insurance-empty-row">
                  <td colSpan={7} className="insurance-table-empty">
                    <LoadingSpinner label="Chargement des polices…" />
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr className="insurance-empty-row">
                  <td colSpan={7} className="insurance-table-empty">
                    <EmptyState
                      title="Aucune police trouvée"
                      description="Ajoutez une police ou modifiez votre recherche et vos filtres."
                    />
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => {
                  const policyState = insurancePolicyStatus(policy);
                  return (
                    <tr
                      className={selectedId === policy.id ? "selected" : ""}
                      key={policy.id}
                      onClick={() => setSelectedId(policy.id)}
                    >
                      <td>
                        <strong>{policy.policy_number}</strong>
                      </td>
                      <td>{policy.source || "À compléter"}</td>
                      <td>{insuranceTypeLabel(policy.insurance_type)}</td>
                      <td>{coveredInsuranceLabel(policy)}</td>
                      <td>
                        <span>{formatInsuranceDate(policy.starts_on)}</span>
                        <span>{formatInsuranceDate(policy.ends_on)}</span>
                      </td>
                      <td>
                        <strong>
                          {formatInsuranceMoney(policy.total_amount)}
                        </strong>
                      </td>
                      <td>
                        <em className={`insurance-status ${policyState}`}>
                          {insuranceStatusLabel(policyState)}
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
            <span>{pagination ? `${pagination.from ?? 0}–${pagination.to ?? 0} sur ${pagination.total}` : `${filteredPolicies.length} police(s)`}</span>
            <div>
              <button type="button" disabled={!pagination || pagination.current_page === 1 || loading} onClick={() => setPage((current) => current - 1)}>
                Précédent
              </button>
              <span>{pagination?.current_page ?? 1} / {pagination?.last_page ?? 1}</span>
              <button type="button" disabled={!pagination || pagination.current_page === pagination.last_page || loading} onClick={() => setPage((current) => current + 1)}>
                Suivant
              </button>
            </div>
          </nav>
        )}
      </section>
      {showFilters && (
        <InsuranceFilterPanel
          status={status}
          projectId={projectId}
          sites={sites}
          onStatusChange={(value) => { setStatus(value); setPage(1); }}
          onProjectChange={(value) => {
            setProjectId(value);
            setPage(1);
            if (value) setActiveType("trc_rc");
          }}
          onClose={() => setShowFilters(false)}
          onClear={() => {
            setStatus("all");
            setProjectId("");
            setPage(1);
          }}
        />
      )}
      {showAdd && (
        <InsuranceAddPanel
          defaultType={activeType === "all" ? "trc_rc" : activeType}
          sites={sites}
          equipmentOptions={equipmentOptions}
          employeeOptions={employeeOptions}
          onClose={() => setShowAdd(false)}
          onSaved={(policy) => {
            setPolicies((current) => [policy, ...current]);
            setSelectedId(policy.id);
            setShowAdd(false);
          }}
        />
      )}
      {editingPolicy && (
        <InsuranceAddPanel
          policy={editingPolicy}
          defaultType={editingPolicy.insurance_type}
          sites={sites}
          equipmentOptions={equipmentOptions}
          employeeOptions={employeeOptions}
          onClose={() => setEditingPolicy(null)}
          onSaved={(policy) => {
            setPolicies((current) =>
              current.map((item) => (item.id === policy.id ? policy : item)),
            );
            setSelectedId(policy.id);
            setEditingPolicy(null);
          }}
        />
      )}
      {selected && (
        <InsuranceDetailPanel
          key={selected.id}
          policy={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setSelectedId(null);
            setEditingPolicy(selected);
          }}
          onDocumentsChanged={(documents) => {
            setSelected((current) => current ? { ...current, documents } : current);
            setPolicies((current) =>
              current.map((item) =>
                item.id === selected.id ? { ...item, documents } : item,
              ),
            );
          }}
          onDeleted={() => {
            setPolicies((current) =>
              current.filter((item) => item.id !== selected.id),
            );
            setSelectedId(null);
          }}
          onOpenEquipment={(equipmentId) => {
            setRelatedEquipmentId(equipmentId);
          }}
        />
      )}
      {relatedEquipmentId && relatedEquipmentContext && (
        <RelatedEquipmentDetailPanel
          key={relatedEquipmentId}
          equipmentId={relatedEquipmentId}
          {...relatedEquipmentContext}
          onClose={() => setRelatedEquipmentId(null)}
        />
      )}
    </main>
  );
}
