import { useState } from "react";
import { fr, type Language } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";
import { EmptyState } from "../../../shared/components/EmptyState";
import { assetCategoryLabel, isAssetCategoryCode } from "../assetCategories";
import type { Equipment } from "../types";

export function GeneratorTransferHistory({ changes }: { changes: Equipment["changes"] }) {
  const [page, setPage] = useState(0);
  const pageSize = 3;
  const pageCount = Math.max(1, Math.ceil(changes.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleChanges = changes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (changes.length === 0) {
    return (
      <EmptyState
        compact
        icon="transfer"
        title="Aucun transfert enregistré"
        description="Les prochains déplacements de ce groupe apparaîtront ici."
      />
    );
  }

  return (
    <div className="generator-transfer-history">
      {visibleChanges.map((change) => (
        <article key={change.id}>
          <header>
            <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time>
            <span>{change.actor?.name ?? fr.audit.system}</span>
          </header>
          <div className="generator-transfer-route">
            <div><small>Depuis</small><strong>{transferPlace(change.transfer?.from)}</strong></div>
            <ActionIcon name="transfer" />
            <div><small>Vers</small><strong>{transferPlace(change.transfer?.to)}</strong></div>
          </div>
        </article>
      ))}
      {pageCount > 1 && (
        <nav className="transfer-history-pagination" aria-label="Pagination des transferts">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Précédent</button>
          <span>{currentPage + 1} / {pageCount}</span>
          <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Suivant</button>
        </nav>
      )}
    </div>
  );
}

export function EquipmentAuditHistory({
  equipment,
  language,
}: {
  equipment: Equipment;
  language: Language;
}) {
  const changes = equipment.changes.filter((change) => change.source !== "transfer");

  if (changes.length === 0) {
    return (
      <EmptyState
        compact
        icon="history"
        title={fr.audit.empty}
        description="Les modifications de cet actif apparaîtront ici."
      />
    );
  }

  return (
    <div className="audit-list detail-audit-list">
      {changes.map((change) => (
        <article key={change.id}>
          <span className="audit-dot" aria-hidden="true" />
          <div>
            <strong>{equipmentAuditLabel(change.type, equipment.category.code, language)}</strong>
            <p>
              {fr.audit.by(change.actor?.name ?? fr.audit.system)} ·{" "}
              <time dateTime={change.occurred_at}>{auditDate(change.occurred_at)}</time>
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function transferPlace(place: { project: string | null; location: string | null } | undefined): string {
  return place
    ? [place.project, place.location].filter(Boolean).join(" · ") || fr.common.notProvided
    : fr.common.notProvided;
}

function auditDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function equipmentAuditLabel(
  type: Equipment["changes"][number]["type"],
  categoryCode: string,
  language: Language,
): string {
  if (categoryCode === "generator") return fr.audit.equipmentActions[type];

  const category = isAssetCategoryCode(categoryCode)
    ? assetCategoryLabel(categoryCode, language)
    : fr.assets.title;

  if (type === "initial_import") return fr.audit.assetImported(category);
  if (type === "identity_updated") return fr.audit.assetIdentityUpdated(category);
  if (type === "specifications_updated") return fr.audit.assetSpecificationsUpdated(category);
  if (type === "archived") return fr.audit.assetArchived(category);

  return fr.audit.equipmentActions[type];
}
