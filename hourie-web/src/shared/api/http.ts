export type ValidationErrors = Record<string, string[]>

type ErrorPayload = {
  message?: string
  errors?: ValidationErrors
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: ValidationErrors

  constructor(message: string, status: number, errors: ValidationErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

export async function initializeCsrfProtection(): Promise<void> {
  const response = await fetch('/sanctum/csrf-cookie', {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new ApiError('Unable to initialize CSRF protection.', response.status)
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  headers.set(
    'Accept-Language',
    window.localStorage.getItem('hourie-language') === 'ar' ? 'ar' : 'fr',
  )

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const csrfToken = readCookie('XSRF-TOKEN')
  if (csrfToken) {
    headers.set('X-XSRF-TOKEN', csrfToken)
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json().catch(() => ({}))) as T & ErrorPayload

  if (!response.ok) {
    throw new ApiError(
      payload.message ?? `Request failed with status ${response.status}.`,
      response.status,
      payload.errors,
    )
  }

  return payload
}
