<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadDossierFileRequest;
use App\Models\DossierFile;
use App\Services\FileStorageService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DossierController extends Controller
{
    private const CATEGORIES = ['passport', 'photos', 'forms'];

    public function __construct(private readonly FileStorageService $storageService)
    {
    }

    public function index(): JsonResponse
    {
        $files = DossierFile::query()->latest()->get();
        // Pre-seed expected categories so frontend can render stable groups even when empty.
        $grouped = array_fill_keys(self::CATEGORIES, []);

        foreach ($files as $file) {
            if (! array_key_exists($file->category, $grouped)) {
                $grouped[$file->category] = [];
            }

            $grouped[$file->category][] = $this->toArray($file);
        }

        return response()->json([
            'data' => [
                'categories' => $grouped,
            ],
        ]);
    }

    public function store(UploadDossierFileRequest $request): JsonResponse
    {
        $stored = $this->storageService->storeDossierFile(
            file: $request->file('file'),
            category: $request->string('category')->toString(),
        );

        $dossierFile = DossierFile::query()->create([
            'category' => $request->string('category')->toString(),
            'original_name' => $stored['original_name'],
            'stored_name' => $stored['stored_name'],
            'path' => $stored['path'],
            'disk' => $stored['disk'],
            'mime_type' => $stored['mime_type'],
            'size_bytes' => $stored['size_bytes'],
        ]);

        return response()->json([
            'message' => 'File uploaded successfully.',
            'data' => $this->toArray($dossierFile),
        ], 201);
    }

    public function show(DossierFile $dossierFile): StreamedResponse
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk($dossierFile->disk);

        abort_unless($disk->exists($dossierFile->path), 404, 'File not found.');

        // Stream file content from the configured disk; files stay private (no public symlink required).
        return $disk->response(
            $dossierFile->path,
            $dossierFile->original_name,
            ['Content-Type' => $dossierFile->mime_type],
        );
    }

    public function destroy(DossierFile $dossierFile): JsonResponse
    {
        $this->storageService->deleteDossierFile($dossierFile);
        $dossierFile->delete();

        return response()->json([
            'message' => 'File deleted successfully.',
        ]);
    }

    private function toArray(DossierFile $dossierFile): array
    {
        return [
            'id' => $dossierFile->id,
            'category' => $dossierFile->category,
            'original_name' => $dossierFile->original_name,
            'mime_type' => $dossierFile->mime_type,
            'size_bytes' => $dossierFile->size_bytes,
            'created_at' => $dossierFile->created_at?->toISOString(),
            'content_url' => route('dossier-files.show', ['dossierFile' => $dossierFile]),
        ];
    }
}
