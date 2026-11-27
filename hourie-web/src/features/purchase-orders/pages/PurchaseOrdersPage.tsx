import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { openDocument } from "../../../shared/documents";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import { SupplierInvoices } from "../components/SupplierInvoices";
import { Pagination } from "../../../shared/components/Pagination";
import { SearchField } from "../../../shared/components/SearchField";
import { ToolbarIconButton } from "../../../shared/components/ToolbarButtons";
import { clickableRow } from "../../../shared/clickableRow";
import { formatDate, formatFileSize } from "../../../shared/format";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { PaginatedDocumentList } from "../../../shared/components/PaginatedDocumentList";
import { SearchableSelect } from "../../../shared/components/SearchableSelect";
import { DocumentUploadDropzone } from "../../../shared/components/DocumentUploadDropzone";
import { usePaginatedList } from "../../../shared/usePaginatedList";
import { InventoryFormSection } from "../../equipment/components/AssetForm";
import { EquipmentCreationPanel } from "../../equipment/components/EquipmentCreationPanel";
import { deletePurchaseOrder, deletePurchaseOrderDeliveryNote, downloadPurchaseOrderPdf, getPurchaseOrders, getSiteMaterials, savePurchaseOrder, uploadPurchaseOrderDeliveryNotes, type SiteMaterial } from "../api";
import type { PurchaseOrder, PurchaseOrderDeliveryNote, PurchaseOrderItem, PurchaseOrderPayload } from "../types";
import { fr } from "../../../i18n/fr";
import { localized, operationPhrase } from "../../../i18n/operations";
import "./purchase-orders-page.css";

type EditableItem = PurchaseOrderItem & { key: string };
type EditableOrder = Omit<PurchaseOrderPayload, "items"> & { items: EditableItem[] };

const emptyItem = (): EditableItem => ({
  key: crypto.randomUUID(),
  budget_code: "",
  subcontract_item_material_id: null,
  unit: "",
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
    project_id: null,
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
    project_id: order.project_id,
    reason: order.reason ?? "",
    prepared_by: order.prepared_by ?? "",
    ordered_by: order.ordered_by ?? "",
    approved_by: order.approved_by ?? "",
    vat_rate: order.vat_rate,
    currency: order.currency,
    notes: order.notes ?? "",
    items: order.items.map((item) => ({
      ...item,
      quantity: Number.isFinite(Number(item.quantity)) ? String(Math.trunc(Number(item.quantity))) : item.quantity,
      key: crypto.randomUUID(),
    })),
  };
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integerInput(value: string) {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : "";
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
  return formatDate(value, { style: "medium" });
}


export function PurchaseOrdersPage({ defaultPreparedBy, canManage, projects = [], linkSubcontractMaterials = true }: {
  defaultPreparedBy: string;
  canManage: boolean;
  projects?: Array<{ id: number; name: string; code: string | null }>;
  /** False when the subcontracts module is off: lines take a free budget code only. */
  linkSubcontractMaterials?: boolean;
}) {
  const [search, setSearch] = useState("");
  const loadOrders = useCallback((page: number) => getPurchaseOrders(search, page), [search]);
  const [error, setError] = useState<string | null>(null);
  const { items: orders, setItems: setOrders, meta: pagination, setPage, loading, error: listError, reload: refresh } = usePaginatedList<PurchaseOrder>(
    loadOrders,
    operationPhrase("Impossible de charger les bons de commande."),
  );
  const [editor, setEditor] = useState<EditableOrder | null>(null);
  const [siteMaterials, setSiteMaterials] = useState<SiteMaterial[]>([]);
  const editorProjectId = editor?.project_id ?? null;

  useEffect(() => {
    if (!editorProjectId || !linkSubcontractMaterials) return;
    let active = true;
    getSiteMaterials(editorProjectId)
      .then((materials) => { if (active) setSiteMaterials(materials); })
      .catch(() => { if (active) setSiteMaterials([]); });
    return () => { active = false; };
  }, [editorProjectId, linkSubcontractMaterials]);

  const materialsForEditor = editorProjectId && linkSubcontractMaterials ? siteMaterials : [];
  const [editingId, setEditingId] = useState<number | undefined>();
  const [deliveryNoteFiles, setDeliveryNoteFiles] = useState<File[]>([]);
  const [editorDeliveryNotes, setEditorDeliveryNotes] = useState<PurchaseOrderDeliveryNote[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [preview, setPreview] = useState<PurchaseOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const subtotal = editor?.items.reduce((sum, item) => sum + numeric(item.quantity) * numeric(item.unit_price), 0) ?? 0;
    const vat = subtotal * numeric(editor?.vat_rate ?? "0") / 100;
    return { subtotal, vat, total: subtotal + vat };
  }, [editor]);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setEditingId(undefined);
    setDeliveryNoteFiles([]);
    setEditorDeliveryNotes([]);
  }, []);

  function createOrder() {
    setEditingId(undefined);
    setEditor(newOrder(defaultPreparedBy));
    setDeliveryNoteFiles([]);
    setEditorDeliveryNotes([]);
  }

  function editOrder(order: PurchaseOrder) {
    setEditingId(order.id);
    setEditor(editableOrder(order));
    setDeliveryNoteFiles([]);
    setEditorDeliveryNotes(order.delivery_notes);
  }

  function updateField<K extends keyof EditableOrder>(field: K, value: EditableOrder[K]) {
    setEditor((current) => current ? { ...current, [field]: value } : current);
  }

  /** Links an order line to the work material it buys; its budget code follows the work item. */
  function linkMaterial(key: string, materialId: number | null) {
    const material = materialsForEditor.find((candidate) => candidate.id === materialId);
    setEditor((current) => current ? {
      ...current,
      items: current.items.map((item) => item.key === key
        ? { ...item, subcontract_item_material_id: material?.id ?? null, budget_code: material?.item_code ?? "", unit: material?.unit ?? item.unit ?? "" }
        : item),
    } : current);
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
      items: editor.items.map(({ budget_code, subcontract_item_material_id, description, quantity, unit, unit_price }) => ({ budget_code, subcontract_item_material_id, description, quantity, unit, unit_price })),
    };
    try {
      const response = await savePurchaseOrder(payload, editingId);
      let savedOrder = response.data;
      if (deliveryNoteFiles.length > 0) {
        try {
          const uploaded = await uploadPurchaseOrderDeliveryNotes(savedOrder.id, deliveryNoteFiles);
          savedOrder = { ...savedOrder, delivery_notes: [...savedOrder.delivery_notes, ...uploaded] };
        } catch {
          setEditingId(savedOrder.id);
          setEditorDeliveryNotes(savedOrder.delivery_notes);
          setError(operationPhrase("Le bon de commande est enregistré, mais le bon de livraison n’a pas pu être ajouté. Réessayez l’envoi du document."));
          await refresh();
          return;
        }
      }
      setEditor(null);
      setEditingId(undefined);
      setDeliveryNoteFiles([]);
      setEditorDeliveryNotes([]);
      setSelectedOrder(savedOrder);
      await refresh();
    } catch {
      setError(operationPhrase("Vérifiez les informations du bon de commande puis réessayez."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(order: PurchaseOrder) {
    if (!window.confirm(localized(`Supprimer le bon de commande N° ${order.number} ?`, `هل تريد حذف أمر الشراء رقم ${order.number}؟`))) return;
    await deletePurchaseOrder(order.id);
    if (selectedOrder?.id === order.id) setSelectedOrder(null);
    if (preview?.id === order.id) setPreview(null);
    await refresh();
  }

  async function exportPdf(order: PurchaseOrder) {
    setError(null);
    try {
      await downloadPurchaseOrderPdf(order);
    } catch {
      setError(operationPhrase("Impossible de télécharger le PDF du bon de commande."));
    }
  }

  async function removeDeliveryNote(document: PurchaseOrderDeliveryNote) {
    if (!editingId || !window.confirm(localized(`Supprimer le bon de livraison « ${document.original_name} » ?`, `هل تريد حذف إشعار التسليم «${document.original_name}»؟`))) return;
    try {
      await deletePurchaseOrderDeliveryNote(editingId, document.id);
      setEditorDeliveryNotes((current) => current.filter((item) => item.id !== document.id));
      setOrders((current) => current.map((order) => order.id === editingId
        ? { ...order, delivery_notes: order.delivery_notes.filter((item) => item.id !== document.id) }
        : order));
    } catch {
      setError(operationPhrase("Impossible de supprimer le bon de livraison."));
    }
  }


  return (
    <main className="equipment-page purchase-orders-page">
      {(error ?? listError) && <div className="form-alert" role="alert">{error ?? listError}</div>}

      <>
        <section className="page-heading po-workspace-heading">
          <div>
            <p className="section-label">{operationPhrase("Gestion")}</p>
            <h1>{operationPhrase("Bons de commande")}</h1>
            <p>{operationPhrase("Consultez et gérez tous les bons de commande.")}</p>
          </div>
          {canManage && <button className="table-refresh-button table-add-button" type="button" aria-label={operationPhrase("Créer un bon de commande")} title={operationPhrase("Créer un bon de commande")} onClick={createOrder}><ActionIcon name="add" /></button>}
        </section>

        <section className="inventory-panel po-history"><div className="filter-bar"><SearchField id="po-search" label={operationPhrase("Documents enregistrés")} placeholder={operationPhrase("Numéro, fournisseur ou projet")} value={search} onChange={(value) => { setSearch(value); setPage(1); }} /><div className="filter-toolbar-actions"><ToolbarIconButton icon="refresh" label={fr.common.refresh} disabled={loading} onClick={() => void refresh()} /></div></div>{loading ? <div className="table-state"><LoadingSpinner label={operationPhrase("Chargement des bons de commande…")} /></div> : orders.length === 0 ? <EmptyState title={operationPhrase("Aucun bon de commande")} description={operationPhrase("Créez le premier bon de commande avec le bouton +.")} /> : <div className="equipment-table-wrap"><table className="equipment-table"><thead><tr><th>{operationPhrase("N°")}</th><th>{operationPhrase("Date")}</th><th>{operationPhrase("Fournisseur")}</th><th>{operationPhrase("Projet")}</th><th>{operationPhrase("Total TTC")}</th><th>{operationPhrase("Modifié")}</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} {...clickableRow(() => setSelectedOrder(order))}><td><strong>{order.number}</strong></td><td>{dateLabel(order.ordered_on)}</td><td>{order.supplier_name}</td><td>{order.project_name || "—"}</td><td>{money(order.total, order.currency)}</td><td>{dateLabel(order.updated_at.slice(0, 10))}</td></tr>)}</tbody></table></div>}{pagination && <Pagination meta={pagination} disabled={loading} label={operationPhrase("Pagination des bons de commande")} onPageChange={setPage} />}</section>
      </>

      {selectedOrder && !editor && !preview && (
        <PurchaseOrderDetails
          order={selectedOrder}
          canManage={canManage}
          onClose={() => setSelectedOrder(null)}
          onPreview={() => setPreview(selectedOrder)}
          onEdit={() => editOrder(selectedOrder)}
          onDelete={() => void remove(selectedOrder)}
          onOrderChanged={(order) => { setSelectedOrder(order); void refresh(); }}
        />
      )}

      {editor && (
        <EquipmentCreationPanel
          eyebrow={operationPhrase("Bon de commande")}
          title={editingId ? operationPhrase("Modifier le document") : operationPhrase("Nouveau document")}
          action={<button className="primary-button" type="submit" form="purchase-order-form" disabled={saving}>{saving ? fr.common.saving : fr.common.save}</button>}
          onClose={closeEditor}
        >
        <form id="purchase-order-form" className="generator-create-form asset-form purchase-order-editor" onSubmit={submit}>
          <div className="asset-form-layout">
            <InventoryFormSection title={operationPhrase("Bon de livraison")} icon="invoice">
              <div className="po-delivery-notes-editor equipment-invoices-section">
                <DocumentUploadDropzone compact title={operationPhrase("Ajouter le bon de livraison")} description={operationPhrase("PDF uniquement · 10 Mo maximum")} disabled={saving} onFiles={(files) => setDeliveryNoteFiles((current) => [...current, ...files])} />
                {deliveryNoteFiles.length > 0 && <div className="po-pending-documents">{deliveryNoteFiles.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`}><span>{file.name}</span><button type="button" aria-label={localized(`Retirer ${file.name}`, `إزالة ${file.name}`)} onClick={() => setDeliveryNoteFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><ActionIcon name="close" /></button></div>)}</div>}
                {editorDeliveryNotes.length > 0 && <><div className="section-heading-row"><div><h3>{operationPhrase("Documents enregistrés")}</h3><p>{localized(`${editorDeliveryNotes.length} bon${editorDeliveryNotes.length > 1 ? "s" : ""} de livraison`, editorDeliveryNotes.length > 1 ? `${editorDeliveryNotes.length} إشعارات تسليم` : "إشعار تسليم واحد")}</p></div></div><PaginatedDocumentList pageSize={3} documents={editorDeliveryNotes} emptyMessage={operationPhrase("Aucun bon de livraison")} renderDocument={(document) => <DocumentRow key={document.id} url={document.url} name={document.original_name} meta={`${formatFileSize(document.size_bytes)} · ${dateLabel(document.created_at.slice(0, 10))}${document.uploaded_by ? localized(` · Ajouté par ${document.uploaded_by.name}`, ` · أضافه ${document.uploaded_by.name}`) : ""}`} onError={setError} onDelete={() => void removeDeliveryNote(document)} />} /></>}
              </div>
            </InventoryFormSection>
            <InventoryFormSection title={operationPhrase("Informations")} icon="identification">
              <div className="maintenance-form-grid asset-form-grid-2">
                <label><span>{operationPhrase("Fournisseur")}</span><input required value={editor.supplier_name} onChange={(event) => updateField("supplier_name", event.target.value)} /></label>
                <label><span>{operationPhrase("Date")}</span><input required type="date" value={editor.ordered_on} onChange={(event) => updateField("ordered_on", event.target.value)} /></label>
                <label><span>{operationPhrase("Téléphone")}</span><input value={editor.supplier_phone ?? ""} onChange={(event) => updateField("supplier_phone", event.target.value)} /></label>
                <label><span>{operationPhrase("Fax")}</span><input value={editor.supplier_fax ?? ""} onChange={(event) => updateField("supplier_fax", event.target.value)} /></label>
                <label><span>{operationPhrase("Agent de suivi")}</span><input value={editor.follow_up_agent ?? ""} onChange={(event) => updateField("follow_up_agent", event.target.value)} /></label>
                <label><span>{operationPhrase("Contact")}</span><input value={editor.contact_name ?? ""} onChange={(event) => updateField("contact_name", event.target.value)} /></label>
                <label><span>{operationPhrase("Projet *")}</span><SearchableSelect ariaLabel={operationPhrase("Projet")} required value={editor.project_id ? String(editor.project_id) : ""} onChange={(value) => updateField("project_id", value ? Number(value) : null)} placeholder={operationPhrase("Sélectionner un chantier")} options={projects.map((project) => ({ value: String(project.id), label: project.code ? `${project.code} · ${project.name}` : localized(`${project.name} (sans code analytique)`, `${project.name} (بدون رمز تحليلي)`) }))} /></label>
                <label><span>{operationPhrase("Motif")}</span><input value={editor.reason ?? ""} onChange={(event) => updateField("reason", event.target.value)} /></label>
              </div>
            </InventoryFormSection>
            <InventoryFormSection title={operationPhrase("Articles")} icon="invoice">
              <div className="po-lines-section">
                <div className="po-lines-heading"><span>{operationPhrase("Articles commandés")}</span><button type="button" className="maintenance-add" onClick={() => updateField("items", [...editor.items, emptyItem()])}><ActionIcon name="add" /> {operationPhrase("Ajouter une ligne")}</button></div>
            <div className="po-lines-table-wrap"><table className="po-lines-table"><thead><tr><th>{operationPhrase("N°")}</th><th>{operationPhrase("Code budget")}</th><th>{operationPhrase("Description *")}</th><th>{operationPhrase("Quantité *")}</th><th>{operationPhrase("Unité")}</th><th>{operationPhrase("Prix unitaire *")}</th><th>{operationPhrase("Total")}</th><th /></tr></thead><tbody>{editor.items.map((item, index) => <tr key={item.key}><td>{index + 1}</td><td>{materialsForEditor.length > 0
                ? <SearchableSelect ariaLabel={`Code budget ligne ${index + 1}`} value={item.subcontract_item_material_id ? String(item.subcontract_item_material_id) : ""} onChange={(value) => linkMaterial(item.key, value ? Number(value) : null)} placeholder={operationPhrase("Aucun (achat hors sous-traitance)")} options={materialsForEditor.map((material) => ({ value: String(material.id), label: `${material.item_code} · ${material.name} (${material.unit}) — ${material.item_description}` }))} />
                : <input aria-label={`Code budget ligne ${index + 1}`} value={item.budget_code ?? ""} onChange={(event) => updateItem(item.key, "budget_code", event.target.value)} />}</td><td><input aria-label={operationPhrase("Description *")} required value={item.description} onChange={(event) => updateItem(item.key, "description", event.target.value)} /></td><td><input aria-label={operationPhrase("Quantité *")} required min="1" step="1" inputMode="numeric" type="number" value={item.quantity} onChange={(event) => updateItem(item.key, "quantity", integerInput(event.target.value))} /></td><td><input aria-label={localized(`Unité ligne ${index + 1}`, `الوحدة - السطر ${index + 1}`)} placeholder={operationPhrase("t, sac, u…")} title={item.subcontract_item_material_id ? operationPhrase("Unité du matériau de la sous-traitance") : undefined} disabled={Boolean(item.subcontract_item_material_id)} value={item.unit ?? ""} onChange={(event) => updateItem(item.key, "unit", event.target.value)} /></td><td><input aria-label={operationPhrase("Prix unitaire *")} required min="0" step="0.01" type="number" value={item.unit_price} onChange={(event) => updateItem(item.key, "unit_price", event.target.value)} /></td><td>{money(numeric(item.quantity) * numeric(item.unit_price), editor.currency)}</td><td><button aria-label={localized(`Supprimer la ligne ${index + 1}`, `حذف السطر ${index + 1}`)} type="button" className="po-remove-line" disabled={editor.items.length === 1} onClick={() => updateField("items", editor.items.filter((candidate) => candidate.key !== item.key))}><ActionIcon name="delete" /></button></td></tr>)}</tbody></table></div>
              </div>
            </InventoryFormSection>
            <InventoryFormSection title={operationPhrase("Validation et totaux")} icon="specifications">
              <div className="po-editor-bottom">
                <div className="maintenance-form-grid asset-form-grid-2"><label><span>{operationPhrase("Préparé par")}</span><input value={editor.prepared_by ?? ""} onChange={(event) => updateField("prepared_by", event.target.value)} /></label><label><span>{operationPhrase("Commandé par")}</span><input value={editor.ordered_by ?? ""} onChange={(event) => updateField("ordered_by", event.target.value)} /></label><label><span>{operationPhrase("Validé par")}</span><input value={editor.approved_by ?? ""} onChange={(event) => updateField("approved_by", event.target.value)} /></label><label><span>{operationPhrase("TVA (%)")}</span><input min="0" max="100" step="0.01" type="number" value={editor.vat_rate} onChange={(event) => updateField("vat_rate", event.target.value)} /></label></div>
                <dl className="po-live-totals"><div><dt>{operationPhrase("Total HT")}</dt><dd>{money(totals.subtotal, editor.currency)}</dd></div><div><dt>{operationPhrase("TVA")}</dt><dd>{money(totals.vat, editor.currency)}</dd></div><div><dt>{operationPhrase("Total TTC")}</dt><dd>{money(totals.total, editor.currency)}</dd></div></dl>
              </div>
            </InventoryFormSection>
          </div>
        </form>
        </EquipmentCreationPanel>
      )}

      {preview && <div className="po-preview-backdrop" onMouseDown={() => setPreview(null)}><section className="po-preview-panel" role="dialog" aria-modal="true" aria-label={localized(`Bon de commande ${preview.number}`, `أمر الشراء ${preview.number}`)} onMouseDown={(event) => event.stopPropagation()}><header><div><strong>{localized(`Aperçu du bon N° ${preview.number}`, `معاينة أمر الشراء رقم ${preview.number}`)}</strong><small>{operationPhrase("Le PDF est enregistré dans le stockage sécurisé des documents.")}</small></div><div>{canManage && <button className="secondary-button" type="button" onClick={() => { editOrder(preview); setPreview(null); }}><ActionIcon name="edit" /> {fr.common.edit}</button>}<button className="primary-button" type="button" onClick={() => void exportPdf(preview)}><ActionIcon name="download" /> {operationPhrase("Exporter en PDF")}</button><button className="po-preview-close" type="button" aria-label={operationPhrase("Fermer l’aperçu")} title={fr.common.close} onClick={() => setPreview(null)}><ActionIcon name="close" /></button></div></header>{preview.delivery_notes.length > 0 && <div className="po-preview-delivery-notes"><strong>{preview.delivery_notes.length > 1 ? operationPhrase("Bons de livraison :") : operationPhrase("Bon de livraison :")}</strong>{preview.delivery_notes.map((document) => <button type="button" key={document.id} onClick={() => { if (!openDocument(document.url)) setError(operationPhrase("Impossible d’ouvrir le bon de livraison.")); }}><ActionIcon name="invoice" /> {document.original_name}</button>)}</div>}<div className="po-sheet-stage"><iframe className="po-pdf-frame" title={localized(`Aperçu PDF du bon ${preview.number}`, `معاينة PDF لأمر الشراء ${preview.number}`)} src={`${preview.pdf_url}?preview=1#toolbar=0&navpanes=0&scrollbar=0`} /></div></section></div>}
    </main>
  );
}

function PurchaseOrderDetails({ order, canManage, onClose, onPreview, onEdit, onDelete, onOrderChanged }: { order: PurchaseOrder; canManage: boolean; onClose: () => void; onPreview: () => void; onEdit: () => void; onDelete: () => void; onOrderChanged: (order: PurchaseOrder) => void }) {
  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside className="detail-panel insurance-side-panel purchase-order-detail-panel" role="dialog" aria-modal="true" aria-label={localized(`Détail du bon de commande ${order.number}`, `تفاصيل أمر الشراء ${order.number}`)} onMouseDown={(event) => event.stopPropagation()}>
        <header className="detail-header">
          <div>
            <p className="section-label">{operationPhrase("Bon de commande")}</p>
            <h2>{operationPhrase("N°")} {order.number}</h2>
            <p>{order.supplier_name}</p>
          </div>
          <button type="button" aria-label={fr.common.close} onClick={onClose}><ActionIcon name="close" /></button>
        </header>
        <div className="detail-content insurance-side-content">
          <div className="detail-primary-actions purchase-order-detail-actions">
            {canManage && <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={onEdit}><ActionIcon name="edit" /> {fr.common.edit}</button>}
            <button className="equipment-history-button detail-toolbar-button" type="button" onClick={onPreview}><ActionIcon name="invoice" /> {operationPhrase("Aperçu")}</button>
            {canManage && <button className="danger-button detail-delete-button" type="button" aria-label={fr.common.delete} title={fr.common.delete} onClick={onDelete}><ActionIcon name="delete" /></button>}
          </div>
          <section>
            <h3><ActionIcon name="identification" /> {operationPhrase("Informations principales")}</h3>
            <dl>
              <div><dt>{operationPhrase("Fournisseur")}</dt><dd>{order.supplier_name}</dd></div>
              <div><dt>{operationPhrase("Date")}</dt><dd>{dateLabel(order.ordered_on)}</dd></div>
              <div><dt>{operationPhrase("Projet")}</dt><dd>{order.project_name || fr.common.toComplete}</dd></div>
              <div><dt>{operationPhrase("Motif")}</dt><dd>{order.reason || fr.common.toComplete}</dd></div>
              <div><dt>{operationPhrase("Téléphone")}</dt><dd>{order.supplier_phone || fr.common.toComplete}</dd></div>
              <div><dt>{operationPhrase("Contact")}</dt><dd>{order.contact_name || fr.common.toComplete}</dd></div>
            </dl>
          </section>
          <section>
            <h3><ActionIcon name="invoice" /> {operationPhrase("Articles commandés")}</h3>
            <div className="po-detail-items">
              {order.items.map((item, index) => <article key={item.id ?? index}><span>{index + 1}</span><div><strong>{item.description}</strong><small>{item.material_label || item.budget_code || operationPhrase("Sans code budget")} · {item.quantity}{item.unit ? ` ${item.unit}` : ""} × {money(item.unit_price, order.currency)}</small></div><b>{money(item.total ?? numeric(item.quantity) * numeric(item.unit_price), order.currency)}</b></article>)}
            </div>
          </section>
          <section>
            <h3><ActionIcon name="specifications" /> {operationPhrase("Totaux")}</h3>
            <dl>
              <div><dt>{operationPhrase("Total HT")}</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
              <div><dt>{operationPhrase("TVA")} ({Number(order.vat_rate)} %)</dt><dd>{money(order.vat_amount, order.currency)}</dd></div>
              <div><dt>{operationPhrase("Total TTC")}</dt><dd><strong>{money(order.total, order.currency)}</strong></dd></div>
            </dl>
          </section>
          <SupplierInvoices order={order} canManage={canManage} onChanged={onOrderChanged} />
          {order.delivery_notes.length > 0 && <section>
            <h3><ActionIcon name="invoice" /> {operationPhrase("Bons de livraison")}</h3>
            <div className="po-detail-documents">{order.delivery_notes.map((document) => <DocumentRow key={document.id} url={document.url} name={document.original_name} meta={`${formatFileSize(document.size_bytes)} · ${dateLabel(document.created_at.slice(0, 10))}`} />)}</div>
          </section>}
        </div>
      </aside>
    </div>
  );
}
