import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import { openDocument } from "../../../shared/documents";
import { formatDate } from "../../../shared/format";
import { money, percent, quantity, valuationStatusLabels } from "../display";
import type { MaterialCheckStatus, Subcontract } from "../types";

const materialStatusLabels: Record<MaterialCheckStatus, string> = {
  ok: "Conforme",
  surplus: "Surplus à justifier",
  shortfall: "Achats insuffisants",
};

export function SubcontractDetails({ subcontract, canManage, error, onClose, onEdit, onDelete, onNewVariation, onOpenValuation }: {
  subcontract: Subcontract;
  canManage: boolean;
  /** Message to show at the top of the panel, e.g. a refused deletion. */
  error?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNewVariation: () => void;
  /** null opens a new valuation. */
  onOpenValuation: (valuationId: number | null) => void;
}) {
  const { summary, currency } = { summary: subcontract.summary, currency: subcontract.currency };
  const openValuation = summary.open_valuation;

  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside className="detail-panel insurance-side-panel" role="dialog" aria-modal="true" aria-label={`Contrat ${subcontract.reference}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="detail-header">
          <div>
            <p className="section-label">Sous-traitance</p>
            <h2>{subcontract.reference}</h2>
            <p>{subcontract.subcontractor.name}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose}><ActionIcon name="close" /></button>
        </header>
        <div className="detail-content insurance-side-content">
          {error && <div className="notice warning" role="alert">{error}</div>}
          {canManage && (
            <div className="detail-primary-actions subcontract-detail-actions">
              {openValuation
                ? <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={() => onOpenValuation(openValuation.id)}><ActionIcon name="edit" /> Situation en cours</button>
                : <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={() => onOpenValuation(null)}><ActionIcon name="add" /> Nouvelle situation</button>}
              <button className="detail-toolbar-button" type="button" onClick={onNewVariation}><ActionIcon name="note" /> Avenant</button>
              <button className="detail-toolbar-button" type="button" onClick={onEdit}><ActionIcon name="edit" /> Modifier</button>
              <button className="danger-button detail-delete-button" type="button" aria-label="Supprimer le contrat" title="Supprimer le contrat" onClick={onDelete}><ActionIcon name="delete" /></button>
            </div>
          )}

          <section>
            <h3><ActionIcon name="identification" /> Informations principales</h3>
            <dl>
              <div><dt>Chantier</dt><dd>{subcontract.project.code} · {subcontract.project.name}</dd></div>
              <div><dt>Signé le</dt><dd>{formatDate(subcontract.signed_on, { style: "medium", fallback: "À compléter" })}</dd></div>
              <div><dt>Objet</dt><dd>{subcontract.title}</dd></div>
              <div><dt>Contact</dt><dd>{subcontract.subcontractor.contact_name || subcontract.subcontractor.phone || "À compléter"}</dd></div>
            </dl>
          </section>

          <section>
            <h3><ActionIcon name="specifications" /> Situation financière</h3>
            <dl>
              <div><dt>Montant initial</dt><dd>{money(summary.original_amount, currency)}</dd></div>
              <div><dt>Avenants</dt><dd>{money(summary.variations_amount, currency)}</dd></div>
              <div><dt>Montant révisé</dt><dd><strong>{money(summary.revised_amount, currency)}</strong></dd></div>
              <div><dt>Exécuté ({summary.progress_percent} %)</dt><dd>{money(summary.executed_amount, currency)}</dd></div>
              <div><dt>Payé</dt><dd>{money(summary.paid_amount, currency)}</dd></div>
              <div><dt>Approuvé, à payer</dt><dd>{money(summary.to_pay_amount, currency)}</dd></div>
              <div><dt>Retenue détenue (taux {Number(subcontract.retention_rate)} %)</dt><dd>{money(summary.retention_held, currency)}</dd></div>
              <div><dt>Avance à récupérer</dt><dd>{money(summary.advance_remaining, currency)}</dd></div>
            </dl>
          </section>

          <section>
            <h3><ActionIcon name="invoice" /> Bordereau</h3>
            <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr><th>Article</th><th className="num">Autorisé</th><th className="num">Exécuté</th><th className="num">%</th></tr></thead>
                <tbody>
                  {subcontract.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong><div className="muted">{item.code ?? "Sans code"} · {money(item.unit_price, currency)} / {item.unit}{item.variation ? ` · ${item.variation}` : ""}</div></td>
                      <td className="num">{quantity(item.authorized_quantity)} {item.unit}</td>
                      <td className="num">{quantity(item.executed_quantity)} {item.unit}</td>
                      <td className="num">{percent(item.executed_quantity, item.authorized_quantity)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(subcontract.material_check?.length ?? 0) > 0 && (
            <section>
              <h3><ActionIcon name="specifications" /> Rapprochement matériaux</h3>
              <p className="sc-hint">Matériaux achetés par ARH (bons de commande) comparés à ce que les travaux approuvés auraient dû consommer, pertes comprises.</p>
              {subcontract.material_check!.map((check) => (
                <div className="sc-check-item" key={check.item_id}>
                  <strong>{check.code} · {check.description}</strong>
                  <small>Travaux exécutés (situations approuvées) : {quantity(check.executed_quantity)} {check.unit}</small>
                  {check.materials.map((material) => (
                    <div className="sc-check-material" key={material.id}>
                      <header>
                        <strong>{material.name}</strong>
                        <em className={`valuation-status ${material.status}`}>{materialStatusLabels[material.status]}</em>
                      </header>
                      <dl>
                        <div><dt>Nécessaire (+{Number(material.waste_percent)} % perte)</dt><dd>{quantity(material.needed_quantity)} {material.unit}</dd></div>
                        <div><dt>Acheté par ARH</dt><dd>{quantity(material.bought_quantity)} {material.unit}</dd></div>
                        <div><dt>Écart</dt><dd>{Number(material.gap_quantity) > 0 ? "+" : ""}{quantity(material.gap_quantity)} {material.unit}</dd></div>
                      </dl>
                      {material.status === "surplus" && <p>Surplus d’environ {money(material.gap_amount, currency)} à justifier : stock sur chantier, perte ou vol ?</p>}
                      {material.status === "shortfall" && <p>Les achats ne couvrent pas la consommation : un bon de commande n’est peut-être pas relié à ce matériau.</p>}
                      {material.purchase_orders.length ? (
                        <p className="sc-order-links">Bons de commande :{" "}
                          {material.purchase_orders.map((order, index) => (
                            <span key={order.id}>
                              {index > 0 && ", "}
                              <button type="button" title="Ouvrir le PDF du bon de commande" onClick={() => openDocument(order.pdf_url)}>{order.number}</button> ({quantity(order.quantity)} {material.unit})
                            </span>
                          ))}
                        </p>
                      ) : <p>Aucun bon de commande relié pour l’instant.</p>}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          {(subcontract.purchase_orders?.length ?? 0) > 0 && (
            <section>
              <h3><ActionIcon name="invoice" /> Bons de commande liés</h3>
              <div className="po-detail-documents">
                {subcontract.purchase_orders!.map((order) => (
                  <DocumentRow
                    key={order.id}
                    url={order.pdf_url}
                    name={`Bon de commande ${order.number}`}
                    fileName={`Bon_de_commande_${order.number}.pdf`}
                    meta={`${order.supplier_name} · ${formatDate(order.ordered_on, { style: "medium" })}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h3><ActionIcon name="history" /> Situations</h3>
            {subcontract.valuations.length === 0 ? <p className="muted">Aucune situation pour l’instant.</p> : (
              <div className="sc-list">
                {[...subcontract.valuations].reverse().map((valuation) => (
                  <button className="sc-list-row" type="button" key={valuation.id} onClick={() => onOpenValuation(valuation.id)}>
                    <div>
                      <strong>{valuation.reference}</strong>
                      <small>Jusqu’au {formatDate(valuation.period_end, { style: "medium" })}{valuation.invoice_amount !== null ? (valuation.invoice_matches ? " · Facture conforme" : " · Écart sur facture") : ""}</small>
                    </div>
                    <b>{money(valuation.net_due, currency)}</b>
                    <em className={`valuation-status ${valuation.invoice_amount !== null && !valuation.invoice_matches ? "warning" : valuation.status}`}>{valuationStatusLabels[valuation.status]}</em>
                  </button>
                ))}
              </div>
            )}
          </section>

          {(subcontract.variations?.length ?? 0) > 0 && (
            <section>
              <h3><ActionIcon name="note" /> Avenants</h3>
              <div className="sc-list">
                {subcontract.variations!.map((variation) => (
                  <div className="sc-list-row" key={variation.id}>
                    <div>
                      <strong>{variation.reference} · {variation.title}</strong>
                      <small>{formatDate(variation.approved_on, { style: "medium" })} · {variation.lines.map((line) => `+${quantity(line.quantity)} ${line.unit} ${line.description}`).join(", ")}</small>
                    </div>
                    <b>{money(variation.amount, currency)}</b>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
