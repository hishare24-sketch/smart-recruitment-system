<?php

namespace Modules\Survey\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminSurveyTemplateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->category,
            'icon' => $this->icon,
            'questions' => is_array($this->questions) ? $this->questions : [],
            'questionsCount' => is_array($this->questions) ? count($this->questions) : 0,
            'is_system' => (bool) $this->is_system,
            'active' => (bool) $this->active,
            'sort' => (int) $this->sort,
        ];
    }
}
