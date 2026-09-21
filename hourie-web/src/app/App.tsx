import { useEffect, useState } from 'react'
import { activateLanguage, fr, type Language } from '../i18n/fr'
import { ApiError, unauthorizedEvent } from '../shared/api/http'
import { getCurrentUser, logout } from '../features/auth/api'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { PasswordChangePage } from '../features/auth/pages/PasswordChangePage'
import type { AuthenticatedUser } from '../features/auth/types'
import { EquipmentPage } from '../features/equipment/pages/EquipmentPage'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'

type SessionState =
  | { status: 'checking' }
  | { status: 'guest'; connectionError?: string }
  | { status: 'authenticated'; user: AuthenticatedUser }

function App() {
  const [session, setSession] = useState<SessionState>({ status: 'checking' })
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>(() =>
    window.localStorage.getItem('hourie-language') === 'ar' ? 'ar' : 'fr',
  )

  activateLanguage(language)

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    window.localStorage.setItem('hourie-language', language)
  }, [language])

  useEffect(() => {
    let isCancelled = false

    getCurrentUser()
      .then((user) => {
        if (!isCancelled) {
          setSession({ status: 'authenticated', user })
        }
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        setSession({
          status: 'guest',
          connectionError:
            error instanceof ApiError && error.status === 401
              ? undefined
              : fr.app.connectionError,
        })
      })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setLogoutError(null)
      setSession({ status: 'guest' })
    }

    window.addEventListener(unauthorizedEvent, handleUnauthorized)
    return () => window.removeEventListener(unauthorizedEvent, handleUnauthorized)
  }, [])

  async function handleLogout() {
    setIsLoggingOut(true)
    setLogoutError(null)

    try {
      await logout()
      setSession({ status: 'guest' })
    } catch {
      setLogoutError(fr.auth.logoutError)
    } finally {
      setIsLoggingOut(false)
    }
  }

  function toggleLanguage() {
    setLanguage((current) => current === 'fr' ? 'ar' : 'fr')
  }

  if (session.status === 'checking') {
    return (
      <main className="session-loading" aria-live="polite">
        <LoadingSpinner label={fr.app.loading} />
      </main>
    )
  }

  if (session.status === 'guest') {
    return (
      <LoginPage
        language={language}
        onToggleLanguage={toggleLanguage}
        connectionError={session.connectionError}
        onAuthenticated={(user) =>
          setSession({ status: 'authenticated', user })
        }
      />
    )
  }

  if (session.user.must_change_password) {
    return (
      <PasswordChangePage
        user={session.user}
        language={language}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        onChanged={(user) => setSession({ status: 'authenticated', user })}
        onLogout={handleLogout}
        onToggleLanguage={toggleLanguage}
      />
    )
  }

  return (
    <EquipmentPage
      user={session.user}
      language={language}
      isLoggingOut={isLoggingOut}
      logoutError={logoutError}
      onLogout={handleLogout}
      onToggleLanguage={toggleLanguage}
    />
  )
}

export default App
