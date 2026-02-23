import type { DossierCategories, DossierFile } from "@/types/dossier";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

const EMPTY_CATEGORIES: DossierCategories = {
  passport: [],
  photos: [],
  forms: [],
};

interface ApiPayload<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

async function parseApiResponse<T>(response: Response): Promise<ApiPayload<T>> {
  const payload = (await response.json().catch(() => ({}))) as ApiPayload<T>;

  if (!response.ok) {
    const message = payload.message || payload.error || "Request failed.";
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

