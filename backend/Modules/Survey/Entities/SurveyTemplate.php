<?php

namespace Modules\Survey\Entities;

use Illuminate\Database\Eloquent\Model;

class SurveyTemplate extends Model
{
    protected $fillable = ['name', 'description', 'category', 'icon', 'questions', 'is_system', 'active', 'sort'];

    protected $casts = [
        'questions' => 'array',
        'is_system' => 'boolean',
        'active' => 'boolean',
        'sort' => 'integer',
    ];
}
