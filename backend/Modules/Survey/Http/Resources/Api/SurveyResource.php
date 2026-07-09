<?php

namespace Modules\Survey\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class SurveyResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'state' => $this->state,
            'pointsPool' => (int) $this->points_pool,
            'targeting' => $this->targeting ?: (object) [],
            'questions' => $this->questions ?? [],
        ];
    }
}
