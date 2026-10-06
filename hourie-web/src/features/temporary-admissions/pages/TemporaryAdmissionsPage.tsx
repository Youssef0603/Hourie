import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { admissionError } from "../api";
import { TemporaryAdmissionDetails } from "../components/TemporaryAdmissionDetails";
import { TemporaryAdmissionForm } from "../components/TemporaryAdmissionForm";
import { RelatedEquipmentDetailPanel } from "../../equipment/components/RelatedEquipmentDetailPanel";
import type { AuthenticatedUser } from "../../auth/types";
import type { Language } from "../../../i18n/fr";
import type { EquipmentFilterOptions } from "../../equipment/types";
import type { AdmissionEquipment, TemporaryAdmission } from "../types";

const PAGE_SIZE = 10;
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
  const [equipment, setEquipment] = useState<AdmissionEquipment[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<
    TemporaryAdmission | null | undefined
  >();
  const [selectedId, setSelectedId] = useState<number | null>(
    initialAdmissionId,
  );
  const selected =
    items.find((item) => item.id === selectedId) ?? null;
  const [relatedEquipmentId, setRelatedEquipmentId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      apiRequest<{ data: TemporaryAdmission[] }>(
        "/api/v1/temporary-admissions",
      ),
      apiRequest<{ data: AdmissionEquipment[] }>(
        "/api/v1/temporary-admission-equipment-options",
      ),
    ])
      .then(([admissions, equipmentItems]) => {
        setItems(admissions.data);
        setEquipment(equipmentItems.data);
      })
      .catch((caught) =>
        setError(
          admissionError(caught, "Impossible de charger les admissions."),
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) =>
      item.customs_reference.toLowerCase().includes(term),
    );
  }, [items, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  function save(item: TemporaryAdmission) {
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
                setPage(0);
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
                    <td>{item.documents.length}</td>
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
              {filtered.length} admission{filtered.length !== 1 ? "s" : ""}
            </span>
            <div>
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Précédent
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={currentPage === pageCount - 1}
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
