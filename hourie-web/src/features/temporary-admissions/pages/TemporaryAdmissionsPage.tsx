import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ToolbarIconButton } from "../../../shared/components/ToolbarButtons";
import { Pagination } from "../../../shared/components/Pagination";
import { SearchField } from "../../../shared/components/SearchField";
import { clickableRow } from "../../../shared/clickableRow";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { admissionError, fetchTemporaryAdmission } from "../api";
import { TemporaryAdmissionDetails } from "../components/TemporaryAdmissionDetails";
import { TemporaryAdmissionForm } from "../components/TemporaryAdmissionForm";
import { RelatedEquipmentDetailPanel } from "../../equipment/components/RelatedEquipmentDetailPanel";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import { operationPhrase, operationsText } from "../../../i18n/operations";
import { formatDate as formatApiDate } from "../../../shared/format";
import type { EquipmentFilterOptions } from "../../equipment/types";
import type { AdmissionEquipment, TemporaryAdmission } from "../types";
import type { PaginatedResponse } from "../../../shared/api/pagination";
import { usePaginatedList } from "../../../shared/usePaginatedList";
import { TotalCount } from "../../../shared/components/TotalCount";

export function TemporaryAdmissionsPage({
  canManage,
  initialAdmissionId = null,
  relatedEquipmentContext,
}: {
  canManage: boolean;
  initialAdmissionId?: number | null;
  relatedEquipmentContext?: {
    user: AuthenticatedUser;
    language: Language;
    options: EquipmentFilterOptions | null;
  };
}) {
  const text = operationsText().admissions;
  const [equipment, setEquipment] = useState<AdmissionEquipment[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<
    TemporaryAdmission | null | undefined
  >();
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAdmissionId,
  );
  const [selected, setSelected] = useState<TemporaryAdmission | null>(null);
  const [relatedEquipmentId, setRelatedEquipmentId] = useState<number | null>(null);

  const fetchAdmissions = useCallback((page: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    return apiRequest<PaginatedResponse<TemporaryAdmission>>(`/api/v1/temporary-admissions?${params}`);
  }, [search]);
  const loadErrorMessage = useCallback((caught: unknown) => admissionError(caught, text.loadError), [text.loadError]);
  const { items, setItems, meta: pagination, setPage, loading, error: listError, reload: loadItems } = usePaginatedList<TemporaryAdmission>(
    fetchAdmissions,
    loadErrorMessage,
  );

  useEffect(() => {
    Promise.all([
      apiRequest<{ data: AdmissionEquipment[] }>(
        "/api/v1/temporary-admission-equipment-options",
      ),
    ])
      .then(([equipmentItems]) => {
        setEquipment(equipmentItems.data);
      })
      .catch((caught) =>
        setError(
          admissionError(caught, text.loadError),
        ),
      )
  }, [text.loadError]);

  const visible = items;

  useEffect(() => {
    if (selectedId === null) {
      const timer = window.setTimeout(() => setSelected(null), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    fetchTemporaryAdmission(selectedId)
      .then((item) => { if (active) setSelected(item); })
      .catch((caught) => { if (active) { setSelectedId(null); setError(admissionError(caught, text.detailError)); } });
    return () => { active = false; };
  }, [selectedId, text.detailError]);

  function save(item: TemporaryAdmission) {
    setSelected(item);
    setItems((all) => {
      const exists = all.some((entry) => entry.id === item.id);
      return exists
        ? all.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...all];
    });
    setFormItem(undefined);
    setSelectedId(item.id);
  }

  return (
    <main className="equipment-page asset-page">
      <section className="insurance-heading">
        <div>
          <p className="section-label">{text.management}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <TotalCount
          value={pagination?.total ?? visible.length}
          label={text.title}
          loading={loading}
        />
      </section>
      {(error ?? listError) && (
        <div className="form-alert" role="alert">
          {error ?? listError}
        </div>
      )}
      <section className="inventory-panel">
        <div className="filter-bar">
          <SearchField
            label={text.search}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={text.searchPlaceholder}
          />
          <div className="filter-toolbar-actions">
            {canManage && (
              <ToolbarIconButton icon="add" label={text.add} onClick={() => setFormItem(null)} />
            )}
            <ToolbarIconButton icon="refresh" label={text.refresh} disabled={loading} onClick={() => void loadItems()} />
          </div>
        </div>
        {loading ? (
          <div className="table-state">
            <LoadingSpinner label={text.loading} />
          </div>
        ) : visible.length ? (
          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>{text.columns.reference}</th>
                  <th>{text.columns.entryDate}</th>
                  <th>{text.columns.expiry}</th>
                  <th>{text.columns.documents}</th>
                  <th>{text.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id} {...clickableRow(() => setSelectedId(item.id))}>
                    <td>
                      <strong>{item.customs_reference}</strong>
                    </td>
                    <td>{formatDate(item.entered_on)}</td>
                    <td>{formatDate(item.expires_on)}</td>
                    <td>{item.documents_count ?? item.documents?.length ?? 0}</td>
                    <td>
                      <em
                        className={`insurance-status ${item.status}`}
                      >
                        {text.statuses[item.status]}
                      </em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="invoice"
            title={search ? text.noResults : text.empty}
            description={
              search
                ? text.noResultsDescription
                : text.emptyDescription
            }
          />
        )}
        {!loading && pagination && (
          <Pagination meta={pagination} onPageChange={setPage} hideWhenSinglePage={false} />
        )}
      </section>
      {formItem !== undefined && (
        <TemporaryAdmissionForm
          equipment={equipment}
          item={formItem ?? undefined}
          onClose={() => setFormItem(undefined)}
          onSaved={save}
        />
      )}
      {selected && formItem === undefined && (
        <TemporaryAdmissionDetails
          item={selected}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setFormItem(selected);
          }}
          onChanged={save}
          onDeleted={() => {
            setItems((all) => all.filter((item) => item.id !== selected.id));
            setSelectedId(null);
          }}
          onOpenEquipment={(equipmentId) => setRelatedEquipmentId(equipmentId)}
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

function formatDate(value: string | null) {
  return formatApiDate(value, { fallback: operationPhrase("À compléter") });
}
