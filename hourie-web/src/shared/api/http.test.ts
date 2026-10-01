import { apiRequest, unauthorizedEvent } from './http'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
  })

  it('sends the locale, CSRF token, JSON body, and credentials', async () => {
    window.localStorage.setItem('hourie-language', 'ar')
    document.cookie = 'XSRF-TOKEN=csrf%20token; path=/'
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 1 } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ data: { id: number } }>('/api/v1/example', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    })).resolves.toEqual({ data: { id: 1 } })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = new Headers(init.headers)
    expect(init.credentials).toBe('include')
    expect(headers.get('Accept-Language')).toBe('ar')
    expect(headers.get('X-XSRF-TOKEN')).toBe('csrf token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('emits the session-expired event and exposes validation errors on an unauthorized response', async () => {
    const handler = vi.fn()
    window.addEventListener(unauthorizedEvent, handler)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Session expirée',
      errors: { email: ['Adresse invalide'] },
    }), { status: 401 })))

    await expect(apiRequest('/api/v1/private-data')).rejects.toMatchObject({
      message: 'Session expirée',
      status: 401,
      errors: { email: ['Adresse invalide'] },
    })
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(unauthorizedEvent, handler)
  })
})
