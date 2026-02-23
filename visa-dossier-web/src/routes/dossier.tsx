import { FileImage, FileText, SaveIcon, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { FormEvent } from "react";
import type { ActionFunctionArgs } from "react-router-dom";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router-dom";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { deleteDossierFile, getDossierFiles, uploadDossierFile } from "@/services/api";
import type {
  DossierActionData,
  DossierCategories,
  DossierCategory,
  DossierFile,
  DossierIntent,
  DossierLoaderData,
} from "@/types/dossier";

interface CategoryOption {
  value: DossierCategory;
  label: string;
}

/**
 * Keep a single source of truth for category labels.
 * (Options are derived from labels map)
 */
const CATEGORY_LABELS: Record<DossierCategory, string> = {
  passport: "Passport",
  photos: "Photos",
  forms: "Forms",
};

const CATEGORY_OPTIONS: CategoryOption[] = (Object.keys(CATEGORY_LABELS) as DossierCategory[]).map(
  (value) => ({ value, label: CATEGORY_LABELS[value] })
);

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg"]);
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getCategoryLabel(category: unknown): string | null {
  const normalized = normalizeNonEmptyString(category);
  if (!normalized) return null;
  return CATEGORY_LABELS[normalized as DossierCategory] ?? normalized;
}

function buildSuccessMessage(intent: DossierIntent, name: unknown, category: unknown): string {
  const normalizedName = normalizeNonEmptyString(name);
  const normalizedCategory = getCategoryLabel(category);

  if (!normalizedName) {
    return intent === "delete" ? "File deleted successfully." : "File uploaded successfully.";
  }

  if (!normalizedCategory) {
    return intent === "delete"
      ? `File "${normalizedName}" deleted successfully.`
      : `File "${normalizedName}" uploaded successfully.`;
  }

  return intent === "delete"
    ? `File "${normalizedName}" deleted successfully from "${normalizedCategory}" folder.`
    : `File "${normalizedName}" uploaded successfully to "${normalizedCategory}" folder.`;
}

export async function dossierLoader(): Promise<DossierLoaderData> {
  const categories = await getDossierFiles();
  return { categories };
}

export async function dossierAction({ request }: ActionFunctionArgs): Promise<DossierActionData> {
  // Keep write operations in the route action so Router reloads fresh data after each mutation.
  const formData = await request.formData();
  const intent: DossierIntent = formData.get("intent") === "delete" ? "delete" : "upload";

  try {
    if (intent === "delete") {
      const id = normalizeNonEmptyString(formData.get("id"));

      if (!id) {
        return { success: false, message: "Missing file id.", intent: "delete" };
      }

      await deleteDossierFile(id);

      return {
        success: true,
        message: buildSuccessMessage("delete", formData.get("original_name"), formData.get("category")),
        intent: "delete",
      };
    }

    const uploadResponse = await uploadDossierFile(formData);

    return {
      success: true,
      message: buildSuccessMessage(
        "upload",
        uploadResponse.data?.original_name ?? null,
        uploadResponse.data?.category ?? null
      ),
      intent: "upload",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Request failed.",
      intent,
    };
  }
}

function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return "--";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(extension) || ALLOWED_MIME_TYPES.has(file.type);
}

function clearInputFile(input: HTMLInputElement | null): void {
  if (input) input.value = "";
}

function getSubmittingMeta(navigation: ReturnType<typeof useNavigation>) {
  // Capture current submission metadata once to keep render checks simple.
  const fd = navigation.formData;
  return {
    isSubmitting: navigation.state === "submitting",
    intent: fd?.get("intent"),
    id: fd?.get("id"),
  };
}

export function DossierPage() {
  const { categories } = useLoaderData() as DossierLoaderData;
  const actionData = useActionData() as DossierActionData | undefined;
  const navigation = useNavigation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<DossierCategory>("passport");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [localError, setLocalError] = useState("");

  const { isSubmitting, intent: submittingIntent, id: submittingId } = getSubmittingMeta(navigation);

  const totalCount = useMemo(() => {
    const cats = categories as DossierCategories;
    return Object.values(cats).reduce((sum, files) => sum + files.length, 0);
  }, [categories]);

  useEffect(() => {
    if (!actionData?.message) return;

    // One toast entry point for upload/delete success and API errors.
    const toastVariant = actionData.success
      ? actionData.intent === "delete"
        ? "warning"
        : "success"
      : "destructive";

    toast({
      variant: toastVariant,
      title: actionData.success ? "Success" : "Request failed",
      description: actionData.message,
    });

    if (actionData.success && actionData.intent === "upload") {
      setSelectedFileName("");
      setLocalError("");
      clearInputFile(fileInputRef.current);
    }
  }, [actionData]);

  const applySelectedFile = useCallback((file?: File): void => {
    if (!file) return;

    if (!isAllowedFile(file)) {
      setLocalError("Invalid file type. Please upload PDF, PNG, or JPG.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError("File is too large. Maximum size is 4MB.");
      return;
    }

    // Keep the selected file inside the hidden <input> so the <Form> submit stays native.
    const transfer = new DataTransfer();
    transfer.items.add(file);

    if (fileInputRef.current) {
      fileInputRef.current.files = transfer.files;
    }

    setLocalError("");
    setSelectedFileName(file.name);
  }, []);

  const clearSelectedTempFile = useCallback((): void => {
    setSelectedFileName("");
    setLocalError("");
    clearInputFile(fileInputRef.current);
  }, []);

  const handleDeleteSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>, name: string, category: string): void => {
      const dossierLabel = getCategoryLabel(category) ?? category;
      // Guardrail for destructive action before request is sent.
      if (!window.confirm(`Delete "${name}" from the "${dossierLabel}" dossier?`)) {
        event.preventDefault();
      }
    },
    []
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-cyan-300/40 blur-3xl animate-float" />
        <div className="absolute -right-16 top-24 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl animate-sway" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/35 blur-3xl animate-float" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.8),rgba(236,246,252,0.4),rgba(224,244,241,0.35))]" />
      </div>

      <div className="mx-auto max-w-[96rem] p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-2 rounded-2xl border border-white/40 bg-gradient-to-r from-sky-900 via-sky-800 to-cyan-700 p-6 text-white shadow-soft md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visa Dossier Upload</h1>
            <p className="mt-2 text-sm text-sky-100">Upload, preview, and manage required applicant files.</p>
          </div>
          <span className="w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {totalCount} file(s) uploaded
          </span>
        </header>

        <Card className="mb-6 border-white/70 bg-white/90 backdrop-blur">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Choose a category and use the file picker.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" encType="multipart/form-data" className="space-y-4">
              <input type="hidden" name="intent" value="upload" />
              <input type="hidden" name="category" value={selectedCategory} />

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value as DossierCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem value={category.value} key={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">File</label>
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/45 p-6 text-center">
                  <UploadCloud className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Select a file to upload</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG up to 4MB</p>

                  <ActionButton
                    type="button"
                    tone="accent"
                    icon={UploadCloud}
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select file
                  </ActionButton>

                  <Input
                    ref={fileInputRef}
                    name="file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    required
                    className="sr-only"
                    onChange={(event) => applySelectedFile(event.target.files?.[0])}
                  />

                  {selectedFileName ? (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2">
                      <p className="truncate text-xs text-foreground">{selectedFileName}</p>
                      <ActionButton
                        type="button"
                        tone="destructive"
                        icon={Trash2}
                        onClick={clearSelectedTempFile}
                        disabled={isSubmitting}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  ) : null}
                </div>
              </div>

              <ActionButton type="submit" tone="success" icon={SaveIcon} disabled={isSubmitting}>
                {isSubmitting && submittingIntent !== "delete" ? "Uploading..." : "Upload"}
              </ActionButton>
            </Form>

            <p className="mt-3 text-xs text-muted-foreground">Allowed: PDF, PNG, JPG. Max size: 4MB.</p>

            {localError ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {localError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-3">
          {CATEGORY_OPTIONS.map((category) => {
            const files = (categories as DossierCategories)[category.value] ?? [];

            return (
              <Card key={category.value} className="h-fit border-white/70 bg-white/90 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{category.label}</CardTitle>
                  <CardDescription>{files.length} file(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  {files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files uploaded.</p>
                  ) : (
                    <ul className="space-y-3">
                      {files.map((file: DossierFile) => {
                        const isDeleting =
                          isSubmitting &&
                          submittingIntent === "delete" &&
                          `${submittingId}` === `${file.id}`;

                        const isImage = file.mime_type?.startsWith("image/");

                        return (
                          <li
                            className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-md border bg-card p-2 min-[1440px]:grid-cols-[72px_1fr_auto]"
                            key={file.id}
                          >
                            <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/50">
                              {isImage ? (
                                <img
                                  src={file.content_url}
                                  alt={file.original_name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <a
                                  href={file.content_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <FileText className="mx-auto h-5 w-5" />
                                  <span className="sr-only">{file.original_name}</span>
                                </a>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{file.original_name}</p>
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                {isImage ? <FileImage className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                <span>{formatFileSize(file.size_bytes)}</span>
                              </div>
                            </div>

                            <Form
                              method="post"
                              onSubmit={(event) => handleDeleteSubmit(event, file.original_name, file.category)}
                              className="col-span-2 min-[1440px]:col-span-1"
                            >
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="id" value={file.id} />
                              <input type="hidden" name="original_name" value={file.original_name} />
                              <input type="hidden" name="category" value={file.category} />
                              <ActionButton
                                type="submit"
                                tone="destructive"
                                icon={Trash2}
                                disabled={isDeleting}
                                aria-label={`Delete ${file.original_name}`}
                                className="w-full min-[1440px]:w-auto"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </ActionButton>
                            </Form>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>
    </main>
  );
}

