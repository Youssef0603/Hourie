type LoadingSpinnerProps = {
  label: string
  compact?: boolean
  className?: string
}

export function LoadingSpinner({ label, compact = false, className = '' }: LoadingSpinnerProps) {
  return (
    <span className={`loading-indicator${compact ? ' loading-indicator-compact' : ''}${className ? ` ${className}` : ''}`} role="status" aria-label={label} aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
    </span>
  )
}
