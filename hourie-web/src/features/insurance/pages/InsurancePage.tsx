import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, apiRequest, getAuthenticatedFileObjectUrl } from "../../../shared/api/http";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";

type Kind = "trc_rc" | "individual_accident" | "group_health" | "equipment";
type PolicyDocument = { id: number; original_name: string; mime_type: string; size_bytes: number; url: string };
type InsuranceEquipmentOption = { id: number; asset_code: string; name: string; category_name: string | null; chassis_number: string | null };
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
  const [equipmentOptions, setEquipmentOptions] = useState<InsuranceEquipmentOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: number; name: string; birth_date: string | null }>>([]);
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
    apiRequest<{ data: InsuranceEquipmentOption[] }>("/api/v1/insurance-equipment-options").then((value) => setEquipmentOptions(value.data)).catch(() => setEquipmentOptions([]));
    apiRequest<{ data: Array<{ id: number; name: string; birth_date: string | null }> }>("/api/v1/employees").then((value) => setEmployeeOptions(value.data)).catch(() => setEmployeeOptions([]));
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
          <div className="equipment-table-wrap"><table className="equipment-table insurance-table"><thead><tr><th>N° de police</th><th>Assureur</th><th>Type</th><th>Éléments couverts</th><th>Période</th><th>Montant total</th><th>Statut</th></tr></thead><tbody>
            {loading ? <tr className="insurance-empty-row"><td colSpan={7} className="insurance-table-empty"><LoadingSpinner label="Chargement des polices…" /></td></tr> : filteredPolicies.length === 0 ? <tr className="insurance-empty-row"><td colSpan={7} className="insurance-table-empty"><EmptyState title="Aucune police trouvée" description="Ajoutez une police ou modifiez votre recherche et vos filtres." /></td></tr> : filteredPolicies.map((policy) => { const policyState = policyStatus(policy); return <tr className={selectedId === policy.id ? "selected" : ""} key={policy.id} onClick={() => setSelectedId(policy.id)}><td><strong>{policy.policy_number}</strong></td><td>{policy.source || "À compléter"}</td><td>{typeLabel(policy.insurance_type)}</td><td>{coveredLabel(policy)}</td><td><span>{formatDate(policy.starts_on)}</span><span>{formatDate(policy.ends_on)}</span></td><td><strong>{formatMoney(policy.total_amount)}</strong></td><td><em className={`insurance-status ${policyState}`}>{statusLabel(policyState)}</em></td></tr>; })}
          </tbody></table></div>
          {!loading && <nav className="pagination insurance-pagination"><span>{filteredPolicies.length} police{filteredPolicies.length !== 1 ? "s" : ""} affichée{filteredPolicies.length !== 1 ? "s" : "e"}</span><div><button type="button" disabled>Précédent</button><span>1</span><button type="button" disabled>Suivant</button></div></nav>}
    </section>
    {showFilters && <InsuranceFilterPanel status={status} onStatusChange={setStatus} onClose={() => setShowFilters(false)} onClear={() => setStatus("all")} />}
    {showAdd && <InsuranceAddPanel defaultType={activeType === "all" ? "trc_rc" : activeType} sites={sites} equipmentOptions={equipmentOptions} employeeOptions={employeeOptions} onClose={() => setShowAdd(false)} onSaved={(policy) => { setPolicies((current) => [policy, ...current]); setSelectedId(policy.id); setShowAdd(false); }} />}
    {editingPolicy && <InsuranceAddPanel policy={editingPolicy} defaultType={editingPolicy.insurance_type} sites={sites} equipmentOptions={equipmentOptions} employeeOptions={employeeOptions} onClose={() => setEditingPolicy(null)} onSaved={(policy) => { setPolicies((current) => current.map((item) => item.id === policy.id ? policy : item)); setSelectedId(policy.id); setEditingPolicy(null); }} />}
    {selected && <InsuranceDetailPanel policy={selected} onClose={() => setSelectedId(null)} onEdit={() => { setSelectedId(null); setEditingPolicy(selected); }} onDocumentsChanged={(documents) => setPolicies((current) => current.map((item) => item.id === selected.id ? { ...item, documents } : item))} onDeleted={() => { setPolicies((current) => current.filter((item) => item.id !== selected.id)); setSelectedId(null); }} />}
  </main>;
}

function InsuranceAddPanel({ defaultType, policy, sites, equipmentOptions, employeeOptions, onClose, onSaved }: { defaultType: Kind; policy?: Policy; sites: Array<{ id: number; name: string }>; equipmentOptions: InsuranceEquipmentOption[]; employeeOptions: Array<{ id: number; name: string; birth_date: string | null }>; onClose: () => void; onSaved: (policy: Policy) => void }) {
  const [type, setType] = useState<Kind>(policy?.insurance_type ?? defaultType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [equipmentIds, setEquipmentIds] = useState<number[]>(policy?.equipment?.map((equipment) => equipment.id) ?? []);
  const [employeeIds, setEmployeeIds] = useState<number[]>(policy?.employees?.map((employee) => employee.id) ?? []);
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
          insured_situation: type === "equipment" || type === "group_health" ? null : form.get("insured_situation") || null,
          project_id: type === "trc_rc" ? form.get("project_id") || null : null,
          equipment_ids: type === "equipment" ? equipmentIds : undefined,
          employee_ids: type === "group_health" ? employeeIds : undefined,
          net_premium: Number(amounts.net) || 0, accessories_amount: Number(amounts.accessories) || 0,
          tax_amount: Number(amounts.tax) || 0, notes: form.get("notes") || null,
        }),
      });
      if (documents.length > 0) {
        const uploadedDocuments: PolicyDocument[] = [];
        for (const document of documents) {
          const upload = new FormData();
          upload.append("documents[]", document);
          const uploaded = await apiRequest<{ data: PolicyDocument[] }>(`/api/v1/insurance-policies/${response.data.id}/documents`, { method: "POST", body: upload });
          uploadedDocuments.push(...uploaded.data);
        }
        response.data.documents = [...(response.data.documents ?? []), ...uploadedDocuments];
      }
      await apiRequest<{ data: { sent: boolean } }>(`/api/v1/insurance-policies/${response.data.id}/send-expiry-reminder`, { method: "POST" });
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
        <section><h3><ActionIcon name="identification" />Informations de la police</h3><div className="insurance-form-grid"><label>Type d’assurance<SearchableSelect ariaLabel="Type d’assurance" value={type} onChange={(value) => setType(value as Kind)} placeholder="Sélectionner un type" includeEmpty={false} options={types.map((item) => ({ value: item.code, label: item.label }))} /></label><label>N° de police<input name="policy_number" required defaultValue={policy?.policy_number} /></label><label>Assureur<input name="source" defaultValue={policy?.source ?? ""} /></label>{type === "trc_rc" && <InsuranceProjectSelect sites={sites} initialValue={policy?.project?.id ? String(policy.project.id) : ""} />}{type !== "equipment" && type !== "group_health" && <label className="field-wide">Situation assurée<input name="insured_situation" defaultValue={policy?.insured_situation ?? ""} placeholder="Précisez l’élément couvert si nécessaire" /></label>}</div></section>
        <section><h3><ActionIcon name="history" />Période et couverture</h3><div className="insurance-form-grid"><label>Date de début<input type="date" name="starts_on" defaultValue={policy?.starts_on ?? ""} /></label><label>Date d’expiration<input type="date" name="ends_on" defaultValue={policy?.ends_on ?? ""} /></label></div></section>
        <section><h3><ActionIcon name="invoice" />Informations financières</h3><div className="insurance-form-grid insurance-financial-grid"><label>Prime nette (FCFA)<input inputMode="numeric" value={formatAmount(amounts.net)} onChange={(event) => setAmount("net", event.target.value)} /></label><label>ACC (FCFA)<input inputMode="numeric" value={formatAmount(amounts.accessories)} onChange={(event) => setAmount("accessories", event.target.value)} /></label><label>Taxe (FCFA)<input inputMode="numeric" value={formatAmount(amounts.tax)} onChange={(event) => setAmount("tax", event.target.value)} /></label><label>Prime TTC (FCFA)<input className="insurance-calculated-total" type="text" value={formatAmount(total)} readOnly aria-label="Prime TTC calculée automatiquement" /></label></div></section>
        {type === "equipment" && <EquipmentCoveragePicker options={equipmentOptions} selectedIds={equipmentIds} onChange={setEquipmentIds} />}
        {type === "group_health" && <EmployeeCoveragePicker options={employeeOptions} selectedIds={employeeIds} onChange={setEmployeeIds} />}
        <section><h3><ActionIcon name="note" />Observations</h3><label className="insurance-form-notes"><textarea name="notes" rows={2} defaultValue={policy?.notes ?? ""} /></label></section>
        <section><h3><ActionIcon name="invoice" />Documents</h3><DocumentUploadDropzone compact title={documents.length ? `${documents.length} document${documents.length > 1 ? "s" : ""} sélectionné${documents.length > 1 ? "s" : ""}` : "Ajouter des documents"} description="Contrats, attestations ou factures · PDF uniquement · 10 Mo maximum par fichier" onFiles={(files) => setDocuments((current) => [...current, ...files])} /></section>
      </form>
    </aside>
  </div>;
}

function InsuranceProjectSelect({ sites, initialValue }: { sites: Array<{ id: number; name: string }>; initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  return <label>Site / projet<SearchableSelect ariaLabel="Site ou projet" value={value} onChange={setValue} placeholder="À compléter" options={sites.map((site) => ({ value: String(site.id), label: site.name }))} /><input type="hidden" name="project_id" value={value} /></label>;
}

function EquipmentCoveragePicker({ options, selectedIds, onChange }: { options: InsuranceEquipmentOption[]; selectedIds: number[]; onChange: (ids: number[]) => void }) {
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const selected = options.filter((option) => selectedIds.includes(option.id));
  const available = options.filter((option) => !selectedIds.includes(option.id));
  const pageCount = Math.max(1, Math.ceil(selected.length / pageSize));
  const visibleSelected = selected.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);
  const add = (id: number) => { onChange([...selectedIds, id]); setPage(Math.floor(selected.length / pageSize)); };
  const remove = (id: number) => onChange(selectedIds.filter((selectedId) => selectedId !== id));

  return <section className="insurance-covered-equipment"><h3><ActionIcon name="specifications" />Équipements couverts</h3><p>Sélectionnez uniquement les véhicules, camions et engins dont le numéro de châssis est renseigné.</p><label>Ajouter un équipement<SearchableSelect ariaLabel="Ajouter un équipement couvert" value="" onChange={(value) => { if (value) add(Number(value)); }} placeholder={options.length ? "Sélectionner un équipement" : "Aucun châssis renseigné"} options={available.map((option) => ({ value: String(option.id), label: equipmentOptionLabel(option) }))} disabled={available.length === 0} /></label>{selected.length > 0 ? <><div className="insurance-covered-equipment-count">{selected.length} équipement{selected.length > 1 ? "s" : ""} sélectionné{selected.length > 1 ? "s" : ""}</div><ul>{visibleSelected.map((option) => <li key={option.id}><span><strong>{option.name}</strong><small>{option.category_name ?? "Actif"} · {option.asset_code} · Châssis {option.chassis_number}</small></span><button className="insurance-covered-remove" type="button" aria-label={`Retirer ${option.name}`} title="Retirer" onClick={() => remove(option.id)}>×</button></li>)}</ul>{pageCount > 1 && <nav className="insurance-covered-equipment-pagination" aria-label="Équipements sélectionnés"><button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Précédent</button><span>{page + 1} / {pageCount}</span><button type="button" disabled={page === pageCount - 1} onClick={() => setPage((current) => current + 1)}>Suivant</button></nav>}</> : <EmptyState compact icon="specifications" title="Aucun équipement sélectionné" description="Choisissez les actifs couverts à l’aide du champ ci-dessus." />}</section>;
}

function EmployeeCoveragePicker({ options, selectedIds, onChange }: { options: Array<{ id: number; name: string; birth_date: string | null }>; selectedIds: number[]; onChange: (ids: number[]) => void }) {
  const [page, setPage] = useState(0);
  const pageSize = 3;
  const selected = options.filter((option) => selectedIds.includes(option.id));
  const available = options.filter((option) => !selectedIds.includes(option.id));
  const pageCount = Math.max(1, Math.ceil(selected.length / pageSize));
  const visibleSelected = selected.slice(page * pageSize, (page + 1) * pageSize);
  useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);

  return <section className="insurance-covered-equipment"><h3><ActionIcon name="identification" />Personnes couvertes</h3><p>Sélectionnez les employés inclus dans cette assurance santé groupe.</p><label>Ajouter une personne<SearchableSelect ariaLabel="Ajouter une personne couverte" value="" onChange={(value) => { if (value) { onChange([...selectedIds, Number(value)]); setPage(Math.floor(selected.length / pageSize)); } }} placeholder="Sélectionner une personne" options={available.map((employee) => ({ value: String(employee.id), label: employeeLabel(employee) }))} disabled={available.length === 0} /></label>{selected.length > 0 ? <><div className="insurance-covered-equipment-count">{selected.length} personne{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}</div><ul>{visibleSelected.map((employee) => <li key={employee.id}><span><strong>{employee.name}</strong><small>Date de naissance : {employee.birth_date ? formatDate(employee.birth_date) : "à renseigner"}</small></span><button className="insurance-covered-remove" type="button" aria-label={`Retirer ${employee.name}`} title="Retirer" onClick={() => onChange(selectedIds.filter((id) => id !== employee.id))}>×</button></li>)}</ul>{pageCount > 1 && <nav className="insurance-covered-equipment-pagination" aria-label="Personnes sélectionnées"><button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Précédent</button><span>{page + 1} / {pageCount}</span><button type="button" disabled={page === pageCount - 1} onClick={() => setPage((current) => current + 1)}>Suivant</button></nav>}</> : <EmptyState compact icon="people" title="Aucune personne sélectionnée" description="Choisissez les employés couverts à l’aide du champ ci-dessus." />}</section>;
}

function employeeLabel(employee: { name: string; birth_date: string | null }) {
  return `${employee.name} — ${employee.birth_date ? formatDate(employee.birth_date) : "Date de naissance à renseigner"}`;
}

function equipmentOptionLabel(option: InsuranceEquipmentOption) {
  return `${option.name} — Châssis ${option.chassis_number || "à renseigner"}`;
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

function InsuranceDetailPanel({ policy, onClose, onEdit, onDocumentsChanged, onDeleted }: { policy: Policy; onClose: () => void; onEdit: () => void; onDocumentsChanged: (documents: PolicyDocument[]) => void; onDeleted: () => void }) {
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
        <div className="detail-primary-actions"><button className="equipment-edit-button detail-toolbar-button" type="button" onClick={onEdit}><ActionIcon name="edit" />Modifier</button><button className="danger-button detail-delete-button" type="button" disabled={isDeleting} onClick={() => void remove()} aria-label={isDeleting ? "Suppression en cours" : "Supprimer"}><ActionIcon name="delete" /></button><button className="equipment-history-button detail-toolbar-button" type="button" onClick={() => setShowHistory((value) => !value)}><ActionIcon name="history" />Voir l’historique</button></div>
        <section><h3><ActionIcon name="identification" />Informations de la police</h3><dl><div><dt>Assureur</dt><dd>{policy.source || "À compléter"}</dd></div>{policy.insurance_type === "trc_rc" && <div><dt>Site / projet</dt><dd>{policy.project?.name || "À compléter"}</dd></div>}<div><dt>Éléments couverts</dt><dd>{coveredLabel(policy)}</dd></div></dl></section>
        <section><h3><ActionIcon name="history" />Période et statut</h3><dl><div><dt>Date de début</dt><dd>{formatDate(policy.starts_on)}</dd></div><div><dt>Date d’expiration</dt><dd>{formatDate(policy.ends_on)}</dd></div><div><dt>Statut</dt><dd><em className={`insurance-status ${state}`}>{statusLabel(state)}</em></dd></div></dl></section>
        <section><h3><ActionIcon name="specifications" />Couverture</h3><dl><div><dt>Situation assurée</dt><dd>{policy.insured_situation || "À compléter"}</dd></div></dl></section>
        <section><h3><ActionIcon name="invoice" />Informations financières</h3><dl><div><dt>Prime nette</dt><dd>{formatMoney(policy.net_premium)}</dd></div><div><dt>ACC</dt><dd>{formatMoney(policy.accessories_amount ?? "0")}</dd></div><div><dt>Taxe</dt><dd>{formatMoney(policy.tax_amount)}</dd></div><div><dt>Prime TTC</dt><dd>{formatMoney(policy.total_amount)}</dd></div></dl></section>
        <InsuranceDocuments policy={policy} onChanged={onDocumentsChanged} />
        <section><h3><ActionIcon name="note" />Observations</h3><p className="observations">{policy.notes || "Aucune observation."}</p></section>
        {showHistory && <section className="insurance-history"><h3><ActionIcon name="history" />Historique</h3>{policy.created_at ? <p>{`Police enregistrée le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(policy.created_at))}.`}</p> : <EmptyState compact icon="history" title="Aucun historique disponible" />}</section>}
      </div>
    </aside>
  </div>;
}

function InsuranceDocuments({ policy, onChanged }: { policy: Policy; onChanged: (documents: PolicyDocument[]) => void }) {
  const documents = policy.documents ?? [];
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function preview(document: PolicyDocument) {
    const url = await getAuthenticatedFileObjectUrl(`${document.url}?preview=1`);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function upload(event: FormEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;
    const input = event.currentTarget;
    setError(null);
    setUploading(true);
    try {
      let updatedDocuments = documents;
      // Upload separately so a large selection is not rejected by the server's total request-size limit.
      for (const [index, file] of files.entries()) {
        setUploadProgress({ current: index + 1, total: files.length });
        const form = new FormData();
        form.append("documents[]", file);
        const response = await apiRequest<{ data: PolicyDocument[] }>(`/api/v1/insurance-policies/${policy.id}/documents`, { method: "POST", body: form });
        updatedDocuments = [...updatedDocuments, ...response.data];
        onChanged(updatedDocuments);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors)[0]?.[0] ?? caught.message : "Impossible d’ajouter les documents.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      input.value = "";
    }
  }

  async function remove(document: PolicyDocument) {
    if (!window.confirm(`Supprimer le document « ${document.original_name} » ?`)) return;
    setError(null);
    setDeletingId(document.id);
    try {
      await apiRequest(`/api/v1/insurance-policies/${policy.id}/documents/${document.id}`, { method: "DELETE" });
      onChanged(documents.filter((item) => item.id !== document.id));
    } catch {
      setError("Impossible de supprimer ce document.");
    } finally {
      setDeletingId(null);
    }
  }

  const uploadLabel = uploadProgress ? `Ajout ${uploadProgress.current}/${uploadProgress.total}…` : "Ajouter des documents";

  return <section className="insurance-documents-section"><h3><ActionIcon name="invoice" />Documents</h3>{error && <div className="form-alert" role="alert">{error}</div>}{documents.length ? <div className="invoice-list">{documents.map((document) => <article key={document.id}><button className="invoice-preview-button" type="button" onClick={() => void preview(document)}><span className="invoice-pdf-badge">PDF</span><span><strong>{document.original_name}</strong><small>{Math.max(1, Math.round(document.size_bytes / 1024))} Ko</small></span></button><button className="invoice-delete-button" type="button" disabled={deletingId === document.id} onClick={() => void remove(document)} aria-label={`Supprimer ${document.original_name}`}>{deletingId === document.id ? <LoadingSpinner compact label="Suppression" /> : <ActionIcon name="delete" />}</button></article>)}</div> : <EmptyState compact icon="invoice" title="Aucun document ajouté" description="Les contrats et attestations associés apparaîtront ici." />}<label className="detail-upload-button insurance-document-upload"><ActionIcon name="add" /><span>{uploading ? uploadLabel : "Ajouter des documents"}</span><input type="file" accept="application/pdf,.pdf" multiple disabled={uploading} onChange={(event) => void upload(event)} /></label></section>;
}
