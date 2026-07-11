<?php

namespace Modules\Governance\Entities;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\User\Entities\User;

class ModerationItem extends Model
{
    protected $fillable = [
        'type', 'subject', 'submitted_by', 'submitter_name', 'target_ref', 'reason',
        'status', 'resolved_by', 'resolver_name', 'resolved_at', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
