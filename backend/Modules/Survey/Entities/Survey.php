<?php

namespace Modules\Survey\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\User\Entities\User;

class Survey extends Model
{
    protected $fillable = [
        'user_id', 'title', 'state', 'points_pool', 'targeting', 'questions', 'responses',
    ];

    protected $casts = [
        'points_pool' => 'integer',
        'targeting' => 'array',
        'questions' => 'array',
        'responses' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
