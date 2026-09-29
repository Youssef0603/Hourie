import { useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest, getAuthenticatedFileObjectUrl } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";

type Kind = "trc_rc" | "individual_accident" | "group_health" | "equipment";
type PolicyDocument = { id: number; original_name: string; mime_type: string; size_bytes: number; url: string };
type Policy = {
  id: number; insurance_type: Kind; policy_number: string; starts_on: string | null; ends_on: string | null;
  net_premium: string | null; accessories_amount: string | null; tax_amount: string | null; total_amount: string | null; territory: string | null;
  insured_situation: string | null; source: string | null; notes: string | null;
  project?: { id: number; name: string } | null;
  documents?: PolicyDocument[];
  created_at?: string | null;
  employees?: Array<{ id: number; name: string }>;
  equipment?: Array<{ id: number; asset_code: string; brand: string | null; model: string | null }>;
};

const types: Array<{ code: Kind; label: string }> = [
  { code: "trc_rc", label: "TRC / RC" },
  { code: "individual_accident", label: "Accidents individuels" },
  { code: "group_health", label: "Santé groupe" },
  { code: "equipment", label: "Équipements" },
];
const typeLabel = (type: Kind) => types.find((item) => item.code === type)?.label ?? type;
const formatAmount = (amount: string | number | null) => `${Number(amount ?? 0).toLocaleString("en-US")}`;
const formatMoney = (amount: string | null) => amount === null ? "À compléter" : `${formatAmount(amount)} FCFA`;
const formatDate = (date: string | null) => date ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${date}T00:00:00`)) : "À compléter";

function policyStatus(policy: Policy): "active" | "soon" | "expired" {
  if (!policy.ends_on) return "active";
  const end = new Date(`${policy.ends_on}T23:59:59`);
  const now = new Date();
  if (end < now) return "expired";
  const limit = new Date(); limit.setDate(now.getDate() + 30);
  return end <= limit ? "soon" : "active";
}
const statusLabel = (status: ReturnType<typeof policyStatus>) => status === "active" ? "Active" : status === "soon" ? "Expire bientôt" : "Expirée";

function coveredLabel(policy: Policy) {
  if (policy.insurance_type === "equipment") return policy.equipment?.length ? `${policy.equipment.length} actif${policy.equipment.length > 1 ? "s" : ""}` : "Équipements à compléter";
  if (policy.insurance_type === "individual_accident" || policy.insurance_type === "group_health") return policy.employees?.length ? `${policy.employees.length} employé${policy.employees.length > 1 ? "s" : ""}` : "Employés à compléter";
  return policy.insured_situation || "Site / projet à compléter";
}

export function InsurancePage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activeType, setActiveType] = useState<Kind | "all">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "soon" | "expired">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [sites, setSites] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  function refreshPolicies() {
    setLoading(true);
    apiRequest<{ data: Policy[] }>("/api/v1/insurance-policies")
      .then((value) => setPolicies(value.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refreshPolicies();
    apiRequest<{ data: Array<{ id: number; name: string }> }>("/api/v1/sites").then((value) => setSites(value.data)).catch(() => setSites([]));
  }, []);

  const filteredPolicies = useMemo(() => policies.filter((policy) => {
    const term = search.trim().toLowerCase();
    const searchable = [policy.policy_number, policy.source, policy.insured_situation, ...(policy.employees?.map((employee) => employee.name) ?? []), ...(policy.equipment?.map((equipment) => `${equipment.brand ?? ""} ${equipment.model ?? ""} ${equipment.asset_code}`) ?? [])].join(" ").toLowerCase();
    return (activeType === "all" || policy.insurance_type === activeType) && (status === "all" || policyStatus(policy) === status) && (!term || searchable.includes(term));
  }), [activeType, policies, search, status]);
  const selected = policies.find((policy) => policy.id === selectedId) ?? null;

  return <main className="equipment-page asset-page insurance-workspace">
    <section className="insurance-heading"><div><p className="section-label">Gestion</p><h1>Assurances</h1><p>Suivez les polices, les échéances et les éléments couverts.</p></div></section>
    <section className="asset-category-section insurance-category-section">
      <h2>Catégories d’assurances</h2>
      <nav className="asset-categories" aria-label="Catégories d’assurance">
        <button className={`asset-category-card${activeType === "all" ? " active" : ""}`} type="button" onClick={() => setActiveType("all")}><span>Toutes les polices</span><strong>{policies.length}</strong></button>
        {types.map((type) => <button key={type.code} className={`asset-category-card${activeType === type.code ? " active" : ""}`} type="button" onClick={() => setActiveType(type.code)}><span>{type.label}</span><strong>{policies.filter((policy) => policy.insurance_type === type.code).length}</strong></button>)}
      </nav>
    </section>
    <section className="insurance-list-area inventory-panel">
          <div className="filter-bar">
            <div className="search-field"><label htmlFor="insurance-search">Rechercher</label><input id="insurance-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="N° de police, assureur, projet ou équipement" /></div>
            <div className="filter-toolbar-actions">
              <button className={`advanced-filter-toggle${showFilters ? " active" : ""}`} type="button" onClick={() => setShowFilters((value) => !value)}><ActionIcon name="filter" /><span>Filtres</span>{status !== "all" && <strong>1</strong>}</button>
              <button className="table-refresh-button table-add-button" type="button" aria-label="Ajouter une police" title="Ajouter une police" onClick={() => setShowAdd(true)}><ActionIcon name="add" /></button>
              <button className="table-refresh-button filter-refresh-button" type="button" aria-label="Actualiser" title="Actualiser" onClick={refreshPolicies}><ActionIcon name="refresh" /></button>
            </div>
          </div>
          <div className="equipment-table-wrap"><table className="equipment-table insurance-table"><thead><tr><th>N° de police</th><th>Assureur</th><th>Type</th><th>Éléments couverts</th><th>Période</th><th>Montant total</th><th>Statut</th><th aria-label="Actions" /></tr></thead><tbody>
            {loading ? <tr className="insurance-empty-row"><td colSpan={8} className="insurance-table-empty">Chargement des polices…</td></tr> : filteredPolicies.length === 0 ? <tr className="insurance-empty-row"><td colSpan={8} className="insurance-table-empty">Aucune police ne correspond à ces critères.</td></tr> : filteredPolicies.map((policy) => { const policyState = policyStatus(policy); return <tr className={selectedId === policy.id ? "selected" : ""} key={policy.id} onClick={() => setSelectedId(policy.id)}><td><strong>{policy.policy_number}</strong></td><td>{policy.source || "À compléter"}</td><td>{typeLabel(policy.insurance_type)}</td><td>{coveredLabel(policy)}</td><td><span>{formatDate(policy.starts_on)}</span><span>{formatDate(policy.ends_on)}</span></td><td><strong>{formatMoney(policy.total_amount)}</strong></td><td><em className={`insurance-status ${policyState}`}>{statusLabel(policyState)}</em></td><td><button type="button" aria-label={`Voir ${policy.policy_number}`}>•••</button></td></tr>; })}
          </tbody></table></div>
          {!loading && <nav className="pagination insurance-pagination"><span>{filteredPolicies.length} police{filteredPolicies.length !== 1 ? "s" : ""} affichée{filteredPolicies.length !== 1 ? "s" : "e"}</span><div><button type="button" disabled>Précédent</button><span>1</span><button type="button" disabled>Suivant</button></div></nav>}
    </section>
    {showFilters && <InsuranceFilterPanel status={status} onStatusChange={setStatus} onClose={() => setShowFilters(false)} onClear={() => setStatus("all")} />}
    {showAdd && <InsuranceAddPanel defaultType={activeType === "all" ? "trc_rc" : activeType} sites={sites} onClose={() => setShowAdd(false)} onSaved={(policy) => { setPolicies((current) => [policy, ...current]); setSelectedId(policy.id); setShowAdd(false); }} />}
    {editingPolicy && <InsuranceAddPanel policy={editingPolicy} defaultType={editingPolicy.insurance_type} sites={sites} onClose={() => setEditingPolicy(null)} onSaved={(policy) => { setPolicies((current) => current.map((item) => item.id === policy.id ? policy : item)); setSelectedId(policy.id); setEditingPolicy(null); }} />}
    {selected && <InsuranceDetailPanel policy={selected} onClose={() => setSelectedId(null)} onEdit={() => { setSelectedId(null); setEditingPolicy(selected); }} onDeleted={() => { setPolicies((current) => current.filter((item) => item.id !== selected.id)); setSelectedId(null); }} />}
  </main>;
}

function InsuranceAddPanel({ defaultType, policy, sites, onClose, onSaved }: { defaultType: Kind; policy?: Policy; sites: Array<{ id: number; name: string }>; onClose: () => void; onSaved: (policy: Policy) => void }) {
  const [type, setType] = useState<Kind>(policy?.insurance_type ?? defaultType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [amounts, setAmounts] = useState({ net: policy?.net_premium ?? "0", accessories: policy?.accessories_amount ?? "0", tax: policy?.tax_amount ?? "0" });
  const total = [amounts.net, amounts.accessories, amounts.tax].reduce((sum, value) => sum + (Number(value) || 0), 0);
  const setAmount = (field: "net" | "accessories" | "tax", value: string) => setAmounts((current) => ({ ...current, [field]: value.replace(/[^\d]/g, "") }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      const response = await apiRequest<{ data: Policy }>(policy ? `/api/v1/insurance-policies/${policy.id}` : "/api/v1/insurance-policies", {
        method: policy ? "PATCH" : "POST",
        body: JSON.stringify({
          insurance_type: type,
          policy_number: form.get("policy_number"), source: form.get("source") || null,
          starts_on: form.get("starts_on") || null, ends_on: form.get("ends_on") || null,
          insured_situation: form.get("insured_situation") || null,
          project_id: form.get("project_id") || null,
          net_premium: Number(amounts.net) || 0, accessories_amount: Number(amounts.accessories) || 0,
          tax_amount: Number(amounts.tax) || 0, notes: form.get("notes") || null,
        }),
      });
      if (documents.length > 0) {
        const upload = new FormData();
        documents.forEach((document) => upload.append("documents[]", document));
        const uploaded = await apiRequest<{ data: PolicyDocument[] }>(`/api/v1/insurance-policies/${response.data.id}/documents`, { method: "POST", body: upload });
        response.data.documents = uploaded.data;
      }
      onSaved(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer la police.");
    } finally { setSaving(false); }
  }

  return <div className="detail-backdrop" onMouseDown={onClose}>
    <aside className="detail-panel insurance-add-drawer" role="dialog" aria-modal="true" aria-label="Ajouter une police" onMouseDown={(event) => event.stopPropagation()}>
      <header className="detail-header insurance-add-header"><div><p className="section-label">Assurances</p><h2>{policy ? "Modifier la police" : "Ajouter une police"}</h2><p>Renseignez les informations principales de la couverture.</p></div><div><button className="save-button" type="submit" form="insurance-add-form" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button><button type="button" aria-label="Fermer" onClick={onClose}><ActionIcon name="close" /></button></div></header>
      <form id="insurance-add-form" className="insurance-add-form" onSubmit={save}>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <section><h3><ActionIcon name="identification" />Informations de la police</h3><div className="insurance-form-grid"><label>Type d’assurance<select value={type} onChange={(event) => setType(event.target.value as Kind)}>{types.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label>N° de police<input name="policy_number" required defaultValue={policy?.policy_number} /></label><label>Assureur<input name="source" defaultValue={policy?.source ?? ""} /></label><label>Site / projet<select name="project_id" defaultValue={policy?.project?.id ?? ""}><option value="">À compléter</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><label className="field-wide">Situation assurée<input name="insured_situation" defaultValue={policy?.insured_situation ?? ""} placeholder="Précisez l’élément couvert si nécessaire" /></label></div></section>
        <section><h3><ActionIcon name="history" />Période et couverture</h3><div className="insurance-form-grid"><label>Date de début<input type="date" name="starts_on" defaultValue={policy?.starts_on ?? ""} /></label><label>Date d’expiration<input type="date" name="ends_on" defaultValue={policy?.ends_on ?? ""} /></label></div></section>
        <section><h3><ActionIcon name="invoice" />Informations financières</h3><div className="insurance-form-grid insurance-financial-grid"><label>Prime nette (FCFA)<input inputMode="numeric" value={formatAmount(amounts.net)} onChange={(event) => setAmount("net", event.target.value)} /></label><label>ACC (FCFA)<input inputMode="numeric" value={formatAmount(amounts.accessories)} onChange={(event) => setAmount("accessories", event.target.value)} /></label><label>Taxe (FCFA)<input inputMode="numeric" value={formatAmount(amounts.tax)} onChange={(event) => setAmount("tax", event.target.value)} /></label><label>Prime TTC (FCFA)<input className="insurance-calculated-total" type="text" value={formatAmount(total)} readOnly aria-label="Prime TTC calculée automatiquement" /></label></div></section>
        <section><h3><ActionIcon name="note" />Observations</h3><label className="insurance-form-notes"><textarea name="notes" rows={2} defaultValue={policy?.notes ?? ""} /></label></section>
        <section><h3><ActionIcon name="invoice" />Documents</h3><DocumentUploadDropzone compact title={documents.length ? `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}` : "Ajouter des documents"} description="Contrats, attestations ou factures · PDF uniquement · 10 Mo maximum par fichier" onFiles={(files) => setDocuments((current) => [...current, ...files])} /></section>
      </form>
    </aside>
  </div>;
}

function InsuranceFilterPanel({ status, onStatusChange, onClose, onClear }: { status: "all" | "active" | "soon" | "expired"; onStatusChange: (value: "all" | "active" | "soon" | "expired") => void; onClose: () => void; onClear: () => void }) {
  return <div className="detail-backdrop" onMouseDown={onClose}>
    <aside className="detail-panel insurance-filter-drawer" role="dialog" aria-modal="true" aria-label="Filtres" onMouseDown={(event) => event.stopPropagation()}>
      <header className="detail-header"><div><p className="section-label">Assurances</p><h2>Filtres</h2><p>Affinez la liste des polices.</p></div><button type="button" aria-label="Fermer" onClick={onClose}><ActionIcon name="close" /></button></header>
      <div className="insurance-filter-content">
        <label>Assureur<select><option>Tous les assureurs</option></select></label>
        <label>Statut<select value={status} onChange={(event) => onStatusChange(event.target.value as typeof status)}><option value="all">Tous les statuts</option><option value="active">Active</option><option value="soon">Expire bientôt</option><option value="expired">Expirée</option></select></label>
        <label>Date d’expiration<select><option>Toutes les dates</option><option>Dans les 30 prochains jours</option><option>Ce mois-ci</option></select></label>
        <label>Site / projet<select><option>Tous les sites et projets</option></select></label>
      </div>
      <footer className="insurance-filter-actions"><button type="button" onClick={onClear}>Effacer les filtres</button><button className="save-button" type="button" onClick={onClose}>Afficher les résultats</button></footer>
    </aside>
  </div>;
}

function InsuranceDetailPanel({ policy, onClose, onEdit, onDeleted }: { policy: Policy; onClose: () => void; onEdit: () => void; onDeleted: () => void }) {
  const state = policyStatus(policy);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function remove() {
    if (!window.confirm(`Supprimer la police ${policy.policy_number} ?`)) return;
    setIsDeleting(true);
    try { await apiRequest(`/api/v1/insurance-policies/${policy.id}`, { method: "DELETE" }); onDeleted(); } finally { setIsDeleting(false); }
  }

  return <div className="detail-backdrop" onMouseDown={onClose}>
    <aside className="detail-panel insurance-side-panel" role="dialog" aria-modal="true" aria-label="Détail de la police" onMouseDown={(event) => event.stopPropagation()}>
      <header className="detail-header"><div><p className="section-label">{typeLabel(policy.insurance_type)}</p><h2>{policy.policy_number}</h2><p>{policy.source || "Assureur à compléter"}</p></div><button type="button" aria-label="Fermer" onClick={onClose}><ActionIcon name="close" /></button></header>
      <div className="detail-content insurance-side-content">
        <div className="detail-primary-actions insurance-detail-actions"><button className="detail-toolbar-button" type="button" onClick={onEdit}><ActionIcon name="edit" />Modifier</button><button className="detail-delete-button" type="button" disabled={isDeleting} onClick={() => void remove()}><ActionIcon name="delete" />{isDeleting ? "Suppression…" : "Supprimer"}</button><button className="detail-toolbar-button equipment-history-button" type="button" onClick={() => setShowHistory((value) => !value)}><ActionIcon name="history" />Voir l’historique</button></div>
        <section><h3><ActionIcon name="identification" />Informations de la police</h3><dl><div><dt>Assureur</dt><dd>{policy.source || "À compléter"}</dd></div><div><dt>Site / projet</dt><dd>{policy.project?.name || "À compléter"}</dd></div><div><dt>Éléments couverts</dt><dd>{coveredLabel(policy)}</dd></div></dl></section>
        <section><h3><ActionIcon name="history" />Période et statut</h3><dl><div><dt>Date de début</dt><dd>{formatDate(policy.starts_on)}</dd></div><div><dt>Date d’expiration</dt><dd>{formatDate(policy.ends_on)}</dd></div><div><dt>Statut</dt><dd><em className={`insurance-status ${state}`}>{statusLabel(state)}</em></dd></div></dl></section>
        <section><h3><ActionIcon name="specifications" />Couverture</h3><dl><div><dt>Situation assurée</dt><dd>{policy.insured_situation || "À compléter"}</dd></div></dl></section>
        <section><h3><ActionIcon name="invoice" />Informations financières</h3><dl><div><dt>Prime nette</dt><dd>{formatMoney(policy.net_premium)}</dd></div><div><dt>ACC</dt><dd>{formatMoney(policy.accessories_amount ?? "0")}</dd></div><div><dt>Taxe</dt><dd>{formatMoney(policy.tax_amount)}</dd></div><div><dt>Prime TTC</dt><dd>{formatMoney(policy.total_amount)}</dd></div></dl></section>
        <InsuranceDocuments policy={policy} />
        <section><h3><ActionIcon name="note" />Observations</h3><p className="observations">{policy.notes || "Aucune observation."}</p></section>
        {showHistory && <section className="insurance-history"><h3><ActionIcon name="history" />Historique</h3><p>{policy.created_at ? `Police enregistrée le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(policy.created_at))}.` : "Aucun historique disponible."}</p></section>}
      </div>
    </aside>
  </div>;
}

function InsuranceDocuments({ policy }: { policy: Policy }) {
  const [documents, setDocuments] = useState(policy.documents ?? []);
  const [uploading, setUploading] = useState(false);

  async function preview(document: PolicyDocument) {
    const url = await getAuthenticatedFileObjectUrl(`${document.url}?preview=1`);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function upload(event: FormEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;
    const form = new FormData(); files.forEach((file) => form.append("documents[]", file));
    setUploading(true);
    try {
      const response = await apiRequest<{ data: PolicyDocument[] }>(`/api/v1/insurance-policies/${policy.id}/documents`, { method: "POST", body: form });
      setDocuments((current) => [...current, ...response.data]);
    } finally { setUploading(false); event.currentTarget.value = ""; }
  }

  return <section className="insurance-documents-section"><h3><ActionIcon name="invoice" />Documents</h3>{documents.length ? <div className="invoice-list">{documents.map((document) => <article key={document.id}><button className="invoice-preview-button" type="button" onClick={() => void preview(document)}><span className="invoice-pdf-badge">PDF</span><span><strong>{document.original_name}</strong><small>{Math.max(1, Math.round(document.size_bytes / 1024))} Ko</small></span></button></article>)}</div> : <div className="detail-media-empty"><ActionIcon name="invoice" /><p>Aucun document ajouté.</p></div>}<label className="detail-upload-button insurance-document-upload"><ActionIcon name="add" /><span>{uploading ? "Ajout en cours…" : "Ajouter un document"}</span><input type="file" accept="application/pdf" multiple disabled={uploading} onChange={(event) => void upload(event)} /></label></section>;
}
