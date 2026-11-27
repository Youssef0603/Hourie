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
import { RenewInsuranceDialog } from "../components/RenewInsuranceDialog";
import { RelatedEquipmentDetailPanel } from "../../equipment/components/RelatedEquipmentDetailPanel";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import type { EquipmentFilterOptions } from "../../equipment/types";
import type { PaginatedResponse } from "../../../shared/api/pagination";
import { usePaginatedList } from "../../../shared/usePaginatedList";
import { operationsText, operationPhrase } from "../../../i18n/operations";
import { TotalCount } from "../../../shared/components/TotalCount";

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
  const text = operationsText().insurance;
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
  const [renewingPolicy, setRenewingPolicy] = useState<Policy | null>(null);
  const filterCount = Number(status !== "all") + Number(Boolean(projectId));
  function clearFilters() {
    setStatus("all");
    setProjectId("");
    setPage(1);
  }
  const [sites, setSites] = useState<Array<{
    id: number;
    name: string;
    locations: Array<{ id: number; project_id: number; parent_id: number | null; name: string }>;
  }>>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<
    InsuranceEquipmentOption[]
  >([]);
  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ id: number; name: string; birth_date: string | null }>
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialPolicyId);
  const [selected, setSelected] = useState<Policy | null>(null);
  const [relatedEquipmentId, setRelatedEquipmentId] = useState<number | null>(null);

  const fetchPolicies = useCallback((page: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (activeType !== "all") params.set("insurance_type", activeType);
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    if (projectId) params.set("project_id", projectId);
    return apiRequest<PaginatedResponse<Policy> & { category_counts: Record<string, number> }>(`/api/v1/insurance-policies?${params}`);
  }, [activeType, projectId, search, status]);
  const { items: policies, setItems: setPolicies, meta: pagination, response, setPage, loading, error: listError, reload: refreshPolicies } = usePaginatedList<Policy, PaginatedResponse<Policy> & { category_counts: Record<string, number> }>(
    fetchPolicies,
    operationPhrase("Impossible de charger les assurances."),
  );
  const categoryCounts = response?.category_counts ?? {};

  useEffect(() => {
    apiRequest<PaginatedResponse<{
      id: number;
      name: string;
      locations: Array<{ id: number; project_id: number; parent_id: number | null; name: string }>;
    }>>("/api/v1/sites?per_page=100")
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
  const showPhysicalLocation = activeType === "trc_rc";
  const tableColumnCount = showPhysicalLocation ? 8 : 7;
  const filteredSiteName = sites.find(
    (site) => String(site.id) === projectId,
  )?.name;

  return (
    <main className="equipment-page asset-page insurance-workspace">
      <section className="insurance-heading">
        <div>
          <p className="section-label">{text.management}</p>
          <h1>{text.title}</h1>
          <p>
            {filteredSiteName
              ? text.siteSubtitle(filteredSiteName)
              : text.subtitle}
          </p>
        </div>
        <TotalCount
          value={pagination?.total ?? filteredPolicies.length}
          label={text.title}
          loading={loading}
        />
      </section>
      {listError && <div className="form-alert" role="alert">{listError}</div>}
      <section className="asset-category-section insurance-category-section">
        <h2>{text.categories}</h2>
        <nav className="asset-categories" aria-label={text.categoryAria}>
          <button
            className={`asset-category-card${activeType === "all" ? " active" : ""}`}
            type="button"
            onClick={() => { setActiveType("all"); setPage(1); }}
          >
            <span>{text.allPolicies}</span>
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
              <span>{insuranceTypeLabel(type.code)}</span>
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
          <SearchField
            id="insurance-search"
            label={text.search}
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder={text.searchPlaceholder}
          />
          <div className="filter-toolbar-actions">
            <FilterToggleButton
              label={text.filters}
              active={showFilters}
              count={filterCount}
              onClick={() => setShowFilters((value) => !value)}
            />
            <ToolbarIconButton icon="add" label={text.addPolicy} onClick={() => setShowAdd(true)} />
            <ToolbarIconButton icon="refresh" label={text.refresh} disabled={loading} onClick={() => void refreshPolicies()} />
            <ClearFiltersButton count={filterCount} onClear={clearFilters} />
          </div>
        </div>
        <div className="equipment-table-wrap">
          <table className="equipment-table insurance-table">
            <thead>
              <tr>
                <th>{text.columns.policyNumber}</th>
                <th>{text.columns.insurer}</th>
                <th>{text.columns.type}</th>
                {showPhysicalLocation && (
                  <th>{text.columns.physicalLocation}</th>
                )}
                <th>{text.columns.covered}</th>
                <th>{text.columns.period}</th>
                <th>{text.columns.total}</th>
                <th>{text.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="insurance-empty-row">
                  <td colSpan={tableColumnCount} className="insurance-table-empty">
                    <LoadingSpinner label={text.loading} />
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr className="insurance-empty-row">
                  <td colSpan={tableColumnCount} className="insurance-table-empty">
                    <EmptyState
                      title={text.empty}
                      description={text.emptyDescription}
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
                      {...clickableRow(() => setSelectedId(policy.id))}
                    >
                      <td>
                        <strong>{policy.policy_number}</strong>
                      </td>
                      <td>{policy.source || text.toComplete}</td>
                      <td>{insuranceTypeLabel(policy.insurance_type)}</td>
                      {showPhysicalLocation && (
                        <td>{policy.location?.name || text.toComplete}</td>
                      )}
                      <td>{coveredInsuranceLabel(policy)}</td>
                      <td className="insurance-period-cell">
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
        {!loading && pagination && (
          <Pagination meta={pagination} onPageChange={setPage} hideWhenSinglePage={false} />
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
            setSelected(policy);
            setEditingPolicy(null);
          }}
        />
      )}
      {selected && !editingPolicy && (
        <InsuranceDetailPanel
          key={selected.id}
          policy={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setEditingPolicy(selected);
          }}
          onRenew={() => setRenewingPolicy(selected)}
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
      {renewingPolicy && (
        <RenewInsuranceDialog
          policy={renewingPolicy}
          onClose={() => setRenewingPolicy(null)}
          onRenewed={(policy) => {
            setPolicies((current) =>
              current.map((item) => (item.id === policy.id ? policy : item)),
            );
            setSelected(policy);
            setRenewingPolicy(null);
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
