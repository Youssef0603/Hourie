import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import hourieLogo from "../../../assets/documents/logo-hourie-document.svg";
import hourieStamp from "../../../assets/documents/hourie-stamp-transparent.png";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import { deletePurchaseOrder, getPurchaseOrders, savePurchaseOrder } from "../api";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderPayload } from "../types";
import "./purchase-orders-page.css";

type EditableItem = PurchaseOrderItem & { key: string };
type EditableOrder = Omit<PurchaseOrderPayload, "items"> & { items: EditableItem[] };

const emptyItem = (): EditableItem => ({
  key: crypto.randomUUID(),
  budget_code: "",
  description: "",
  quantity: "1",
  unit_price: "0",
});

function newOrder(preparedBy: string): EditableOrder {
  return {
    supplier_name: "",
    supplier_phone: "",
    supplier_fax: "",
    ordered_on: new Date().toISOString().slice(0, 10),
    follow_up_agent: "",
    contact_name: "",
    project_name: "",
    reason: "",
    prepared_by: preparedBy,
    ordered_by: "",
    approved_by: "",
    vat_rate: "0",
    currency: "XOF",
    notes: "",
    items: [emptyItem()],
  };
}

function editableOrder(order: PurchaseOrder): EditableOrder {
  return {
    supplier_name: order.supplier_name,
    supplier_phone: order.supplier_phone ?? "",
    supplier_fax: order.supplier_fax ?? "",
    ordered_on: order.ordered_on,
    follow_up_agent: order.follow_up_agent ?? "",
    contact_name: order.contact_name ?? "",
    project_name: order.project_name ?? "",
    reason: order.reason ?? "",
    prepared_by: order.prepared_by ?? "",
    ordered_by: order.ordered_by ?? "",
    approved_by: order.approved_by ?? "",
    vat_rate: order.vat_rate,
    currency: order.currency,
    notes: order.notes ?? "",
    items: order.items.map((item) => ({ ...item, key: crypto.randomUUID() })),
  };
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | string, currency = "XOF") {
  const amount = Number(value);
  const hasDecimals = Math.abs(amount - Math.trunc(amount)) > Number.EPSILON;

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: hasDecimals ? 2 : currency === "XOF" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function printPurchaseOrder(order: PurchaseOrder) {
  const previousTitle = document.title;
  const supplier = order.supplier_name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  document.title = `Bon_de_commande_${order.number}${supplier ? `_${supplier}` : ""}`;
  window.print();
  document.title = previousTitle;
}

function PurchaseOrderSheet({ order }: { order: PurchaseOrder }) {
  const blankRows = Array.from({ length: Math.max(0, 20 - order.items.length) });

  return (
    <article className="purchase-order-sheet">
      <header className="po-document-header">
        <img className="po-document-logo" src={hourieLogo} alt="A.R. Hourie Entreprises" />
        <h2>BON DE COMMANDE</h2>
        <strong>N° {order.number}</strong>
      </header>
      <section className="po-document-parties">
        <div><p><b>A :</b><span>{order.supplier_name}</span></p><p><b>Tél. :</b><span>{order.supplier_phone || ""}</span></p><p><b>Fax :</b><span>{order.supplier_fax || ""}</span></p></div>
        <div><p><b>Date :</b><span>{dateLabel(order.ordered_on)}</span></p><p><b>Agent de suivi :</b><span>{order.follow_up_agent || ""}</span></p><p><b>Contact :</b><span>{order.contact_name || ""}</span></p></div>
      </section>
      <table className="po-document-table">
        <thead><tr><th>Art.<br />N°</th><th>Code Bud.</th><th>Référence et Description</th><th>Qté</th><th>Prix Unit.</th><th>Total</th></tr></thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.id ?? index}><td>{index + 1}</td><td>{item.budget_code || ""}</td><td>{item.description}</td><td>{Number(item.quantity)}</td><td>{money(item.unit_price, order.currency)}</td><td>{money(item.total ?? 0, order.currency)}</td></tr>
          ))}
          {blankRows.map((_, index) => <tr className="po-blank-row" key={`blank-${index}`}><td>{order.items.length + index + 1}</td><td /><td /><td /><td /><td /></tr>)}
        </tbody>
        <tfoot>
          <tr><td colSpan={4} /><th>Total HT</th><td>{money(order.subtotal, order.currency)}</td></tr>
          <tr><td colSpan={4} /><th>TVA ({Number(order.vat_rate)} %)</th><td>{money(order.vat_amount, order.currency)}</td></tr>
          <tr><td colSpan={4} /><th>Total TTC</th><td>{money(order.total, order.currency)}</td></tr>
        </tfoot>
      </table>
      <section className="po-signatures">
        <p><b>Préparé par :</b> <span>{order.prepared_by || ""}</span></p>
        <p><b>Commandé par :</b> <span>{order.ordered_by || ""}</span></p>
        <p><b>Validé par :</b> <span>{order.approved_by || ""}</span></p>
        <img className="po-company-stamp" src={hourieStamp} alt="Cachet A.R. Hourie Entreprises" />
      </section>
      <section className="po-document-footer"><p><b>MOTIF :</b><span>{order.reason || ""}</span></p><p><b>PROJET :</b><span>{order.project_name || ""}</span></p>{order.notes && <p><b>NOTES :</b><span>{order.notes}</span></p>}</section>
    </article>
  );
}

export function PurchaseOrdersPage({ defaultPreparedBy, canManage, projects = [] }: { defaultPreparedBy: string; canManage: boolean; projects?: Array<{ id: number; name: string }> }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditableOrder | null>(null);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [preview, setPreview] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<"purchase-order" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPurchaseOrders(search);
      setOrders(response.data);
    } catch {
      setError("Impossible de charger les bons de commande.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (activeTemplate !== "purchase-order") return;
    const timer = window.setTimeout(() => void refresh(), 200);
    return () => window.clearTimeout(timer);
  }, [activeTemplate, refresh]);

  const totals = useMemo(() => {
    const subtotal = editor?.items.reduce((sum, item) => sum + numeric(item.quantity) * numeric(item.unit_price), 0) ?? 0;
    const vat = subtotal * numeric(editor?.vat_rate ?? "0") / 100;
    return { subtotal, vat, total: subtotal + vat };
  }, [editor]);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setEditingId(undefined);
  }, []);

  function updateField<K extends keyof EditableOrder>(field: K, value: EditableOrder[K]) {
    setEditor((current) => current ? { ...current, [field]: value } : current);
  }

  function updateItem(key: string, field: keyof PurchaseOrderItem, value: string) {
    setEditor((current) => current ? {
      ...current,
      items: current.items.map((item) => item.key === key ? { ...item, [field]: value } : item),
    } : current);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError(null);
    const payload: PurchaseOrderPayload = {
      ...editor,
      items: editor.items.map(({ budget_code, description, quantity, unit_price }) => ({ budget_code, description, quantity, unit_price })),
    };
    try {
      const response = await savePurchaseOrder(payload, editingId);
      setEditor(null);
      setEditingId(undefined);
      setPreview(response.data);
      await refresh();
    } catch {
      setError("Vérifiez les informations du bon de commande puis réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(order: PurchaseOrder) {
    if (!window.confirm(`Supprimer le bon de commande N° ${order.number} ?`)) return;
    await deletePurchaseOrder(order.id);
    if (preview?.id === order.id) setPreview(null);
    await refresh();
  }

  return (
    <main className="equipment-page purchase-orders-page">
      {!activeTemplate && <section className="page-heading po-page-heading"><div><p className="section-label">Documents</p><h1>Créateur de documents</h1><p>Créez, modifiez et exportez les bons de commande A.B. Hourie.</p></div></section>}

      {error && <div className="form-alert" role="alert">{error}</div>}

      {!activeTemplate && (
        <section className="document-template-section">
          <h2>Modèles</h2>
          <div className="document-template-grid">
          <button className="document-template-card" type="button" onClick={() => setActiveTemplate("purchase-order")}>
            <span className="document-template-icon"><NavigationDocumentIcon /></span>
            <span><strong>Bon de commande</strong><small>Commandes fournisseurs</small></span>
          </button>
          </div>
        </section>
      )}

      {activeTemplate === "purchase-order" && <>
        <nav className="breadcrumbs" aria-label="Fil d’Ariane">
          <button type="button" onClick={() => setActiveTemplate(null)}>Documents</button>
          <span aria-hidden="true">/</span>
          <strong aria-current="page">Bons de commande</strong>
        </nav>
        <section className="page-heading po-workspace-heading">
          <div>
            <h1>Bons de commande</h1>
            <p>Consultez et gérez tous les bons de commande.</p>
          </div>
          {canManage && <button className="table-refresh-button table-add-button" type="button" aria-label="Créer un bon de commande" title="Créer un bon de commande" onClick={() => { setEditingId(undefined); setEditor(newOrder(defaultPreparedBy)); }}><ActionIcon name="add" /></button>}
        </section>

        <section className="inventory-panel po-history"><div className="filter-bar"><div className="search-field"><label htmlFor="po-search">Documents enregistrés</label><input id="po-search" type="search" placeholder="Numéro, fournisseur ou projet" value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="table-refresh-button" type="button" onClick={() => void refresh()}><ActionIcon name="refresh" /> Actualiser</button></div>{loading ? <div className="table-state"><LoadingSpinner label="Chargement des bons de commande…" /></div> : orders.length === 0 ? <EmptyState title="Aucun bon de commande" description="Créez le premier bon de commande avec le bouton +." /> : <div className="equipment-table-wrap"><table className="equipment-table"><thead><tr><th>N°</th><th>Date</th><th>Fournisseur</th><th>Projet</th><th>Total TTC</th><th>Modifié</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.number}</strong></td><td>{dateLabel(order.ordered_on)}</td><td>{order.supplier_name}</td><td>{order.project_name || "—"}</td><td>{money(order.total, order.currency)}</td><td>{dateLabel(order.updated_at.slice(0, 10))}</td><td className="po-actions-cell"><details className="po-row-menu"><summary aria-label={`Actions du bon ${order.number}`}><span aria-hidden="true">•••</span></summary><div className="po-row-menu-popover"><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setPreview(order); }}>Aperçu</button>{canManage && <><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setEditingId(order.id); setEditor(editableOrder(order)); }}>Modifier</button><button className="danger-text" type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); void remove(order); }}>Supprimer</button></>}</div></details></td></tr>)}</tbody></table></div>}</section>
      </>}

      {editor && (
        <EquipmentCreationPanel
          eyebrow="Bon de commande"
          title={editingId ? "Modifier le document" : "Nouveau document"}
          action={<button className="primary-button" type="submit" form="purchase-order-form" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>}
          onClose={closeEditor}
        >
        <form id="purchase-order-form" className="generator-create-form asset-form purchase-order-editor" onSubmit={submit}>
          <div className="asset-form-layout">
            <InventoryFormSection title="Informations" icon="identification">
              <div className="maintenance-form-grid asset-form-grid-2">
                <label><span>Fournisseur *</span><input required value={editor.supplier_name} onChange={(event) => updateField("supplier_name", event.target.value)} /></label>
                <label><span>Date *</span><input required type="date" value={editor.ordered_on} onChange={(event) => updateField("ordered_on", event.target.value)} /></label>
                <label><span>Téléphone</span><input value={editor.supplier_phone ?? ""} onChange={(event) => updateField("supplier_phone", event.target.value)} /></label>
                <label><span>Fax</span><input value={editor.supplier_fax ?? ""} onChange={(event) => updateField("supplier_fax", event.target.value)} /></label>
                <label><span>Agent de suivi</span><input value={editor.follow_up_agent ?? ""} onChange={(event) => updateField("follow_up_agent", event.target.value)} /></label>
                <label><span>Contact</span><input value={editor.contact_name ?? ""} onChange={(event) => updateField("contact_name", event.target.value)} /></label>
                <label><span>Projet</span><SearchableSelect ariaLabel="Projet" value={editor.project_name ?? ""} onChange={(value) => updateField("project_name", value)} placeholder="Sélectionner un projet" options={[...(editor.project_name && !projects.some((project) => project.name === editor.project_name) ? [{ value: editor.project_name, label: editor.project_name }] : []), ...projects.map((project) => ({ value: project.name, label: project.name }))]} /></label>
                <label><span>Motif</span><input value={editor.reason ?? ""} onChange={(event) => updateField("reason", event.target.value)} /></label>
              </div>
            </InventoryFormSection>
            <InventoryFormSection title="Articles" icon="invoice">
              <div className="po-lines-section">
                <div className="po-lines-heading"><span>Articles commandés</span><button type="button" className="maintenance-add" onClick={() => updateField("items", [...editor.items, emptyItem()])}><ActionIcon name="add" /> Ajouter une ligne</button></div>
                <div className="po-lines-table-wrap"><table className="po-lines-table"><thead><tr><th>N°</th><th>Code budget</th><th>Description *</th><th>Quantité *</th><th>Prix unitaire *</th><th>Total</th><th /></tr></thead><tbody>{editor.items.map((item, index) => <tr key={item.key}><td>{index + 1}</td><td><input aria-label={`Code budget ligne ${index + 1}`} value={item.budget_code ?? ""} onChange={(event) => updateItem(item.key, "budget_code", event.target.value)} /></td><td><input aria-label="Description *" required value={item.description} onChange={(event) => updateItem(item.key, "description", event.target.value)} /></td><td><input aria-label="Quantité *" required min="0.001" step="0.001" type="number" value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", event.target.value)} /></td><td><input aria-label="Prix unitaire *" required min="0" step="0.01" type="number" value={item.unit_price} onChange={(event) => updateItem(item.key, "unit_price", event.target.value)} /></td><td>{money(numeric(item.quantity) * numeric(item.unit_price), editor.currency)}</td><td><button aria-label={`Supprimer la ligne ${index + 1}`} type="button" className="po-remove-line" disabled={editor.items.length === 1} onClick={() => updateField("items", editor.items.filter((candidate) => candidate.key !== item.key))}><ActionIcon name="delete" /></button></td></tr>)}</tbody></table></div>
              </div>
            </InventoryFormSection>
            <InventoryFormSection title="Validation et totaux" icon="specifications">
              <div className="po-editor-bottom">
                <div className="maintenance-form-grid asset-form-grid-2"><label><span>Préparé par</span><input value={editor.prepared_by ?? ""} onChange={(event) => updateField("prepared_by", event.target.value)} /></label><label><span>Commandé par</span><input value={editor.ordered_by ?? ""} onChange={(event) => updateField("ordered_by", event.target.value)} /></label><label><span>Validé par</span><input value={editor.approved_by ?? ""} onChange={(event) => updateField("approved_by", event.target.value)} /></label><label><span>TVA (%)</span><input min="0" max="100" step="0.01" type="number" value={editor.vat_rate} onChange={(event) => updateField("vat_rate", event.target.value)} /></label></div>
                <dl className="po-live-totals"><div><dt>Total HT</dt><dd>{money(totals.subtotal, editor.currency)}</dd></div><div><dt>TVA</dt><dd>{money(totals.vat, editor.currency)}</dd></div><div><dt>Total TTC</dt><dd>{money(totals.total, editor.currency)}</dd></div></dl>
              </div>
            </InventoryFormSection>
          </div>
        </form>
        </EquipmentCreationPanel>
      )}

      {preview && <div className="po-preview-backdrop" onMouseDown={() => setPreview(null)}><section className="po-preview-panel" role="dialog" aria-modal="true" aria-label={`Bon de commande ${preview.number}`} onMouseDown={(event) => event.stopPropagation()}><header><div><strong>Aperçu du bon N° {preview.number}</strong><small>Utilisez « Exporter en PDF », puis choisissez « Enregistrer au format PDF ».</small></div><div>{canManage && <button className="secondary-button" type="button" onClick={() => { setEditingId(preview.id); setEditor(editableOrder(preview)); setPreview(null); }}><ActionIcon name="edit" /> Modifier</button>}<button className="primary-button" type="button" onClick={() => printPurchaseOrder(preview)}><ActionIcon name="download" /> Exporter en PDF</button><button className="po-preview-close" type="button" aria-label="Fermer l’aperçu" title="Fermer" onClick={() => setPreview(null)}><ActionIcon name="close" /></button></div></header><div className="po-sheet-stage"><PurchaseOrderSheet order={preview} /></div></section></div>}
    </main>
  );
}

function NavigationDocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5Z" /><path d="M15 3v5h4M8 12h8M8 16h5" /></svg>;
}
