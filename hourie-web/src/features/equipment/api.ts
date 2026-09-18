import { apiRequest, initializeCsrfProtection } from '../../shared/api/http'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentListResponse,
  EquipmentMaintenance,
  MaintenancePayload,
} from './types'

export async function getEquipment(
  filters: EquipmentFilters,
): Promise<EquipmentListResponse> {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '') {
      params.set(key, String(value))
    }
  })

  return apiRequest<EquipmentListResponse>(`/api/v1/equipment?${params}`)
}

export async function saveMaintenance(
  equipmentId: number,
  payload: MaintenancePayload,
  maintenanceId?: number,
): Promise<EquipmentMaintenance> {
  await initializeCsrfProtection()
  const path = maintenanceId
    ? `/api/v1/equipment/${equipmentId}/maintenances/${maintenanceId}`
    : `/api/v1/equipment/${equipmentId}/maintenances`
  const response = await apiRequest<{ data: EquipmentMaintenance }>(path, {
    method: maintenanceId ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  })

  return response.data
}

export async function deleteMaintenance(
  equipmentId: number,
  maintenanceId: number,
): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(
    `/api/v1/equipment/${equipmentId}/maintenances/${maintenanceId}`,
    { method: 'DELETE' },
  )
}

export async function getEquipmentItem(id: number): Promise<Equipment> {
  const response = await apiRequest<{ data: Equipment }>(
    `/api/v1/equipment/${id}`,
  )

  return response.data
}

export async function saveEquipment(
  id: number,
  payload: Record<string, unknown>,
): Promise<Equipment> {
  await initializeCsrfProtection()
  const response = await apiRequest<{ data: Equipment }>(
    `/api/v1/equipment/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function createEquipment(
  payload: Record<string, unknown>,
): Promise<Equipment> {
  await initializeCsrfProtection()
  const response = await apiRequest<{ data: Equipment }>('/api/v1/equipment', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response.data
}

export async function getEquipmentFilterOptions(): Promise<EquipmentFilterOptions> {
  const response = await apiRequest<{ data: EquipmentFilterOptions }>(
    '/api/v1/equipment-filter-options',
  )

  return response.data
}
