<?php

namespace Modules\Account\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\User\Entities\User;

class Wallet extends Model
{
    protected $fillable = ['user_id', 'balance', 'transactions'];

    protected $casts = [
        'balance' => 'float',
        'transactions' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
