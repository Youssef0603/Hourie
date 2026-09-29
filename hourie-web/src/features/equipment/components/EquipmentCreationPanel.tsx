import { useEffect, useRef, type ReactNode } from 'react'
import { fr } from '../../../i18n/fr'
import { ActionIcon } from '../../../shared/components/ActionIcon'

type EquipmentCreationPanelProps = {
  eyebrow: string
  title: string
  children: ReactNode
  action?: ReactNode
  onClose: () => void
}

export function EquipmentCreationPanel({ eyebrow, title, children, action, onClose }: EquipmentCreationPanelProps) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return <div className="detail-backdrop creation-backdrop" onMouseDown={onClose}>
    <aside className="detail-panel creation-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <header className="detail-header creation-panel-header">
        <div><p className="section-label">{eyebrow}</p><h2>{title}</h2><p>{fr.assets.creationPanelSubtitle}</p></div>
        <div className="creation-panel-header-actions">
          {action}
          <button className="creation-panel-close" ref={closeButton} type="button" onClick={onClose} aria-label={fr.common.close}><ActionIcon name="close" /></button>
        </div>
      </header>
      <div className="detail-content creation-panel-content">{children}</div>
    </aside>
  </div>
}
