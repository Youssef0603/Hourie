import type { Language } from '../../i18n/fr'

type LanguageSwitchProps = {
  language: Language
  onToggle: () => void
  className?: string
}

export function LanguageSwitch({
  language,
  onToggle,
  className = '',
}: LanguageSwitchProps) {
  const isArabic = language === 'ar'

  return (
    <button
      className={`language-switch ${className}`.trim()}
      type="button"
      role="switch"
      aria-checked={isArabic}
      aria-label="Français / العربية"
      onClick={onToggle}
      dir="ltr"
    >
      <span className={!isArabic ? 'active' : ''}>FR</span>
      <span className="language-switch-track" aria-hidden="true">
        <span className="language-switch-thumb" />
      </span>
      <span className={isArabic ? 'active' : ''}>AR</span>
    </button>
  )
}
