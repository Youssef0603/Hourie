import { ActionIcon } from "../../../shared/components/ActionIcon";
import { DocumentRow } from "../../../shared/components/DocumentRow";
import { openDocument } from "../../../shared/documents";
import { formatDate } from "../../../shared/format";
import { localized, operationPhrase } from "../../../i18n/operations";
import { amount, money, paymentChannelLabels, percent, quantity, valuationStatusLabel, valuationTitle } from "../display";
import { valuationSheetUrl } from "../api";
import type { MaterialCheckStatus, PaymentChannel, Subcontract } from "../types";

const materialStatusLabels: Record<MaterialCheckStatus, string> = {
  ok: "Conforme",
  surplus: "Surplus à justifier",
  shortfall: "Achats insuffisants",
};

export function SubcontractDetails({ subcontract, canManage, error, onClose, onEdit, onDelete, onNewVariation, onOpenValuation, onOpening }: {
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
  /** Opens the opening balance form of a contract that started before Hourie. */
  onOpening: () => void;
}) {
  const { summary, currency } = { summary: subcontract.summary, currency: subcontract.currency };
  const openValuation = summary.open_valuation;
  const channels = (["cash", "cheque", "vat"] as PaymentChannel[]).filter((channel) => Number(summary.channels[channel].due) > 0);

  return (
    <div className="detail-backdrop" onMouseDown={onClose}>
      <aside className="detail-panel insurance-side-panel" role="dialog" aria-modal="true" aria-label={localized(`Contrat ${subcontract.reference}`, `العقد ${subcontract.reference}`)} onMouseDown={(event) => event.stopPropagation()}>
        <header className="detail-header">
          <div>
            <p className="section-label">{operationPhrase("Sous-traitance")}</p>
            <h2>{subcontract.reference}</h2>
            <p>{subcontract.subcontractor.name}</p>
          </div>
          <button type="button" aria-label={operationPhrase("Fermer")} onClick={onClose}><ActionIcon name="close" /></button>
        </header>
        <div className="detail-content insurance-side-content">
          {error && <div className="notice warning" role="alert">{error}</div>}
          {canManage && (
            <div className="detail-primary-actions subcontract-detail-actions">
              {openValuation
                ? <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={() => onOpenValuation(openValuation.id)}><ActionIcon name="edit" /> {operationPhrase("Situation en cours")}</button>
                : <button className="equipment-edit-button detail-toolbar-button" type="button" onClick={() => onOpenValuation(null)}><ActionIcon name="add" /> {operationPhrase("Nouvelle situation")}</button>}
              {!summary.has_work_valuations && <button className="detail-toolbar-button" type="button" title={operationPhrase("Pour un contrat commencé avant Hourie")} onClick={onOpening}><ActionIcon name="history" /> {operationPhrase("Reprise de l’historique")}</button>}
              <button className="detail-toolbar-button" type="button" onClick={onNewVariation}><ActionIcon name="note" /> {operationPhrase("Avenant")}</button>
              <button className="detail-toolbar-button" type="button" onClick={onEdit}><ActionIcon name="edit" /> {operationPhrase("Modifier")}</button>
              <button className="danger-button detail-delete-button" type="button" aria-label={operationPhrase("Supprimer le contrat")} title={operationPhrase("Supprimer le contrat")} onClick={onDelete}><ActionIcon name="delete" /></button>
            </div>
          )}

          <section>
            <h3><ActionIcon name="identification" /> {operationPhrase("Informations principales")}</h3>
            <dl>
              <div><dt>{operationPhrase("Chantier")}</dt><dd>{subcontract.project.code} · {subcontract.project.name}</dd></div>
              <div><dt>{operationPhrase("Signé le")}</dt><dd>{formatDate(subcontract.signed_on, { style: "medium", fallback: operationPhrase("À compléter") })}</dd></div>
              <div><dt>{operationPhrase("Objet")}</dt><dd>{subcontract.title}</dd></div>
              <div><dt>{operationPhrase("Contact")}</dt><dd>{subcontract.subcontractor.contact_name || subcontract.subcontractor.phone || operationPhrase("À compléter")}</dd></div>
            </dl>
          </section>

          <section>
            <h3><ActionIcon name="specifications" /> {operationPhrase("Situation financière")}</h3>
            <dl>
              <div><dt>{operationPhrase("Montant initial")}</dt><dd>{money(summary.original_amount, currency)}</dd></div>
              <div><dt>{operationPhrase("Avenants")}</dt><dd>{money(summary.variations_amount, currency)}</dd></div>
              <div><dt>{operationPhrase("Montant révisé")}</dt><dd><strong>{money(summary.revised_amount, currency)}</strong></dd></div>
              <div><dt>{localized(`Exécuté (${summary.progress_percent} %)`, `المنفّذ (${summary.progress_percent} %)`)}</dt><dd>{money(summary.executed_amount, currency)}</dd></div>
              <div><dt>{operationPhrase("Payé")}</dt><dd>{money(summary.paid_amount, currency)}</dd></div>
              <div><dt>{operationPhrase("Reste à payer")}</dt><dd>{money(summary.to_pay_amount, currency)}</dd></div>
              <div><dt>{localized(`Retenue détenue (taux ${Number(subcontract.retention_rate)} %)`, `محتجز الضمان المحتفَظ به (بنسبة ${Number(subcontract.retention_rate)} %)`)}</dt><dd>{money(summary.retention_held, currency)}</dd></div>
              <div><dt>{operationPhrase("Avance à récupérer")}</dt><dd>{money(summary.advance_remaining, currency)}</dd></div>
              {Number(subcontract.cash_percent) > 0 && <div><dt>{operationPhrase("Part payée en espèces")}</dt><dd>{Number(subcontract.cash_percent)} %</dd></div>}
            </dl>
          </section>

          {channels.length > 1 && (
            <section>
              <h3><ActionIcon name="invoice" /> {operationPhrase("Suivi des règlements")}</h3>
              <p className="sc-hint">{operationPhrase("Avance, reprise et situations approuvées, par mode de règlement.")}</p>
              <div className="sc-table-wrap">
                <table className="sc-table sc-compact-table">
                  <thead><tr><th>{operationPhrase("Mode")}</th><th className="num">{operationPhrase("À payer")}</th><th className="num">{operationPhrase("Payé")}</th><th className="num">{operationPhrase("Reste")}</th></tr></thead>
                  <tbody>
                    {channels.map((channel) => (
                      <tr key={channel}>
                        <td>{operationPhrase(paymentChannelLabels[channel])}</td>
                        <td className="num">{amount(summary.channels[channel].due)}</td>
                        <td className="num">{amount(summary.channels[channel].paid)}</td>
                        <td className="num"><strong>{amount(summary.channels[channel].balance)}</strong></td>
                      </tr>
                    ))}
                    <tr className="sc-total-row">
                      <td><strong>{operationPhrase("Total")}</strong></td>
                      <td className="num"><strong>{amount(channels.reduce((total, channel) => total + Number(summary.channels[channel].due), 0))}</strong></td>
                      <td className="num"><strong>{amount(summary.paid_amount)}</strong></td>
                      <td className="num"><strong>{amount(summary.to_pay_amount)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="sc-hint">{localized(`Montants en ${currency === "XOF" ? "F CFA" : currency}.`, `المبالغ بـ ${currency === "XOF" ? "فرنك CFA" : currency}.`)}</p>
            </section>
          )}

          <section>
            <h3><ActionIcon name="invoice" /> {operationPhrase("Bordereau")}</h3>
            <div className="sc-table-wrap">
              <table className="sc-table">
                <thead><tr><th>{operationPhrase("Article")}</th><th className="num">{operationPhrase("Autorisé")}</th><th className="num">{operationPhrase("Exécuté")}</th><th className="num">%</th></tr></thead>
                <tbody>
                  {subcontract.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong><div className="muted">{item.code ?? operationPhrase("Sans code")} · {money(item.unit_price, currency)} / {item.unit}{item.variation ? ` · ${item.variation}` : ""}</div></td>
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
              <h3><ActionIcon name="specifications" /> {operationPhrase("Rapprochement matériaux")}</h3>
              <p className="sc-hint">{operationPhrase("Matériaux achetés par ARH (bons de commande) comparés à ce que les travaux approuvés auraient dû consommer, pertes comprises.")}</p>
              {subcontract.material_check!.map((check) => (
                <div className="sc-check-item" key={check.item_id}>
                  <strong>{check.code} · {check.description}</strong>
                  <small>{operationPhrase("Travaux exécutés (situations approuvées) :")} {quantity(check.executed_quantity)} {check.unit}</small>
                  {check.materials.map((material) => (
                    <div className="sc-check-material" key={material.id}>
                      <header>
                        <strong>{material.name}</strong>
                        <em className={`valuation-status ${material.status}`}>{operationPhrase(materialStatusLabels[material.status])}</em>
                      </header>
                      <dl>
                        <div><dt>{localized(`Nécessaire (+${Number(material.waste_percent)} % perte)`, `الكمية المطلوبة (+${Number(material.waste_percent)} % هدر)`)}</dt><dd>{quantity(material.needed_quantity)} {material.unit}</dd></div>
                        <div><dt>{operationPhrase("Acheté par ARH")}</dt><dd>{quantity(material.bought_quantity)} {material.unit}</dd></div>
                        <div><dt>{operationPhrase("Écart")}</dt><dd>{Number(material.gap_quantity) > 0 ? "+" : ""}{quantity(material.gap_quantity)} {material.unit}</dd></div>
                      </dl>
                      {material.status === "surplus" && <p>{localized(
                        `Surplus d’environ ${money(material.gap_amount, currency)} à justifier : stock sur chantier, perte ou vol ?`,
                        `فائض بقيمة تقارب ${money(material.gap_amount, currency)} يجب تبريره: مخزون في ورشة العمل، أم هدر، أم سرقة؟`,
                      )}</p>}
                      {material.status === "shortfall" && <p>{operationPhrase("Les achats ne couvrent pas la consommation : un bon de commande n’est peut-être pas relié à ce matériau.")}</p>}
                      {material.purchase_orders.length ? (
                        <p className="sc-order-links">{operationPhrase("Bons de commande :")}{" "}
                          {material.purchase_orders.map((order, index) => (
                            <span key={order.id}>
                              {index > 0 && ", "}
                              <button type="button" title={operationPhrase("Ouvrir le PDF du bon de commande")} onClick={() => openDocument(order.pdf_url)}>{order.number}</button> ({quantity(order.quantity)} {material.unit})
                            </span>
                          ))}
                        </p>
                      ) : <p>{operationPhrase("Aucun bon de commande relié pour l’instant.")}</p>}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )}

          {(subcontract.purchase_orders?.length ?? 0) > 0 && (
            <section>
              <h3><ActionIcon name="invoice" /> {operationPhrase("Bons de commande liés")}</h3>
              <div className="po-detail-documents">
                {subcontract.purchase_orders!.map((order) => (
                  <DocumentRow
                    key={order.id}
                    url={order.pdf_url}
                    name={localized(`Bon de commande ${order.number}`, `أمر الشراء ${order.number}`)}
                    fileName={`Bon_de_commande_${order.number}.pdf`}
                    meta={`${order.supplier_name} · ${formatDate(order.ordered_on, { style: "medium" })}`}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h3><ActionIcon name="history" /> {operationPhrase("Situations")}</h3>
            <div className="sc-actions sc-sheet-action">
              <button className="secondary-button" type="button" title={operationPhrase("La prochaine situation à remplir sur chantier, avec tout l’historique du contrat")} onClick={() => openDocument(valuationSheetUrl(subcontract.id))}><ActionIcon name="download" /> {operationPhrase("Fiche de situation (PDF)")}</button>
            </div>
            {subcontract.valuations.length === 0 ? <p className="muted">{operationPhrase("Aucune situation pour l’instant.")}</p> : (
              <div className="sc-list">
                {[...subcontract.valuations].reverse().map((valuation) => (
                  <button className="sc-list-row" type="button" key={valuation.id} onClick={() => onOpenValuation(valuation.id)}>
                    <div>
                      <strong>{valuationTitle(valuation)}</strong>
                      <small>{valuation.kind === "advance"
                        ? formatDate(valuation.valuation_date, { style: "medium" })
                        : valuation.kind === "opening"
                          ? localized(`Situations papier jusqu’au ${formatDate(valuation.period_end, { style: "medium" })}`, `الكشوف الورقية حتى ${formatDate(valuation.period_end, { style: "medium" })}`)
                          : localized(`Jusqu’au ${formatDate(valuation.period_end, { style: "medium" })}`, `حتى ${formatDate(valuation.period_end, { style: "medium" })}`)}{valuation.invoice_amount !== null ? ` · ${operationPhrase(valuation.invoice_matches ? "Facture conforme" : "Écart sur facture")}` : ""}{valuation.status === "partially_paid" ? ` · ${localized(`Reste ${money(valuation.balance_due, currency)}`, `المتبقي ${money(valuation.balance_due, currency)}`)}` : ""}</small>
                    </div>
                    <b>{money(valuation.net_due, currency)}</b>
                    <em className={`valuation-status ${valuation.invoice_amount !== null && !valuation.invoice_matches ? "warning" : valuation.status}`}>{valuationStatusLabel(valuation.status)}</em>
                  </button>
                ))}
              </div>
            )}
          </section>

          {(subcontract.variations?.length ?? 0) > 0 && (
            <section>
              <h3><ActionIcon name="note" /> {operationPhrase("Avenants")}</h3>
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
