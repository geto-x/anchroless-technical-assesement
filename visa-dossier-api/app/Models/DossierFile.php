<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DossierFile extends Model
{
    protected $fillable = [
        'category',
        'original_name',
        'stored_name',
        'path',
        'disk',
        'mime_type',
        'size_bytes',
    ];
}
