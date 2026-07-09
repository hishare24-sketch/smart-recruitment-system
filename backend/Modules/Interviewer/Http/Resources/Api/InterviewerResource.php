<?php

namespace Modules\Interviewer\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class InterviewerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'specialty' => $this->specialty,
            'rating' => (float) $this->rating,
            'priceFrom' => (float) $this->price_from,
            'availability' => $this->availability ?? [],
        ];
    }
}
