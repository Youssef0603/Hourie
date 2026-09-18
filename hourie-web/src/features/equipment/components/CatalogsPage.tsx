import { useEffect, useState, type FormEvent } from 'react'
import { activeLanguage, fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'
import { Modal } from '../../../shared/components/Modal'
import { getCatalogOptions, saveCatalogOption } from '../api'
import type { CatalogOption } from '../types'

const groups: CatalogOption['group'][] = ['equipment_condition', 'operational_situation', 'maintenance_type', 'fuel_type', 'project_status']

export function CatalogsPage({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<CatalogOption[]>([])
  const [group, setGroup] = useState<CatalogOption['group']>('equipment_condition')
  const [editing, setEditing] = useState<CatalogOption | null | undefined>()
  const isArabic = activeLanguage === 'ar'

  function refresh() { void getCatalogOptions().then(setItems) }
  useEffect(refresh, [])

  return <main className="directory-page catalog-page"><div className="directory-heading"><div><p className="section-label">{fr.catalogs.section}</p><h1>{fr.catalogs.title}</h1><p>{fr.catalogs.subtitle}</p></div><button className="primary-button compact-action" type="button" onClick={() => setEditing(null)}><ActionIcon name="add" />{fr.catalogs.add}</button></div><div className="catalog-tabs">{groups.map((value) => <button className={group === value ? 'active' : ''} type="button" key={value} onClick={() => setGroup(value)}>{fr.catalogs.groups[value]}</button>)}</div><div className="catalog-list">{items.filter((item) => item.group === group).map((item) => <button type="button" key={item.id} onClick={() => setEditing(item)}><span className="catalog-color" style={{ background: item.color ?? '#9aa1aa' }} /><span className="catalog-copy"><strong>{isArabic ? item.label_ar || item.label_fr : item.label_fr}</strong><small><bdi>{isArabic ? item.label_fr : item.label_ar || '—'}</bdi><span aria-hidden="true"> · </span><bdi>{item.code}</bdi></small></span><span className={`account-status ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? fr.directory.active : fr.directory.inactive}</span><ActionIcon name="edit" /></button>)}</div>{editing !== undefined && <CatalogForm initial={editing} group={group} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); refresh(); onChanged() }} />}</main>
}

function CatalogForm({ initial, group, onClose, onSaved }: { initial: CatalogOption | null; group: CatalogOption['group']; onClose: () => void; onSaved: () => void }) {
  const [code, setCode] = useState(initial?.code ?? '')
  const [labelFr, setLabelFr] = useState(initial?.label_fr ?? '')
  const [labelAr, setLabelAr] = useState(initial?.label_ar ?? '')
  const [color, setColor] = useState(initial?.color ?? '#526070')
  const [active, setActive] = useState(initial?.is_active ?? true)
  async function submit(event: FormEvent) { event.preventDefault(); await saveCatalogOption({ group: initial?.group ?? group, code, label_fr: labelFr, label_ar: labelAr || null, color, sort_order: initial?.sort_order ?? 0, is_active: active }, initial?.id); onSaved() }
  return <Modal title={initial ? fr.catalogs.edit : fr.catalogs.add} onClose={onClose}><form className="catalog-form" onSubmit={submit}><label><span>{fr.catalogs.code}</span><input required pattern="[A-Za-z0-9_-]+" value={code} disabled={Boolean(initial)} onChange={(event) => setCode(event.target.value)} /></label><label className="catalog-color-field"><span>{fr.catalogs.color}</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><label><span>{fr.catalogs.labelFr}</span><input required value={labelFr} onChange={(event) => setLabelFr(event.target.value)} /></label><label><span>{fr.catalogs.labelAr}</span><input dir="rtl" value={labelAr} onChange={(event) => setLabelAr(event.target.value)} /></label><label className="catalog-active"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />{fr.catalogs.enabled}</label><div className="maintenance-form-actions"><button className="primary-button" type="submit">{fr.common.save}</button></div></form></Modal>
}
