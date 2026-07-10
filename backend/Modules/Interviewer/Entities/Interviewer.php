<?php

namespace Modules\Interviewer\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\User\Entities\User;

class Interviewer extends Model
{
    protected $fillable = ['user_id', 'name', 'specialty', 'status', 'rating', 'price_from', 'availability'];

    protected $casts = [
        'rating' => 'float',
        'price_from' => 'float',
        'availability' => 'array',
    ];

    /** الحساب المرتبط بالمقيّم (اختياريّ). */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
