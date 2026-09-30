import type { ReactNode } from 'react'
import { ActionIcon } from './ActionIcon'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: Parameters<typeof ActionIcon>[0]['name']
  action?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`empty-state${compact ? ' empty-state-compact' : ''}${className ? ` ${className}` : ''}`} role="status">
      <span className="empty-state-icon"><ActionIcon name={icon} /></span>
      <div className="empty-state-copy">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
