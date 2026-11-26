import { useCallback, useEffect, useState } from "react";
import { clickableRow } from "../../../shared/clickableRow";
import { DataTable } from "../../../shared/components/DataTable";
import { EmptyState } from "../../../shared/components/EmptyState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Pagination } from "../../../shared/components/Pagination";
import { SearchField } from "../../../shared/components/SearchField";
import { ToolbarIconButton } from "../../../shared/components/ToolbarButtons";
import { TotalCount } from "../../../shared/components/TotalCount";
import { usePaginatedList } from "../../../shared/usePaginatedList";
import { deleteSubcontract, getSubcontract, getSubcontracts } from "../api";
import { apiErrorMessage } from "../../../shared/api/errors";
import { SubcontractDetails } from "../components/SubcontractDetails";
import { SubcontractForm } from "../components/SubcontractForm";
import { OpeningForm } from "../components/OpeningForm";
import { ValuationPanel } from "../components/ValuationPanel";
import { VariationForm } from "../components/VariationForm";
import { money, valuationStatusLabel } from "../display";
import { localized, operationPhrase } from "../../../i18n/operations";
import type { Subcontract } from "../types";
import "./subcontracts-page.css";

type Editor =
  | { kind: "subcontract"; subcontract?: Subcontract }
  | { kind: "variation" }
  | { kind: "opening" }
  | { kind: "valuation"; valuationId: number | null };

export function SubcontractsPage({ canManage, projects, initialSubcontractId = null, onSelect }: {
  canManage: boolean;
  projects: Array<{ id: number; name: string; code: string | null }>;
  initialSubcontractId?: number | null;
  onSelect?: (subcontractId: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const loadSubcontracts = useCallback((page: number) => getSubcontracts(search, page), [search]);
  const { items: subcontracts, meta: pagination, setPage, loading, error, reload: refresh } = usePaginatedList<Subcontract>(
    loadSubcontracts,
    operationPhrase("Impossible de charger les contrats de sous-traitance."),
  );
  const [selectedId, setSelectedId] = useState<number | null>(initialSubcontractId);
  const [loadedSelection, setSelected] = useState<Subcontract | null>(null);
  const selected = selectedId === null ? null : loadedSelection;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const reloadSelected = useCallback(async (id: number) => {
    try {
      setSelected(await getSubcontract(id));
    } catch {
      setSelectedId(null);
    }
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    getSubcontract(selectedId)
      .then((subcontract) => { if (active) setSelected(subcontract); })
      .catch(() => { if (active) setSelectedId(null); });
    return () => { active = false; };
  }, [selectedId]);

  function select(id: number | null) {
    setDetailError(null);
    setSelectedId(id);
    onSelect?.(id);
  }

  async function remove(subcontract: Subcontract) {
    if (!window.confirm(localized(
      `Supprimer le contrat ${subcontract.reference} ? Ses avenants et ses situations en brouillon seront aussi supprimés.`,
      `حذف العقد ${subcontract.reference}؟ سيتم أيضًا حذف ملاحق العقد وكشوف الأعمال التي لا تزال في حالة مسودة.`,
    ))) return;
    try {
      await deleteSubcontract(subcontract.id);
      select(null);
      void refresh();
    } catch (exception) {
      setDetailError(apiErrorMessage(exception, operationPhrase("Impossible de supprimer le contrat.")));
    }
  }

  function afterChange(subcontract?: Subcontract) {
    if (subcontract) {
      setSelected(subcontract);
      if (subcontract.id !== selectedId) select(subcontract.id);
    } else if (selectedId !== null) {
      void reloadSelected(selectedId);
    }
    void refresh();
  }

  return (
    <main className="equipment-page asset-page">
      <section className="insurance-heading">
        <div>
          <p className="section-label">{operationPhrase("Gestion")}</p>
          <h1>{operationPhrase("Sous-traitance")}</h1>
          <p>{operationPhrase("Contrats, avenants et situations de travaux des sous-traitants, avec le contrôle des factures.")}</p>
        </div>
        <TotalCount value={pagination?.total} label={operationPhrase("Contrats")} loading={loading} />
      </section>
      {error && <div className="form-alert" role="alert">{error}</div>}

      <section className="inventory-panel">
        <div className="filter-bar">
          <SearchField label={operationPhrase("Rechercher")} value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={operationPhrase("Référence, sous-traitant, chantier ou objet")} />
          <div className="filter-toolbar-actions">
            {canManage && <ToolbarIconButton icon="add" label={operationPhrase("Nouveau contrat de sous-traitance")} onClick={() => setEditor({ kind: "subcontract" })} />}
            <ToolbarIconButton icon="refresh" label={operationPhrase("Actualiser")} disabled={loading} onClick={() => void refresh()} />
          </div>
        </div>
        {loading ? <div className="table-state"><LoadingSpinner label={operationPhrase("Chargement des contrats…")} /></div> : subcontracts.length === 0 ? (
          <EmptyState icon="invoice" title={operationPhrase("Aucun contrat de sous-traitance")} description={operationPhrase(canManage ? "Créez le premier contrat avec le bouton +." : "Les contrats apparaîtront ici.")} />
        ) : (
          <DataTable ariaLabel={operationPhrase("Contrats de sous-traitance")}>
            <thead><tr><th>{operationPhrase("Référence")}</th><th>{operationPhrase("Sous-traitant")}</th><th>{operationPhrase("Chantier")}</th><th>{operationPhrase("Montant révisé")}</th><th>{operationPhrase("Avancement")}</th><th>{operationPhrase("À payer")}</th><th>{operationPhrase("Situation en cours")}</th></tr></thead>
            <tbody>
              {subcontracts.map((subcontract) => (
                <tr key={subcontract.id} {...clickableRow(() => select(subcontract.id))}>
                  <td><strong>{subcontract.reference}</strong><span className="secondary-cell">{subcontract.title}</span></td>
                  <td>{subcontract.subcontractor.name}</td>
                  <td>{subcontract.project.name}</td>
                  <td>{money(subcontract.summary.revised_amount, subcontract.currency)}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar"><span style={{ width: `${subcontract.summary.progress_percent}%` }} /></div>
                      <span>{subcontract.summary.progress_percent} %</span>
                    </div>
                  </td>
                  <td>{money(subcontract.summary.to_pay_amount, subcontract.currency)}</td>
                  <td>{subcontract.summary.open_valuation
                    ? <em className={`valuation-status ${subcontract.summary.open_valuation.status}`}>{valuationStatusLabel(subcontract.summary.open_valuation.status)}</em>
                    : <span className="secondary-cell">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        {pagination && <Pagination meta={pagination} disabled={loading} onPageChange={setPage} />}
      </section>

      {selected && !editor && (
        <SubcontractDetails
          subcontract={selected}
          canManage={canManage}
          error={detailError}
          onClose={() => select(null)}
          onEdit={() => setEditor({ kind: "subcontract", subcontract: selected })}
          onDelete={() => void remove(selected)}
          onNewVariation={() => setEditor({ kind: "variation" })}
          onOpenValuation={(valuationId) => setEditor({ kind: "valuation", valuationId })}
          onOpening={() => setEditor({ kind: "opening" })}
        />
      )}

      {editor?.kind === "subcontract" && (
        <SubcontractForm
          subcontract={editor.subcontract}
          projects={projects}
          onClose={() => setEditor(null)}
          onSaved={(subcontract) => { setEditor(null); afterChange(subcontract); }}
        />
      )}
      {editor?.kind === "variation" && selected && (
        <VariationForm
          subcontract={selected}
          onClose={() => setEditor(null)}
          onSaved={(subcontract) => { setEditor(null); afterChange(subcontract); }}
        />
      )}
      {editor?.kind === "opening" && selected && (
        <OpeningForm
          subcontract={selected}
          onClose={() => setEditor(null)}
          onSaved={(opening) => { setEditor({ kind: "valuation", valuationId: opening.id }); afterChange(); }}
        />
      )}
      {editor?.kind === "valuation" && selected && (
        <ValuationPanel
          key={editor.valuationId ?? "new"}
          subcontract={selected}
          valuationId={editor.valuationId}
          canManage={canManage}
          onClose={() => { setEditor(null); afterChange(); }}
          onChanged={() => afterChange()}
        />
      )}
    </main>
  );
}
