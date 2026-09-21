import { fr, type Language } from '../../../i18n/fr'
import hourieLogo from '../../../assets/hourie-logo.svg'
import { LanguageSwitch } from '../../../shared/components/LanguageSwitch'
import { PasswordChangeForm } from '../components/PasswordChangeForm'
import type { AuthenticatedUser } from '../types'
import './login-page.css'

type PasswordChangePageProps = {
  user: AuthenticatedUser
  language: Language
  isLoggingOut: boolean
  logoutError: string | null
  onChanged: (user: AuthenticatedUser) => void
  onLogout: () => void
  onToggleLanguage: () => void
}

export function PasswordChangePage({
  user,
  language,
  isLoggingOut,
  logoutError,
  onChanged,
  onLogout,
  onToggleLanguage,
}: PasswordChangePageProps) {
  return (
    <main className="login-page password-change-page">
      <section className="brand-panel" aria-label={fr.app.name}>
        <div className="brand-lockup">
          <img className="brand-logo" src={hourieLogo} alt={fr.app.companyName} />
        </div>
        <div className="brand-message">
          <p className="brand-kicker">{fr.auth.secureArea}</p>
          <h1>{fr.auth.protectAccount}</h1>
          <p>{fr.auth.changePasswordReason}</p>
        </div>
        <p className="brand-footer">{fr.app.companyName}</p>
      </section>

      <section className="form-panel">
        <LanguageSwitch className="login-language-switch" language={language} onToggle={onToggleLanguage} />
        <div className="mobile-brand">
          <span className="mobile-logo-frame">
            <img className="brand-logo" src={hourieLogo} alt={fr.app.companyName} />
          </span>
        </div>
        <div className="login-card">
          <header>
            <p className="section-label">{user.name}</p>
            <h2>{fr.auth.changePasswordTitle}</h2>
            <p>{fr.auth.changePasswordSubtitle}</p>
          </header>
          {logoutError && <div className="form-alert" role="alert">{logoutError}</div>}
          <PasswordChangeForm onChanged={onChanged} />
          <button className="password-change-logout" type="button" onClick={onLogout} disabled={isLoggingOut}>
            {isLoggingOut ? fr.auth.loggingOut : fr.auth.logout}
          </button>
        </div>
      </section>
    </main>
  )
}
