<?php

namespace Modules\Settings\Entities;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value', 'default_value', 'type', 'group', 'label', 'description', 'options', 'sort'];

    protected $casts = [
        'options' => 'array',
        'sort' => 'integer',
    ];

    /** القيمة مُطبَّعة بحسب النوع. */
    public function typedValue(): mixed
    {
        return $this->castByType($this->value);
    }

    /** القيمة الافتراضيّة مُطبَّعة بحسب النوع. */
    public function typedDefault(): mixed
    {
        return $this->castByType($this->default_value);
    }

    /** هل حادت القيمة عن الافتراضيّ المصنعيّ؟ (مقارنة نصّيّة على القيمة المخزّنة). */
    public function isModified(): bool
    {
        return $this->default_value !== null && (string) $this->value !== (string) $this->default_value;
    }

    private function castByType(mixed $raw): mixed
    {
        return match ($this->type) {
            'boolean' => filter_var($raw, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($raw) ? $raw + 0 : 0,
            default => $raw,
        };
    }
}
