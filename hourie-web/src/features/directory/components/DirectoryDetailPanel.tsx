import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { fr } from "../../../i18n/fr";
import { ActionIcon } from "../../../shared/components/ActionIcon";

type DirectoryDetailPanelProps = {
  title: string;
  sectionLabel: string;
  subtitle?: string | null;
  className?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
};

export function DirectoryDetailPanel({
  title,
  sectionLabel,
  subtitle,
  className = "",
  headerActions,
  children,
  onClose,
}: DirectoryDetailPanelProps) {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return createPortal(
    <div
      className="detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className={`detail-panel directory-detail-panel ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="detail-header">
          <div>
            <p className="section-label">{sectionLabel}</p>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="directory-detail-header-actions">
            {headerActions}
            <button
              ref={closeButton}
              type="button"
              aria-label={fr.common.close}
              onClick={onClose}
            >
              <ActionIcon name="close" />
            </button>
          </div>
        </header>
        <div className="detail-content directory-detail-content">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
