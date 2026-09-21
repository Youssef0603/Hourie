import { useState, type FormEvent } from 'react'
import { fr } from '../../../i18n/fr'
import { ApiError, type ValidationErrors } from '../../../shared/api/http'
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner'
import { changePassword } from '../api'
import type { AuthenticatedUser } from '../types'

type PasswordChangeFormProps = {
  onChanged: (user: AuthenticatedUser) => void
}

export function PasswordChangeForm({ onChanged }: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError(null)
    setIsSubmitting(true)

    try {
      const user = await changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      })
      onChanged(user)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors)
        setFormError(Object.keys(error.errors).length === 0 ? fr.auth.changePasswordError : null)
      } else {
        setFormError(fr.auth.changePasswordError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentPasswordError = errors.current_password?.[0]
  const passwordError = errors.password?.[0]
  const confirmationError = errors.password_confirmation?.[0]

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {formError && <div className="form-alert" role="alert">{formError}</div>}

      <div className="field-group">
        <label htmlFor="current-password">{fr.auth.currentPassword}</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          aria-invalid={Boolean(currentPasswordError)}
          aria-describedby={currentPasswordError ? 'current-password-error' : undefined}
        />
        {currentPasswordError && <p className="field-error" id="current-password-error">{currentPasswordError}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="new-password">{fr.auth.newPassword}</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? 'new-password-error' : undefined}
        />
        {passwordError && <p className="field-error" id="new-password-error">{passwordError}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="password-confirmation">{fr.auth.confirmNewPassword}</label>
        <input
          id="password-confirmation"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          aria-invalid={Boolean(confirmationError)}
          aria-describedby={confirmationError ? 'password-confirmation-error' : undefined}
        />
        {confirmationError && <p className="field-error" id="password-confirmation-error">{confirmationError}</p>}
      </div>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoadingSpinner compact label={fr.auth.changingPassword} /> : fr.auth.changePassword}
      </button>
    </form>
  )
}
