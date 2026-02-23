<?php

use App\Http\Controllers\Api\DossierController;
use Illuminate\Support\Facades\Route;

Route::prefix('dossier-files')->group(function (): void {
    Route::get('/', [DossierController::class, 'index'])->name('dossier-files.index');
    Route::post('/', [DossierController::class, 'store'])->name('dossier-files.store');
    Route::get('/{dossierFile}', [DossierController::class, 'show'])->name('dossier-files.show');
    Route::delete('/{dossierFile}', [DossierController::class, 'destroy'])->name('dossier-files.destroy');
});
