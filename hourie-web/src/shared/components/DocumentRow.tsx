import { useState, type ReactNode } from "react";
import { fr } from "../../i18n/fr";
import { operationPhrase } from "../../i18n/operations";
import { downloadDocument, openDocument } from "../documents";
import { ActionIcon } from "./ActionIcon";
import { LoadingSpinner } from "./LoadingSpinner";

type DocumentRowProps = {
  /** Server path of the file, e.g. document.url. */
  url: string;
  name: string;
  /** Name of the downloaded file when it differs from the displayed name. */
  fileName?: string;
  meta?: ReactNode;
  onDelete?: () => void;
  deleting?: boolean;
  disabled?: boolean;
  /** Show the download icon (default). */
  showDownload?: boolean;
  /** Called with a message when the document cannot be opened or downloaded. */
  onError?: (message: string) => void;
};

/**
 * One stored PDF in a detail panel: click the row to open it in a new tab,
 * use the icon to download it, and optionally delete it.
 */
export function DocumentRow({ url, name, fileName, meta, onDelete, deleting = false, disabled = false, showDownload = true, onError }: DocumentRowProps) {
  const [downloading, setDownloading] = useState(false);

  function open() {
    if (!openDocument(url)) onError?.(operationPhrase("Impossible d’ouvrir le document. Autorisez les fenêtres pop-up pour ce site."));
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadDocument(url, fileName ?? name);
    } catch {
      onError?.(operationPhrase("Impossible de télécharger le document."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="document-row">
      <button className="document-row-open" type="button" title={fr.common.openDocument} disabled={disabled} onClick={open}>
        <span className="invoice-pdf-badge">PDF</span>
        <span className="document-row-text">
          <strong title={name}>{name}</strong>
          {meta && <small>{meta}</small>}
        </span>
      </button>
      {showDownload && <button
        className="document-row-action"
        type="button"
        aria-label={`${fr.common.download} ${name}`}
        title={fr.common.download}
        disabled={downloading}
        onClick={() => void download()}
      >
        {downloading ? <LoadingSpinner compact label={fr.common.loading} /> : <ActionIcon name="download" />}
      </button>}
      {onDelete && (
        <button
          className="document-row-action danger"
          type="button"
          aria-label={`${fr.common.delete} ${name}`}
          title={fr.common.delete}
          disabled={deleting}
          onClick={onDelete}
        >
          {deleting ? <LoadingSpinner compact label={fr.common.loading} /> : <ActionIcon name="delete" />}
        </button>
      )}
    </article>
  );
}
