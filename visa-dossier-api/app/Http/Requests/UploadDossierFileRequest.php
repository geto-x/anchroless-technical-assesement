<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadDossierFileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Keep categories constrained so grouped API output remains predictable for the UI.
            'category' => ['required', 'in:passport,photos,forms'],
            'file' => ['required', 'file', 'mimes:pdf,png,jpg,jpeg', 'max:4096'],
        ];
    }
}
