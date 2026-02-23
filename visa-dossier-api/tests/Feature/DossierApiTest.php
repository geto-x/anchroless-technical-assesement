<?php

namespace Tests\Feature;

use App\Models\DossierFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DossierApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_uploads_a_file_and_persists_metadata(): void
    {
        Storage::fake('local');

        $response = $this->post('/api/dossier-files', [
            'category' => 'passport',
            'file' => UploadedFile::fake()->create('passport.pdf', 500, 'application/pdf'),
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('data.category', 'passport')
            ->assertJsonPath('data.original_name', 'passport.pdf');

        $this->assertDatabaseCount('dossier_files', 1);
        $this->assertTrue(Storage::disk('local')->exists(DossierFile::query()->firstOrFail()->path));
    }

    public function test_it_validates_file_type_and_size(): void
    {
        $response = $this->postJson('/api/dossier-files', [
            'category' => 'passport',
            'file' => UploadedFile::fake()->create('script.exe', 500, 'application/octet-stream'),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['file']);

        $tooLargeResponse = $this->postJson('/api/dossier-files', [
            'category' => 'passport',
            'file' => UploadedFile::fake()->create('large.pdf', 5000, 'application/pdf'),
        ]);

        $tooLargeResponse->assertStatus(422)->assertJsonValidationErrors(['file']);
    }

    public function test_it_lists_files_grouped_by_category(): void
    {
        DossierFile::query()->create([
            'category' => 'passport',
            'original_name' => 'passport.pdf',
            'stored_name' => 'uuid-passport.pdf',
            'path' => 'dossier-files/passport/uuid-passport.pdf',
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
        ]);

        DossierFile::query()->create([
            'category' => 'photos',
            'original_name' => 'photo.jpg',
            'stored_name' => 'uuid-photo.jpg',
            'path' => 'dossier-files/photos/uuid-photo.jpg',
            'disk' => 'local',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 2048,
        ]);

        $response = $this->getJson('/api/dossier-files');

        $response
            ->assertOk()
            ->assertJsonPath('data.categories.passport.0.original_name', 'passport.pdf')
            ->assertJsonPath('data.categories.photos.0.original_name', 'photo.jpg')
            ->assertJsonPath('data.categories.forms', []);
    }

    public function test_it_deletes_file_from_storage_and_database(): void
    {
        Storage::fake('local');

        $path = 'dossier-files/forms/delete-me.pdf';
        Storage::disk('local')->put($path, 'stub-content');

        $file = DossierFile::query()->create([
            'category' => 'forms',
            'original_name' => 'delete-me.pdf',
            'stored_name' => 'delete-me.pdf',
            'path' => $path,
            'disk' => 'local',
            'mime_type' => 'application/pdf',
            'size_bytes' => 12,
        ]);

        $response = $this->deleteJson("/api/dossier-files/{$file->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('dossier_files', ['id' => $file->id]);
        $this->assertFalse(Storage::disk('local')->exists($path));
    }
}
