<?php

namespace Modules\Settings\Entities;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'label', 'description', 'options', 'sort'];

    protected $casts = [
        'options' => 'array',
        'sort' => 'integer',
    ];

    /** القيمة مُطبَّعة بحسب النوع. */
    public function typedValue(): mixed
    {
        return match ($this->type) {
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($this->value) ? $this->value + 0 : 0,
            default => $this->value,
        };
    }
}
