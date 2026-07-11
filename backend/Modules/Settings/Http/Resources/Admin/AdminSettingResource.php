<?php

namespace Modules\Settings\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminSettingResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'key' => $this->key,
            'value' => $this->typedValue(),
            'default' => $this->typedDefault(),
            'modified' => $this->isModified(),
            'type' => $this->type,
            'group' => $this->group,
            'label' => $this->label,
            'description' => $this->description,
            'options' => is_array($this->options) ? $this->options : [],
            'sort' => (int) $this->sort,
        ];
    }
}
