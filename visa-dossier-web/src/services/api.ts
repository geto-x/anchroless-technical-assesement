import type { DossierCategories, DossierFile } from "@/types/dossier";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

const EMPTY_CATEGORIES: DossierCategories = {
  passport: [],
  photos: [],
  forms: [],
};

type LaravelValidationErrors = Record<string, string[] | string>;

interface ApiPayload<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  errors?: LaravelValidationErrors; // Laravel-style validation errors
}

function pickBestErrorMessage(payload: ApiPayload<unknown>, fallback: string): string {
  // 1) Laravel 422 field errors
  const errors = payload.errors;
  if (errors && typeof errors === "object") {
    const firstKey = Object.keys(errors)[0];
    const firstVal = firstKey ? errors[firstKey] : undefined;

    if (Array.isArray(firstVal) && typeof firstVal[0] === "string" && firstVal[0].trim()) {
      return firstVal[0];
    }
    if (typeof firstVal === "string" && firstVal.trim()) {
      return firstVal;
    }
  }

  // 2) Generic API message
  if (payload.message && payload.message.trim()) return payload.message;

  // 3) Alternate field some APIs use
  if (payload.error && payload.error.trim()) return payload.error;

  return fallback;
}

async function parseApiResponse<T>(response: Response): Promise<ApiPayload<T>> {
  const payload = (await response.json().catch(() => ({}))) as ApiPayload<T>;

  if (!response.ok) {
    const message = pickBestErrorMessage(payload, `Request failed (${response.status}).`);
    throw new Error(message);
  }

  return payload;
}

export async function getDossierFiles(): Promise<DossierCategories> {
  const response = await fetch(`${API_BASE_URL}/dossier-files`);
  const payload = await parseApiResponse<{ categories?: Partial<DossierCategories> }>(response);

  return {
    ...EMPTY_CATEGORIES,
    ...(payload.data?.categories ?? {}),
  };
}

export async function uploadDossierFile(formData: FormData): Promise<ApiPayload<DossierFile>> {
  const response = await fetch(`${API_BASE_URL}/dossier-files`, {
    method: "POST",
    body: formData,
  });

  return parseApiResponse<DossierFile>(response);
}

export async function deleteDossierFile(id: string | number): Promise<ApiPayload<null>> {
  const response = await fetch(`${API_BASE_URL}/dossier-files/${id}`, {
    method: "DELETE",
  });

  return parseApiResponse<null>(response);
}

