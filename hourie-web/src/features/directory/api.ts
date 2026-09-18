import { apiRequest, initializeCsrfProtection } from '../../shared/api/http'
import type { CreateEmployeePayload, CreateSitePayload, Employee, EmployeeDetails, Site, SiteDetails, UpdateEmployeePayload } from './types'

export async function getSites(): Promise<Site[]> {
  return (await apiRequest<{ data: Site[] }>('/api/v1/sites')).data
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

export async function getEmployees(): Promise<Employee[]> {
  return (await apiRequest<{ data: Employee[] }>('/api/v1/employees')).data
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
