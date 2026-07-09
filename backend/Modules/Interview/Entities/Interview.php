<?php

namespace Modules\Interview\Entities;

use Illuminate\Database\Eloquent\Model;

class Interview extends Model
{
    protected $fillable = ['user_id', 'track', 'status', 'score', 'integrity'];

    protected $casts = [
        'score' => 'float',
        'integrity' => 'array',
    ];
}
