<?php

namespace Modules\Interviewer\Entities;

use Illuminate\Database\Eloquent\Model;

class Interviewer extends Model
{
    protected $fillable = ['user_id', 'name', 'specialty', 'rating', 'price_from', 'availability'];

    protected $casts = [
        'rating' => 'float',
        'price_from' => 'float',
        'availability' => 'array',
    ];
}
