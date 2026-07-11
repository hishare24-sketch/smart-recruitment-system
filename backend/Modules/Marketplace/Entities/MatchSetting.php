<?php

namespace Modules\Marketplace\Entities;

use Illuminate\Database\Eloquent\Model;

class MatchSetting extends Model
{
    protected $fillable = ['skills_weight', 'experience_weight', 'category_weight', 'threshold', 'ai_boost'];

    protected $casts = [
        'skills_weight' => 'integer',
        'experience_weight' => 'integer',
        'category_weight' => 'integer',
        'threshold' => 'integer',
        'ai_boost' => 'boolean',
    ];

    public static function current(): self
    {
        $s = static::query()->first();
        if ($s === null) {
            $s = static::create([]);
            $s->refresh();
        }

        return $s;
    }
}
