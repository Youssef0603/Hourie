import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError, type ValidationErrors } from '../../../shared/api/http'
import { login } from '../api'
import type { AuthenticatedUser } from '../types'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'

type LoginFormProps = {
  onAuthenticated: (user: AuthenticatedUser) => void
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    setIsSubmitting(true)

    try {
      const user = await login({ login: loginIdentifier, password, remember })
      onAuthenticated(user)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors)
        setFormError(
          Object.keys(error.errors).length === 0
            ? fr.auth.genericError
            : null,
        )
      } else {
        setFormError(fr.auth.genericError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const loginError = errors.login?.[0]
  const passwordError = errors.password?.[0]

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="form-alert" role="alert">
          {formError}
        </div>
      )}

      <div className="field-group">
        <label htmlFor="login">{fr.auth.login}</label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          autoFocus
          value={loginIdentifier}
          onChange={(event) => setLoginIdentifier(event.target.value)}
          placeholder={fr.auth.loginPlaceholder}
          aria-invalid={Boolean(loginError)}
          aria-describedby={loginError ? 'login-error' : undefined}
        />
        {loginError && (
          <p className="field-error" id="login-error">
            {loginError}
          </p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="password">{fr.auth.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={fr.auth.passwordPlaceholder}
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? 'password-error' : undefined}
        />
        {passwordError && (
          <p className="field-error" id="password-error">
            {passwordError}
          </p>
        )}
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        <span>{fr.auth.remember}</span>
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoadingSpinner compact label={fr.auth.submitting} /> : fr.auth.submit}
      </button>
    </form>
  )
}
