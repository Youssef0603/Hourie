import { apiRequest, initializeCsrfProtection } from '../../shared/api/http'
import type { PaginatedResponse } from '../../shared/api/pagination'
import type { CreateEmployeePayload, CreateSitePayload, Employee, EmployeeDetails, Site, SiteDetails, UpdateEmployeePayload, UpdateSitePayload } from './types'

export async function getSites(page = 1, search = ''): Promise<PaginatedResponse<Site>> {
  const params = new URLSearchParams({ page: String(page) })
  if (search.trim()) params.set('search', search.trim())
  return await apiRequest<PaginatedResponse<Site>>(`/api/v1/sites?${params}`)
}

export async function getSite(id: number): Promise<SiteDetails> {
  return (await apiRequest<{ data: SiteDetails }>(`/api/v1/sites/${id}`)).data
}

export async function createSite(payload: CreateSitePayload): Promise<Site> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: Site }>('/api/v1/sites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })).data
}

export async function updateSite(id: number, payload: UpdateSitePayload): Promise<Site> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: Site }>(`/api/v1/sites/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })).data
}

export async function deleteSite(id: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/sites/${id}`, { method: 'DELETE' })
}

export async function getEmployees(page = 1, filters: Record<string, string> = {}): Promise<PaginatedResponse<Employee>> {
  const params = new URLSearchParams({ page: String(page), ...filters })
  return await apiRequest<PaginatedResponse<Employee>>(`/api/v1/employees?${params}`)
}

export async function getEmployee(id: number): Promise<EmployeeDetails> {
  return (await apiRequest<{ data: EmployeeDetails }>(`/api/v1/employees/${id}`)).data
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: Employee }>('/api/v1/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })).data
}

export async function updateEmployee(id: number, payload: UpdateEmployeePayload): Promise<EmployeeDetails> {
  await initializeCsrfProtection()
  return (await apiRequest<{ data: EmployeeDetails }>(`/api/v1/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })).data
}

export async function deleteEmployee(id: number): Promise<void> {
  await initializeCsrfProtection()
  await apiRequest<void>(`/api/v1/employees/${id}`, { method: 'DELETE' })
}
