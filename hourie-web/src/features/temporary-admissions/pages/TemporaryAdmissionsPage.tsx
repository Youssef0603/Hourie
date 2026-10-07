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
import type { EquipmentFilterOptions } from "../../equipment/types";
import type { AdmissionEquipment, TemporaryAdmission } from "../types";
import type { PaginatedResponse, PaginationMeta } from "../../../shared/api/pagination";

const statusLabel = {
  active: "Active",
  renewed: "Renouvelée",
  returned: "Retournée",
  cleared: "Dédouanée",
  expired: "Expirée",
};

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
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    try {
      const admissions = await apiRequest<PaginatedResponse<TemporaryAdmission>>(`/api/v1/temporary-admissions?${params}`);
      setItems(admissions.data ?? []);
      setPagination(admissions.meta ?? null);
    } catch (caught) {
      setError(admissionError(caught, "Impossible de charger les admissions."));
    } finally { setLoading(false); }
  }, [page, search]);

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
          admissionError(caught, "Impossible de charger les admissions."),
        ),
      )
  }, []);

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
      .catch((caught) => { if (active) { setSelectedId(null); setError(admissionError(caught, "Impossible de charger l’admission.")); } });
    return () => { active = false; };
  }, [selectedId]);

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
          <p className="section-label">Gestion</p>
          <h1>Admissions temporaires</h1>
          <p>
            Suivez les références douanières, renouvellements et retours
            d’équipements.
          </p>
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
            <span>Rechercher</span>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Référence douane"
            />
          </label>
          {canManage && (
            <button
              className="table-refresh-button table-add-button"
              type="button"
              aria-label="Ajouter une admission temporaire"
              onClick={() => setFormItem(null)}
            >
              <ActionIcon name="add" />
            </button>
          )}
        </div>
        {loading ? (
          <div className="table-state">
            <LoadingSpinner label="Chargement…" />
          </div>
        ) : visible.length ? (
          <div className="equipment-table-wrap">
            <table className="equipment-table">
              <thead>
                <tr>
                  <th>Référence douane</th>
                  <th>Date d’entrée</th>
                  <th>Échéance calculée</th>
                  <th>Documents</th>
                  <th>Statut</th>
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
                        className={`insurance-status ${item.status === "renewed" ? "active" : item.status}`}
                      >
                        {statusLabel[item.status]}
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
            title={search ? "Aucun résultat" : "Aucune admission temporaire"}
            description={
              search
                ? "Modifiez votre recherche pour afficher des admissions."
                : "Ajoutez une admission temporaire pour commencer le suivi."
            }
          />
        )}
        {!loading && (
          <nav className="pagination insurance-pagination">
            <span>
              {pagination ? `${pagination.from ?? 0}–${pagination.to ?? 0} sur ${pagination.total}` : `${visible.length} admission(s)`}
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
      {formItem !== undefined && (
        <TemporaryAdmissionForm
          equipment={equipment}
          item={formItem ?? undefined}
          onClose={() => setFormItem(undefined)}
          onSaved={save}
        />
      )}
      {selected && (
        <TemporaryAdmissionDetails
          item={selected}
          canManage={canManage}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setFormItem(selected);
            setSelectedId(null);
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`));
}
