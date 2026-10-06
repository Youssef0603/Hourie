import { ApiError, apiRequest } from "../../shared/api/http";
import type { AdmissionDocumentType, TemporaryAdmission } from "./types";

const basePath = "/api/v1/temporary-admissions";

export function admissionError(
  caught: unknown,
  fallback = "Une erreur est survenue.",
) {
  return caught instanceof ApiError
    ? (Object.values(caught.errors)[0]?.[0] ?? caught.message)
    : fallback;
}

export async function fetchTemporaryAdmission(id: number) {
  return (await apiRequest<{ data: TemporaryAdmission }>(`${basePath}/${id}`))
    .data;
}

export async function uploadAdmissionDocument(
  id: number,
  type: AdmissionDocumentType,
  file: File,
  documentDate: string | null = null,
) {
  const form = new FormData();
  form.append("document", file);
  form.append("document_type", type);
  if (documentDate) form.append("document_date", documentDate);

  return (
    await apiRequest<{ data: TemporaryAdmission }>(
      `${basePath}/${id}/documents`,
      { method: "POST", body: form },
    )
  ).data;
}
