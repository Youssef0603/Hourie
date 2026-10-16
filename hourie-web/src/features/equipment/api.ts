import { apiRequest, downloadAuthenticatedFile, initializeCsrfProtection } from '../../shared/api/http'
import type {
  Equipment,
  EquipmentFilterOptions,
  EquipmentFilters,
  EquipmentImportResult,
  EquipmentImage,
  EquipmentInvoice,
  EquipmentVehicleDocument,
  EquipmentListResponse,
  CatalogOption,
  EquipmentMaintenance,
  MaintenancePayload,
  MaintenanceWarningResponse,
} from './types'

export async function getEquipment(
  filters: EquipmentFilters,
  withCategoryCounts = false,
): Promise<EquipmentListResponse> {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if ((key === 'asset_field' || key === 'asset_value') && (!filters.asset_field || !filters.asset_value)) {
      return
    }

    if (value !== '') {
      params.set(key, String(value))
    }
  })

  if (withCategoryCounts) {
    params.set('with_category_counts', '1')
  }

  return apiRequest<EquipmentListResponse>(`/api/v1/equipment?${params}`)
}

export async function getAllEquipment(filters: EquipmentFilters): Promise<EquipmentListResponse['data']> {
  const firstPage = await getEquipment({ ...filters, page: 1, per_page: 100 })
  const equipment = [...firstPage.data]

  for (let page = 2; page <= firstPage.meta.last_page; page += 1) {
    const response = await getEquipment({ ...filters, page, per_page: 100 })
    equipment.push(...response.data)
  }

  return equipment
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

export async function removeEquipmentTransfer(
  equipmentId: number,
  changeId: number,
): Promise<Equipment> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: Equipment }>(
    `/api/v1/equipment/${equipmentId}/transfers/${changeId}`,
    { method: 'DELETE' },
  )).data
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

export async function importAssetInventory(file: File): Promise<EquipmentImportResult> {
  await initializeCsrfProtection()
  const form = new FormData()
  form.append('file', file)

  const response = await apiRequest<{ data: EquipmentImportResult }>('/api/v1/asset-imports', {
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

export async function uploadEquipmentVehicleDocument(
  equipmentId: number,
  document: File,
): Promise<EquipmentVehicleDocument> {
  await initializeCsrfProtection()
  const form = new FormData()
  form.append('document', document)

  return (await apiRequest<{ data: EquipmentVehicleDocument }>(`/api/v1/equipment/${equipmentId}/vehicle-documents`, {
    method: 'POST',
    body: form,
  })).data
}

export async function deleteEquipmentVehicleDocument(equipmentId: number, documentId: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/equipment/${equipmentId}/vehicle-documents/${documentId}`, { method: 'DELETE' })
}

export async function downloadEquipmentVehicleDocument(document: EquipmentVehicleDocument): Promise<void> {
  await downloadAuthenticatedFile(document.url, document.original_name)
}

export function previewEquipmentVehicleDocument(document: EquipmentVehicleDocument): boolean {
  const url = new URL(document.url, window.location.origin)
  url.searchParams.set('preview', '1')
  const previewWindow = window.open(url.toString(), '_blank')
  if (previewWindow) previewWindow.opener = null
  return previewWindow !== null
}

export function previewEquipmentInvoice(invoice: EquipmentInvoice): boolean {
  const url = new URL(invoice.url, window.location.origin)
  url.searchParams.set('preview', '1')
  const previewWindow = window.open(url.toString(), '_blank')
  if (previewWindow) previewWindow.opener = null
  return previewWindow !== null
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
