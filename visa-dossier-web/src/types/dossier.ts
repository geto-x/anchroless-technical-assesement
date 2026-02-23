export const CATEGORY_VALUES = ["passport", "photos", "forms"] as const;

export type DossierCategory = (typeof CATEGORY_VALUES)[number];

export interface DossierFile {
  id: number | string;
  category: DossierCategory | string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  content_url: string;
}

export type DossierCategories = Record<DossierCategory, DossierFile[]>;

export type DossierIntent = "upload" | "delete";

export interface DossierActionData {
  success: boolean;
  message: string;
  intent: DossierIntent;
}

export interface DossierLoaderData {
  categories: DossierCategories;
}

