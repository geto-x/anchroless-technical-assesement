<?php

namespace App\Services;

use App\Models\DossierFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileStorageService
{
    public function storeDossierFile(UploadedFile $file, string $category): array
    {
        $disk = config('filesystems.default', 'local');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        // UUID filenames avoid collisions and prevent leaking user-provided names in storage paths.
        $storedName = Str::uuid()->toString().'.'.$extension;
        // Category-based folders keep disk layout predictable for ops/debugging.
        $directory = 'dossier-files/'.$category;
        $path = $file->storeAs($directory, $storedName, $disk);

        return [
            'disk' => $disk,
            'path' => $path,
            'stored_name' => $storedName,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $file->getSize() ?? 0,
        ];
    }

    public function deleteDossierFile(DossierFile $dossierFile): void
    {
        if (Storage::disk($dossierFile->disk)->exists($dossierFile->path)) {
            Storage::disk($dossierFile->disk)->delete($dossierFile->path);
        }
    }
}
