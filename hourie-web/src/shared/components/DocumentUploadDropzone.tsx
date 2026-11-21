import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { ActionIcon } from "./ActionIcon";
import { localized, operationPhrase } from "../../i18n/operations";

type DocumentUploadDropzoneProps = {
  title: string;
  description?: string;
  compact?: boolean;
  disabled?: boolean;
  maxSizeMb?: number;
  onFiles: (files: File[]) => void;
};

type FileUploadDropzoneProps = Omit<DocumentUploadDropzoneProps, "maxSizeMb"> & {
  accept: string;
  maxSizeMb: number;
  validateType: (file: File) => string | null;
};

function FileUploadDropzone({ title, description, compact = false, disabled = false, onFiles, accept, maxSizeMb, validateType }: FileUploadDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState("");

  function selectFiles(files: File[]) {
    const typeError = files.map(validateType).find((error) => error !== null);
    const oversized = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (typeError) setValidationError(typeError);
    else if (oversized) setValidationError(localized(`« ${oversized.name} » dépasse la limite de ${maxSizeMb} Mo.`, `«${oversized.name}» يتجاوز الحد المسموح به البالغ ${maxSizeMb} ميغابايت.`));
    else {
      setValidationError("");
      if (!disabled && files.length > 0) onFiles(files);
    }
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

  return <><input ref={input} hidden type="file" accept={accept} multiple onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} />
    <div className={`document-upload-dropzone${compact ? " compact" : ""}${isDragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} onClick={() => openPicker()} onKeyDown={openPicker} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={drop}>
      <ActionIcon name="upload" /><strong>{title}</strong><span>{description}</span>
    </div>
    {validationError && <p className="form-alert" role="alert">{validationError}</p>}
  </>;
}

export function DocumentUploadDropzone(props: DocumentUploadDropzoneProps) {
  const { maxSizeMb = 10, ...dropzoneProps } = props;

  return <FileUploadDropzone
    {...dropzoneProps}
    description={props.description ?? operationPhrase("PDF uniquement · 10 Mo maximum par fichier")}
    accept="application/pdf,.pdf"
    maxSizeMb={maxSizeMb}
    validateType={(file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      ? null
      : localized(`« ${file.name} » n’est pas un fichier PDF.`, `«${file.name}» ليس ملف PDF.`)}
  />;
}

export function ImageUploadDropzone(props: DocumentUploadDropzoneProps) {
  return <FileUploadDropzone
    {...props}
    description={props.description ?? operationPhrase("JPG, PNG ou WebP · 5 Mo maximum par photo")}
    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    maxSizeMb={5}
    validateType={(file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      || /\.(jpe?g|png|webp)$/i.test(file.name)
      ? null
      : localized(`« ${file.name} » n’est pas une image JPG, PNG ou WebP.`, `«${file.name}» ليس صورة بصيغة JPG أو PNG أو WebP.`)}
  />;
}
