import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError } from '../../../shared/api/http'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { SearchableSelect } from '../../../shared/components/SearchableSelect'
import { transferEquipment } from '../api'
import type { Equipment, EquipmentFilterOptions } from '../types'

export function GeneratorTransferForm({ equipment, options, onTransferred }: {
  equipment: Equipment
  options: EquipmentFilterOptions
  onTransferred: (equipment: Equipment) => void
}) {
  const currentProjectId = equipment.current_project_assignment?.project.id ?? null
  const currentProjectName = equipment.current_project_assignment?.project.name ?? fr.common.notAssigned
  const [destinationProjectId, setDestinationProjectId] = useState('')
  const [destinationLocationId, setDestinationLocationId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const destinationProjects = options.projects.filter((project) => project.id !== currentProjectId)
  const destinationLocations = useMemo(() => options.locations.filter((location) => (
    location.parent_id !== null && String(location.project_id) === destinationProjectId
  )), [destinationProjectId, options.locations])

  useEffect(() => {
    if (destinationLocations.length === 1) {
      setDestinationLocationId(String(destinationLocations[0].id))
      return
    }

    if (!destinationLocations.some((location) => String(location.id) === destinationLocationId)) {
      setDestinationLocationId('')
    }
  }, [destinationLocationId, destinationLocations])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (destinationProjectId === '' || destinationLocationId === '') return
    setIsSaving(true)
    setError(null)

    try {
      onTransferred(await transferEquipment(equipment.id, {
        from_project_id: currentProjectId,
        to_project_id: Number(destinationProjectId),
        to_location_id: Number(destinationLocationId),
      }))
    } catch (caught) {
      setError(caught instanceof ApiError
        ? Object.values(caught.errors)[0]?.[0] ?? fr.equipment.transferError
        : fr.equipment.transferError)
    } finally {
      setIsSaving(false)
    }
  }

  return <form className="maintenance-form generator-transfer-form" onSubmit={submit}>
    {error && <div className="form-alert" role="alert">{error}</div>}
    <div className="maintenance-form-grid">
      <label><span>{fr.equipment.transferFrom}</span><SearchableSelect ariaLabel={fr.equipment.transferFrom} value={currentProjectId === null ? '' : String(currentProjectId)} onChange={() => undefined} placeholder={currentProjectName} includeEmpty={currentProjectId === null} options={currentProjectId === null ? [] : [{ value: String(currentProjectId), label: currentProjectName }]} searchable={false} disabled /></label>
      <label><span>{fr.equipment.transferTo}</span><SearchableSelect ariaLabel={fr.equipment.transferTo} value={destinationProjectId} onChange={(value) => { setDestinationProjectId(value); setDestinationLocationId('') }} placeholder={fr.equipment.selectDestination} includeEmpty={false} options={destinationProjects.map((project) => ({ value: String(project.id), label: project.name }))} /></label>
      <label><span>{fr.equipment.destinationLocation}</span><SearchableSelect ariaLabel={fr.equipment.destinationLocation} value={destinationLocationId} onChange={setDestinationLocationId} placeholder={fr.common.notProvided} required disabled={destinationProjectId === ''} options={destinationLocations.map((location) => ({ value: String(location.id), label: location.name }))} /></label>
    </div>
    <div className="maintenance-form-actions"><button className="primary-button save-button" type="submit" disabled={isSaving || destinationProjectId === '' || destinationLocationId === ''}>{isSaving ? <LoadingSpinner compact label={fr.common.saving} /> : fr.equipment.confirmTransfer}</button></div>
  </form>
}
