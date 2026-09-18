import { fr, type Language } from '../../../i18n/fr'
import { LanguageSwitch } from '../../../shared/components/LanguageSwitch'
import { LoginForm } from '../components/LoginForm'
import type { AuthenticatedUser } from '../types'
import hourieLogo from '../../../assets/hourie-logo.svg'
import './login-page.css'

type LoginPageProps = {
  onAuthenticated: (user: AuthenticatedUser) => void
  connectionError?: string | null
  language: Language
  onToggleLanguage: () => void
}

export function LoginPage({
  onAuthenticated,
  connectionError,
  language,
  onToggleLanguage,
}: LoginPageProps) {
  return (
    <main className="login-page">
      <section className="brand-panel" aria-label={fr.app.name}>
        <div className="brand-lockup">
          <img className="brand-logo" src={hourieLogo} alt={fr.app.companyName} />
        </div>

        <div className="brand-message">
          <p className="brand-kicker">{fr.auth.brandKicker}</p>
          <h1>{fr.auth.brandTitle}</h1>
          <p>{fr.auth.brandDescription}</p>
        </div>

        <p className="brand-footer">{fr.app.companyName}</p>
      </section>

      <section className="form-panel">
        <LanguageSwitch
          className="login-language-switch"
          language={language}
          onToggle={onToggleLanguage}
        />
        <div className="mobile-brand">
          <span className="mobile-logo-frame">
            <img className="brand-logo" src={hourieLogo} alt={fr.app.companyName} />
          </span>
        </div>

        <div className="login-card">
          <header>
            <p className="section-label">{fr.auth.secureArea}</p>
            <h2>{fr.auth.title}</h2>
            <p>{fr.auth.subtitle}</p>
          </header>

          {connectionError && (
            <div className="form-alert" role="alert">
              {connectionError}
            </div>
          )}

          <LoginForm onAuthenticated={onAuthenticated} />
        </div>
      </section>
    </main>
  )
}
