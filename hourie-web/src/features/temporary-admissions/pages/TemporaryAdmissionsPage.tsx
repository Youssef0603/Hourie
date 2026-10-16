import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { admissionError, fetchTemporaryAdmission } from "../api";
import { TemporaryAdmissionDetails } from "../components/TemporaryAdmissionDetails";
import { TemporaryAdmissionForm } from "../components/TemporaryAdmissionForm";
import { RelatedEquipmentDetailPanel } from "../../equipment/components/RelatedEquipmentDetailPanel";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import { operationPhrase, operationsLocale, operationsText } from "../../../i18n/operations";
import type { EquipmentFilterOptions } from "../../equipment/types";
import type { AdmissionEquipment, TemporaryAdmission } from "../types";
import type { PaginatedResponse, PaginationMeta } from "../../../shared/api/pagination";

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
  const [items, setItems] = useState<TemporaryAdmission[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [equipment, setEquipment] = useState<AdmissionEquipment[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<
    TemporaryAdmission | null | undefined
  >();
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAdmissionId,
  );
  const [selected, setSelected] = useState<TemporaryAdmission | null>(null);
  const [relatedEquipmentId, setRelatedEquipmentId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    try {
      const admissions = await apiRequest<PaginatedResponse<TemporaryAdmission>>(`/api/v1/temporary-admissions?${params}`);
      setItems(admissions.data ?? []);
      setPagination(admissions.meta ?? null);
    } catch (caught) {
      setError(admissionError(caught, text.loadError));
    } finally { setLoading(false); }
  }, [page, search, text.loadError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), 200);
    return () => window.clearTimeout(timer);
  }, [loadItems]);

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
  const pageCount = pagination?.last_page ?? 1;
  const currentPage = pagination?.current_page ?? page;

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
      </section>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      <section className="inventory-panel">
        <div className="filter-bar">
          <label className="search-field">
            <span>{text.search}</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={text.searchPlaceholder}
            />
          </label>
          <div className="filter-toolbar-actions">
            {canManage && (
              <button
                className="table-refresh-button table-add-button"
                type="button"
                aria-label={text.add}
                title={text.add}
                onClick={() => setFormItem(null)}
              >
                <ActionIcon name="add" />
              </button>
            )}
            <button
              className="table-refresh-button filter-refresh-button"
              type="button"
              aria-label={text.refresh}
              title={text.refresh}
              disabled={loading}
              onClick={() => void loadItems()}
            >
              <ActionIcon name="refresh" />
            </button>
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
                  <tr key={item.id} onClick={() => setSelectedId(item.id)}>
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
        {!loading && (
          <nav className="pagination insurance-pagination">
            <span>
              {pagination ? `${pagination.from ?? 0}–${pagination.to ?? 0} ${text.of} ${pagination.total}` : text.count(visible.length)}
            </span>
            <div>
              <button
                type="button"
                disabled={currentPage === 1 || loading}
                onClick={() => setPage(currentPage - 1)}
              >
                {text.previous}
              </button>
              <span>
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount || loading}
                onClick={() => setPage(currentPage + 1)}
              >
                {text.next}
              </button>
            </div>
          </nav>
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
  if (!value) return operationPhrase("À compléter");
  return new Intl.DateTimeFormat(operationsLocale()).format(new Date(`${value}T00:00:00`));
}
