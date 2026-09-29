import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { ActionIcon } from "./ActionIcon";

type DocumentUploadDropzoneProps = {
  title: string;
  description?: string;
  compact?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

export function DocumentUploadDropzone({ title, description = "PDF uniquement · 10 Mo maximum par fichier", compact = false, disabled = false, onFiles }: DocumentUploadDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFiles(files: File[]) {
    if (!disabled && files.length > 0) onFiles(files);
    if (input.current) input.current.value = "";
  }

  function openPicker(event?: KeyboardEvent<HTMLDivElement>) {
    if (event && event.key !== "Enter" && event.key !== " ") return;
    event?.preventDefault();
    if (!disabled) input.current?.click();
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFiles(Array.from(event.dataTransfer.files));
  }

  return <><input ref={input} hidden type="file" accept="application/pdf,.pdf" multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} />
    <div className={`document-upload-dropzone${compact ? " compact" : ""}${isDragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} onClick={() => openPicker()} onKeyDown={openPicker} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={drop}>
      <ActionIcon name="upload" /><strong>{title}</strong><span>{description}</span>
    </div>
  </>;
}
