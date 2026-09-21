import { useState } from 'react'
import { activeLanguage, fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import type { MaintenanceWarningResponse } from '../types'

type MaintenanceWarningsPanelProps = {
  result: MaintenanceWarningResponse | null
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onPageChange: (page: number) => void
  onOpenEquipment: (id: number) => void
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(activeLanguage === 'ar' ? 'ar' : 'fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function timingLabel(daysUntilDue: number) {
  if (daysUntilDue < 0) return fr.maintenanceWarnings.overdueBy(Math.abs(daysUntilDue))
  if (daysUntilDue === 0) return fr.maintenanceWarnings.dueToday
  return fr.maintenanceWarnings.dueIn(daysUntilDue)
}

export function MaintenanceWarningsPanel({
  result,
  isLoading,
  error,
  onRefresh,
  onPageChange,
  onOpenEquipment,
}: MaintenanceWarningsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <section className={`maintenance-warning-overview${isExpanded ? ' expanded' : ''}`}>
      <header className="maintenance-warning-overview-header">
        <h2>{fr.maintenanceWarnings.title}</h2>
        <div className="maintenance-warning-overview-actions">
          <div className="maintenance-warning-summary" aria-label={fr.maintenanceWarnings.total}>
            <span className="warning-summary-chip overdue"><strong>{result?.summary.overdue ?? '—'}</strong>{fr.maintenanceWarnings.overdue}</span>
            <span className="warning-summary-chip upcoming"><strong>{result?.summary.due_soon ?? '—'}</strong>{fr.maintenanceWarnings.dueSoon}</span>
          </div>
          <button className="table-refresh-button" type="button" onClick={onRefresh} disabled={isLoading} aria-label={fr.common.refresh} title={fr.common.refresh}><ActionIcon name="refresh" /></button>
          <button className="maintenance-warning-toggle" type="button" onClick={() => setIsExpanded((current) => !current)} aria-expanded={isExpanded}>
            <span>{isExpanded ? fr.maintenanceWarnings.hideList : fr.maintenanceWarnings.showList}</span>
            <ActionIcon name={isExpanded ? 'collapse' : 'expand'} />
          </button>
        </div>
      </header>

      {error && <div className="form-alert maintenance-warning-error" role="alert">{error}</div>}

      {isExpanded && <div className="maintenance-warning-panel">
        {isLoading && !result ? (
          <LoadingSpinner className="maintenance-warning-loading" label={fr.common.loading} />
        ) : result?.data.length ? (
          <div className="maintenance-warning-list">
            {result.data.map((warning) => (
              <article className={`maintenance-warning-card ${warning.status}`} key={warning.equipment.id}>
                <div className="maintenance-warning-main">
                  <span className={`maintenance-warning-status ${warning.status}`}>{warning.status === 'overdue' ? fr.maintenanceWarnings.overdue : fr.maintenanceWarnings.dueSoon}</span>
                  <div>
                    <strong>{warning.equipment.asset_code}</strong>
                    <p>{[warning.equipment.brand, warning.equipment.model].filter(Boolean).join(' ') || fr.common.notProvided}</p>
                  </div>
                </div>
                <dl>
                  <div><dt>{fr.maintenanceWarnings.dueDate}</dt><dd>{formatDate(warning.next_maintenance_date)}</dd></div>
                  <div><dt>{fr.maintenanceWarnings.lastMaintenance}</dt><dd>{formatDate(warning.last_maintenance_date)}</dd></div>
                  <div><dt>{fr.equipment.project}</dt><dd>{warning.equipment.current_project_assignment?.project.name ?? fr.common.notAssigned}</dd></div>
                  <div><dt>{fr.equipment.custodian}</dt><dd>{warning.equipment.responsible?.name ?? fr.common.notAssigned}</dd></div>
                </dl>
                <div className="maintenance-warning-action">
                  <strong>{timingLabel(warning.days_until_due)}</strong>
                  <button type="button" onClick={() => onOpenEquipment(warning.equipment.id)}>{fr.maintenanceWarnings.openGenerator}<ActionIcon name="expand" /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="maintenance-warning-empty">{fr.maintenanceWarnings.empty}</p>
        )}

        {result && result.meta.last_page > 1 && (
          <nav className="pagination" aria-label={fr.equipment.pagination}>
            <span>{fr.equipment.results(result.meta.from, result.meta.to, result.meta.total)}</span>
            <div>
              <button type="button" disabled={result.meta.current_page === 1 || isLoading} onClick={() => onPageChange(result.meta.current_page - 1)}>{fr.common.previous}</button>
              <span>{fr.equipment.page(result.meta.current_page, result.meta.last_page)}</span>
              <button type="button" disabled={result.meta.current_page === result.meta.last_page || isLoading} onClick={() => onPageChange(result.meta.current_page + 1)}>{fr.common.next}</button>
            </div>
          </nav>
        )}
      </div>}
    </section>
  )
}
