import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  apiRequest,
  getAuthenticatedFileObjectUrl,
} from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import {
  RecordHistory,
  type RecordHistoryEntry,
} from "../../../shared/components/RecordHistory";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";

type BondStatus = "active" | "soon" | "expired";
type BondType = "advance_payment" | "performance" | "retention";
type BondDocument = {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
};
type PhysicalLocation = { id: number; name: string; parent_id: number | null };
type Site = { id: number; name: string; locations: PhysicalLocation[] };
type Bond = {
  id: number;
  bond_type: BondType;
  issuer: string | null;
  amount: string;
  currency: string;
  issued_on: string | null;
  expires_on: string | null;
  notes: string | null;
  project: Site;
  location: Pick<PhysicalLocation, "id" | "name"> | null;
  documents: BondDocument[];
  created_at: string | null;
  changes?: RecordHistoryEntry[];
};

const bondTypeOptions: { value: BondType; label: string }[] = [
  { value: "advance_payment", label: "Avance de démarrage" },
  { value: "performance", label: "Bonne exécution" },
  { value: "retention", label: "Retenue de garantie" },
];
const bondTypeLabel = (type: BondType) =>
  bondTypeOptions.find((option) => option.value === type)?.label ?? type;

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`))
    : "À compléter";
const formatAmount = (value: string | number | null, currency = "XOF") =>
  `${Number(value ?? 0).toLocaleString("en-US")} ${currency === "XOF" ? "FCFA" : currency}`;

function bondStatus(bond: Bond): BondStatus {
  if (!bond.expires_on) return "active";
  const expiry = new Date(`${bond.expires_on}T23:59:59`);
  const now = new Date();
  if (expiry < now) return "expired";
  const soon = new Date();
  soon.setDate(now.getDate() + 30);
  return expiry <= soon ? "soon" : "active";
}
const statusLabel = (status: BondStatus) =>
  status === "active"
    ? "Active"
    : status === "soon"
      ? "Expire bientôt"
      : "Expirée";

export function BondsPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BondStatus | "all">("all");
  const [type, setType] = useState<BondType | "all">("all");
  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Bond | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function refresh() {
    setLoading(true);
    apiRequest<{ data: Bond[] }>("/api/v1/bonds")
      .then((response) => setBonds(response.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    apiRequest<{ data: Bond[] }>("/api/v1/bonds")
      .then((response) => setBonds(response.data))
      .finally(() => setLoading(false));
    apiRequest<{ data: Site[] }>("/api/v1/sites")
      .then((response) => setSites(response.data))
      .catch(() => setSites([]));
  }, []);

  const filtered = useMemo(
    () =>
      bonds.filter((bond) => {
        const term = search.trim().toLowerCase();
        const text = [
          bond.issuer,
          bond.project?.name,
          bond.location?.name,
          bondTypeLabel(bond.bond_type),
        ]
          .join(" ")
          .toLowerCase();
        return (
          (status === "all" || bondStatus(bond) === status) &&
          (type === "all" || bond.bond_type === type) &&
          (!siteId || bond.project?.id === Number(siteId)) &&
          (!term || text.includes(term))
        );
      }),
    [bonds, search, siteId, status, type],
  );
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const selected = bonds.find((bond) => bond.id === selectedId) ?? null;

  const updateBond = (bond: Bond) =>
    setBonds((current) =>
      current.map((item) => (item.id === bond.id ? bond : item)),
    );

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
                setPage(0);
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
                  const state = bondStatus(bond);
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
                          {formatAmount(bond.amount, bond.currency)}
                        </strong>
                      </td>
                      <td className="bond-date-cell">
                        {formatDate(bond.issued_on)}
                      </td>
                      <td className="bond-date-cell">
                        {formatDate(bond.expires_on)}
                      </td>
                      <td>
                        <em className={`insurance-status ${state}`}>
                          {statusLabel(state)}
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
              {filtered.length} caution{filtered.length !== 1 ? "s" : ""}{" "}
              affichée{filtered.length !== 1 ? "s" : ""}
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
      {showFilters && (
        <BondFilters
          sites={sites}
          status={status}
          type={type}
          siteId={siteId}
          onStatus={(value) => {
            setStatus(value);
            setPage(0);
          }}
          onType={(value) => {
            setType(value);
            setPage(0);
          }}
          onSite={(value) => {
            setSiteId(value);
            setPage(0);
          }}
          onClose={() => setShowFilters(false)}
          onClear={() => {
            setStatus("all");
            setType("all");
            setSiteId("");
            setPage(0);
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

function BondForm({
  sites,
  bond,
  onClose,
  onSaved,
}: {
  sites: Site[];
  bond?: Bond;
  onClose: () => void;
  onSaved: (bond: Bond) => void;
}) {
  const [siteId, setSiteId] = useState(bond ? String(bond.project.id) : "");
  const [locationId, setLocationId] = useState(
    bond?.location ? String(bond.location.id) : "",
  );
  const [bondType, setBondType] = useState<BondType>(
    bond?.bond_type ?? "advance_payment",
  );
  const [currency, setCurrency] = useState(bond?.currency ?? "XOF");
  const [amount, setAmount] = useState(bond?.amount ?? "0");
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const physicalLocations = (
    sites.find((site) => String(site.id) === siteId)?.locations ?? []
  ).filter((location) => location.parent_id !== null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    let savedBond: Bond | null = null;
    try {
      const response = await apiRequest<{ data: Bond }>(
        bond ? `/api/v1/bonds/${bond.id}` : "/api/v1/bonds",
        {
          method: bond ? "PATCH" : "POST",
          body: JSON.stringify({
            project_id: Number(siteId),
            location_id: Number(locationId),
            bond_type: bondType,
            issuer: form.get("issuer") || null,
            amount: Number(amount) || 0,
            currency,
            issued_on: form.get("issued_on") || null,
            expires_on: form.get("expires_on") || null,
            notes: form.get("notes") || null,
          }),
        },
      );
      savedBond = response.data;
      const uploaded: BondDocument[] = [];
      for (const document of documents) {
        const body = new FormData();
        body.append("documents[]", document);
        const result = await apiRequest<{ data: BondDocument[] }>(
          `/api/v1/bonds/${response.data.id}/documents`,
          { method: "POST", body },
        );
        uploaded.push(...result.data);
      }
      response.data.documents = [
        ...(response.data.documents ?? []),
        ...uploaded,
      ];
      await apiRequest<{ data: { sent: boolean } }>(
        `/api/v1/bonds/${response.data.id}/send-expiry-reminder`,
        { method: "POST" },
      ).catch(() => undefined);
      onSaved(response.data);
    } catch (reason) {
      if (!bond && savedBond) {
        await apiRequest(`/api/v1/bonds/${savedBond.id}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setError(
        reason instanceof ApiError
          ? (Object.values(reason.errors)[0]?.[0] ?? reason.message)
          : "Impossible d’enregistrer la caution.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-add-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={bond ? "Modifier la caution" : "Ajouter une caution"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header insurance-add-header">
          <div>
            <p className="section-label">Cautions</p>
            <h2>{bond ? "Modifier la caution" : "Ajouter une caution"}</h2>
            <p>Renseignez la garantie financière et sa localisation précise.</p>
          </div>
          <div>
            <button
              className="save-button"
              type="submit"
              form="bond-form"
              disabled={saving || !siteId || !locationId}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" aria-label="Fermer" onClick={onClose}>
              <ActionIcon name="close" />
            </button>
          </div>
        </header>
        <form id="bond-form" className="insurance-add-form" onSubmit={save}>
          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}
          <section>
            <h3>
              <ActionIcon name="identification" />
              Informations de la caution
            </h3>
            <div className="insurance-form-grid">
              <label>
                Site / projet
                <SearchableSelect
                  ariaLabel="Site lié"
                  value={siteId}
                  onChange={(value) => {
                    setSiteId(value);
                    setLocationId("");
                  }}
                  placeholder="Sélectionner un site"
                  includeEmpty={false}
                  options={sites.map((site) => ({
                    value: String(site.id),
                    label: site.name,
                  }))}
                />
              </label>
              <label>
                Localisation physique
                <SearchableSelect
                  ariaLabel="Localisation physique"
                  value={locationId}
                  onChange={setLocationId}
                  placeholder={
                    siteId
                      ? "Sélectionner une localisation"
                      : "Sélectionnez d’abord un site"
                  }
                  includeEmpty={false}
                  disabled={!siteId}
                  options={physicalLocations.map((location) => ({
                    value: String(location.id),
                    label: location.name,
                  }))}
                />
              </label>
              <label>
                Type de caution
                <SearchableSelect
                  ariaLabel="Type de caution"
                  value={bondType}
                  onChange={(value) => setBondType(value as BondType)}
                  placeholder="Sélectionner un type"
                  includeEmpty={false}
                  options={bondTypeOptions}
                />
              </label>
              <label>
                Banque / émetteur
                <input name="issuer" defaultValue={bond?.issuer ?? ""} />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              Montant de la caution
            </h3>
            <div className="insurance-form-grid bond-payment-grid">
              <label>
                Montant
                <input
                  inputMode="numeric"
                  value={Number(amount || 0).toLocaleString("en-US")}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^\d]/g, ""))
                  }
                />
              </label>
              <label>
                Devise
                <SearchableSelect
                  ariaLabel="Devise"
                  value={currency}
                  onChange={setCurrency}
                  placeholder="Sélectionner une devise"
                  includeEmpty={false}
                  options={[
                    { value: "XOF", label: "FCFA (XOF)" },
                    { value: "EUR", label: "Euro (EUR)" },
                    { value: "USD", label: "Dollar (USD)" },
                  ]}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              Dates
            </h3>
            <div className="insurance-form-grid">
              <label>
                Date d’émission
                <input
                  type="date"
                  name="issued_on"
                  defaultValue={bond?.issued_on ?? ""}
                />
              </label>
              <label>
                Date d’expiration
                <input
                  type="date"
                  name="expires_on"
                  defaultValue={bond?.expires_on ?? ""}
                />
              </label>
            </div>
          </section>
          <section>
            <h3>
              <ActionIcon name="note" />
              Observations
            </h3>
            <label className="insurance-form-notes">
              <textarea
                name="notes"
                rows={2}
                defaultValue={bond?.notes ?? ""}
              />
            </label>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              Documents
            </h3>
            <DocumentUploadDropzone
              compact
              title={
                documents.length
                  ? `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}`
                  : "Ajouter des documents"
              }
              description="Garanties, attestations ou avenants · PDF uniquement · 10 Mo maximum par fichier"
              onFiles={(files) =>
                setDocuments((current) => [...current, ...files])
              }
            />
            {documents.length > 0 && (
              <ul className="bond-selected-documents">
                {documents.map((document, index) => (
                  <li key={`${document.name}-${index}`}>
                    <span>{document.name}</span>
                    <button
                      type="button"
                      aria-label={`Retirer ${document.name}`}
                      onClick={() =>
                        setDocuments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </form>
      </aside>
    </div>
  );
}

function BondDetails({
  bond,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
}: {
  bond: Bond;
  onClose: () => void;
  onEdit: () => void;
  onChanged: (bond: Bond) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState<RecordHistoryEntry[]>(
    bond.changes ?? [],
  );
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const state = bondStatus(bond);
  async function refreshHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await apiRequest<{ data: Bond }>(
        `/api/v1/bonds/${bond.id}`,
      );
      setHistory(response.data.changes ?? []);
    } catch {
      setHistoryError("Impossible de charger l’historique de cette caution.");
    } finally {
      setHistoryLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    apiRequest<{ data: Bond }>(`/api/v1/bonds/${bond.id}`)
      .then((response) => {
        if (active) setHistory(response.data.changes ?? []);
      })
      .catch(() => {
        if (active)
          setHistoryError(
            "Impossible de charger l’historique de cette caution.",
          );
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bond.id]);
  function openHistory() {
    const section = document.getElementById(
      `bond-history-${bond.id}`,
    ) as HTMLDetailsElement | null;
    if (section) {
      section.open = true;
      section.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (!historyLoading) void refreshHistory();
  }
  async function remove() {
    if (
      !window.confirm(
        `Supprimer la caution liée au site ${bond.project.name} ?`,
      )
    )
      return;
    setDeleting(true);
    try {
      await apiRequest(`/api/v1/bonds/${bond.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-side-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Détail de la caution"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">Caution</p>
            <h2>{bond.project.name}</h2>
            <p>{bond.location?.name || "Localisation à compléter"}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="detail-content insurance-side-content">
          <div className="detail-primary-actions">
            <button
              className="equipment-edit-button detail-toolbar-button"
              type="button"
              onClick={onEdit}
            >
              <ActionIcon name="edit" />
              Modifier
            </button>
            <button
              className="equipment-history-button detail-toolbar-button"
              type="button"
              onClick={() => void openHistory()}
            >
              <ActionIcon name="history" />
              Voir l’historique
            </button>
            <button
              className="danger-button detail-delete-button"
              type="button"
              disabled={deleting}
              onClick={() => void remove()}
              aria-label="Supprimer"
            >
              <ActionIcon name="delete" />
            </button>
          </div>
          <section>
            <h3>
              <ActionIcon name="identification" />
              Informations principales
            </h3>
            <dl>
              <div>
                <dt>Site / projet</dt>
                <dd>{bond.project.name}</dd>
              </div>
              <div>
                <dt>Localisation physique</dt>
                <dd>{bond.location?.name || "À compléter"}</dd>
              </div>
              <div>
                <dt>Type de caution</dt>
                <dd>{bondTypeLabel(bond.bond_type)}</dd>
              </div>
              <div>
                <dt>Banque / émetteur</dt>
                <dd>{bond.issuer || "À compléter"}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="invoice" />
              Montant de la caution
            </h3>
            <dl>
              <div>
                <dt>Montant</dt>
                <dd>{formatAmount(bond.amount, bond.currency)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <ActionIcon name="history" />
              Période et statut
            </h3>
            <dl>
              <div>
                <dt>Date d’émission</dt>
                <dd>{formatDate(bond.issued_on)}</dd>
              </div>
              <div>
                <dt>Date d’expiration</dt>
                <dd>{formatDate(bond.expires_on)}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>
                  <em className={`insurance-status ${state}`}>
                    {statusLabel(state)}
                  </em>
                </dd>
              </div>
            </dl>
          </section>
          <BondDocuments
            bond={bond}
            onChanged={(documents) => onChanged({ ...bond, documents })}
          />
          <section>
            <h3>
              <ActionIcon name="note" />
              Observations
            </h3>
            <p className="observations">
              {bond.notes || "Aucune observation."}
            </p>
          </section>
          <details id={`bond-history-${bond.id}`} className="detail-section">
            <summary>
              <h3>
                <ActionIcon name="history" />
                Historique
              </h3>
              <ActionIcon name="expand" />
            </summary>
            <div className="detail-section-body">
              <RecordHistory
                entries={history}
                loading={historyLoading}
                error={historyError}
                actionLabels={{
                  created: "Caution créée",
                  updated: "Caution modifiée",
                  document_added: "Document ajouté",
                  document_deleted: "Document supprimé",
                }}
                emptyDescription="Les modifications de cette caution apparaîtront ici."
              />
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}

function BondDocuments({
  bond,
  onChanged,
}: {
  bond: Bond;
  onChanged: (documents: BondDocument[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function upload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    let documents = bond.documents;
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("documents[]", file);
        const response = await apiRequest<{ data: BondDocument[] }>(
          `/api/v1/bonds/${bond.id}/documents`,
          { method: "POST", body },
        );
        documents = [...documents, ...response.data];
        onChanged(documents);
      }
    } catch {
      setError("Impossible d’ajouter les documents.");
    } finally {
      setUploading(false);
    }
  }
  async function remove(document: BondDocument) {
    if (
      !window.confirm(`Supprimer le document « ${document.original_name} » ?`)
    )
      return;
    setDeletingId(document.id);
    setError(null);
    try {
      await apiRequest(`/api/v1/bonds/${bond.id}/documents/${document.id}`, {
        method: "DELETE",
      });
      onChanged(bond.documents.filter((item) => item.id !== document.id));
    } catch {
      setError("Impossible de supprimer ce document.");
    } finally {
      setDeletingId(null);
    }
  }
  async function preview(document: BondDocument) {
    const url = await getAuthenticatedFileObjectUrl(
      `${document.url}?preview=1`,
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <section className="insurance-documents-section">
      <h3>
        <ActionIcon name="invoice" />
        Documents
      </h3>
      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}
      {bond.documents.length ? (
        <div className="invoice-list">
          {bond.documents.map((document) => (
            <article key={document.id}>
              <button
                className="invoice-preview-button"
                type="button"
                onClick={() => void preview(document)}
              >
                <span className="invoice-pdf-badge">PDF</span>
                <span>
                  <strong>{document.original_name}</strong>
                  <small>
                    {Math.max(1, Math.round(document.size_bytes / 1024))} Ko
                  </small>
                </span>
              </button>
              <button
                className="invoice-delete-button"
                type="button"
                disabled={deletingId === document.id}
                onClick={() => void remove(document)}
                aria-label={`Supprimer ${document.original_name}`}
              >
                {deletingId === document.id ? (
                  <LoadingSpinner compact label="Suppression" />
                ) : (
                  <ActionIcon name="delete" />
                )}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon="invoice"
          title="Aucun document ajouté"
          description="Les garanties et avenants associés apparaîtront ici."
        />
      )}
      <DocumentUploadDropzone
        compact
        disabled={uploading}
        title={uploading ? "Ajout en cours…" : "Ajouter des documents"}
        onFiles={(files) => void upload(files)}
      />
    </section>
  );
}

function BondFilters({
  sites,
  status,
  type,
  siteId,
  onStatus,
  onType,
  onSite,
  onClose,
  onClear,
}: {
  sites: Site[];
  status: BondStatus | "all";
  type: BondType | "all";
  siteId: string;
  onStatus: (value: BondStatus | "all") => void;
  onType: (value: BondType | "all") => void;
  onSite: (value: string) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside
        className="detail-panel insurance-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">Cautions</p>
            <h2>Filtres</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="insurance-filter-content">
          <label>
            Statut
            <SearchableSelect
              ariaLabel="Statut"
              value={status}
              onChange={(value) => onStatus(value as BondStatus | "all")}
              placeholder="Tous les statuts"
              includeEmpty={false}
              options={[
                { value: "all", label: "Tous les statuts" },
                { value: "active", label: "Active" },
                { value: "soon", label: "Expire bientôt" },
                { value: "expired", label: "Expirée" },
              ]}
            />
          </label>
          <label>
            Type de caution
            <SearchableSelect
              ariaLabel="Type de caution"
              value={type}
              onChange={(value) => onType(value as BondType | "all")}
              placeholder="Tous les types"
              includeEmpty={false}
              options={[
                { value: "all", label: "Tous les types" },
                ...bondTypeOptions,
              ]}
            />
          </label>
          <label>
            Site / projet
            <SearchableSelect
              ariaLabel="Site"
              value={siteId}
              onChange={onSite}
              placeholder="Tous les sites"
              options={sites.map((site) => ({
                value: String(site.id),
                label: site.name,
              }))}
            />
          </label>
        </div>
        <footer className="insurance-filter-actions">
          <button type="button" onClick={onClear}>
            Effacer les filtres
          </button>
          <button className="save-button" type="button" onClick={onClose}>
            Afficher les résultats
          </button>
        </footer>
      </aside>
    </div>
  );
}
