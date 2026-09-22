import { fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'

type HeadingProps = {
  canAdd: boolean
  title: string
  subtitle: string
  addLabel: string
  showForm: boolean
  onToggle: () => void
  onRefresh?: () => void
}

export function DirectoryHeading({ title, subtitle, canAdd, addLabel, showForm, onToggle, onRefresh }: HeadingProps) {
  return <section className="page-heading"><div><p className="section-label">{fr.directory.management}</p><h1>{title}</h1><p>{subtitle}</p></div><div className="heading-actions">{onRefresh && <button className="table-refresh-button" type="button" onClick={onRefresh}><ActionIcon name="refresh" /><span>{fr.common.refresh}</span></button>}{canAdd && <button className={`primary-button page-action compact-action${showForm ? ' close-action' : ''}`} type="button" onClick={onToggle}><ActionIcon name={showForm ? 'close' : 'add'} /><span>{showForm ? fr.common.close : addLabel}</span></button>}</div></section>
}
