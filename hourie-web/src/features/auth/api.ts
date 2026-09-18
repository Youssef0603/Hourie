import {
  apiRequest,
  initializeCsrfProtection,
} from '../../shared/api/http'
import type {
  AuthenticatedUser,
  LoginCredentials,
  Resource,
} from './types'

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const response = await apiRequest<Resource<AuthenticatedUser>>(
    '/api/v1/auth/user',
  )

  return response.data
}

export async function login(
  credentials: LoginCredentials,
): Promise<AuthenticatedUser> {
  await initializeCsrfProtection()

  const response = await apiRequest<Resource<AuthenticatedUser>>(
    '/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(credentials),
    },
  )

  return response.data
}

export async function logout(): Promise<void> {
  await initializeCsrfProtection()

  await apiRequest<void>('/api/v1/auth/logout', {
    method: 'POST',
  })
}
