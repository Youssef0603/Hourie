import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError, type ValidationErrors } from '../../../shared/api/http'
import { login } from '../api'
import type { AuthenticatedUser } from '../types'

type LoginFormProps = {
  onAuthenticated: (user: AuthenticatedUser) => void
}

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [email, setEmail] = useState('')
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
      const user = await login({ email, password, remember })
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

  const emailError = errors.email?.[0]
  const passwordError = errors.password?.[0]

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="form-alert" role="alert">
          {formError}
        </div>
      )}

      <div className="field-group">
        <label htmlFor="email">{fr.auth.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={fr.auth.emailPlaceholder}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError && (
          <p className="field-error" id="email-error">
            {emailError}
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
        {isSubmitting ? fr.auth.submitting : fr.auth.submit}
      </button>
    </form>
  )
}
