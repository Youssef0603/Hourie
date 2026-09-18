import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { fr } from '../../i18n/fr'
import { ActionIcon } from './ActionIcon'

type ModalProps = {
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'compact' | 'wide'
}

export function Modal({ title, children, onClose, size = 'compact' }: ModalProps) {
  const titleId = useId()
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`modal-panel modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeButton} type="button" onClick={onClose} aria-label={fr.common.close}>
            <ActionIcon name="close" />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>,
    document.body,
  )
}
