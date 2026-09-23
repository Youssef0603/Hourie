import { apiRequest, downloadAuthenticatedFile, initializeCsrfProtection } from '../../shared/api/http'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentImportResult,
  EquipmentImage,
  EquipmentInvoice,
  EquipmentListResponse,
  CatalogOption,
  EquipmentMaintenance,
  MaintenancePayload,
  MaintenanceWarningResponse,
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

export async function getCatalogOptions(): Promise<CatalogOption[]> {
  return (await apiRequest<{ data: CatalogOption[] }>('/api/v1/catalog-options')).data
}

export async function saveCatalogOption(payload: Omit<CatalogOption, 'id'>, id?: number): Promise<CatalogOption> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: CatalogOption }>(id ? `/api/v1/catalog-options/${id}` : '/api/v1/catalog-options', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(payload),
  })).data
}

export async function deleteCatalogOption(id: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/catalog-options/${id}`, { method: 'DELETE' })
}

export async function deleteEquipment(id: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/equipment/${id}`, { method: 'DELETE' })
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

export async function transferEquipment(
  id: number,
  payload: { from_project_id: number | null; to_project_id: number; to_location_id: number },
): Promise<Equipment> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: Equipment }>(`/api/v1/equipment/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })).data
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

export async function importEquipment(file: File): Promise<EquipmentImportResult> {
  await initializeCsrfProtection()
  const form = new FormData()
  form.append('file', file)

  const response = await apiRequest<{ data: EquipmentImportResult }>('/api/v1/equipment-imports', {
    method: 'POST',
    body: form,
  })

  return response.data
}

export async function uploadEquipmentImages(equipmentId: number, files: File[]): Promise<EquipmentImage[]> {
  await initializeCsrfProtection()
  const form = new FormData()
  files.forEach((file) => form.append('images[]', file))

  return (await apiRequest<{ data: EquipmentImage[] }>(`/api/v1/equipment/${equipmentId}/images`, {
    method: 'POST',
    body: form,
  })).data
}

export async function deleteEquipmentImage(equipmentId: number, imageId: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/equipment/${equipmentId}/images/${imageId}`, { method: 'DELETE' })
}

export async function uploadEquipmentInvoices(equipmentId: number, files: File[]): Promise<EquipmentInvoice[]> {
  await initializeCsrfProtection()
  const form = new FormData()
  files.forEach((file) => form.append('invoices[]', file))

  return (await apiRequest<{ data: EquipmentInvoice[] }>(`/api/v1/equipment/${equipmentId}/invoices`, {
    method: 'POST',
    body: form,
  })).data
}

export async function deleteEquipmentInvoice(equipmentId: number, invoiceId: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/equipment/${equipmentId}/invoices/${invoiceId}`, { method: 'DELETE' })
}

export async function downloadEquipmentInvoice(invoice: EquipmentInvoice): Promise<void> {
  await downloadAuthenticatedFile(invoice.url, invoice.original_name)
}

export async function getEquipmentFilterOptions(): Promise<EquipmentFilterOptions> {
  const response = await apiRequest<{ data: EquipmentFilterOptions }>(
    '/api/v1/equipment-filter-options',
  )

  return response.data
}

export async function getMaintenanceWarnings(page = 1): Promise<MaintenanceWarningResponse> {
  return apiRequest<MaintenanceWarningResponse>(`/api/v1/maintenance-warnings?page=${page}`)
}
