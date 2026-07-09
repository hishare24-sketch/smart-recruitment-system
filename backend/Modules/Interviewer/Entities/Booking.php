<?php

namespace Modules\Interviewer\Entities;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = ['user_id', 'interviewer_id', 'day', 'slot', 'type', 'status', 'elements', 'report'];

    protected $casts = [
        'elements' => 'array',
        'report' => 'array',
    ];
}
