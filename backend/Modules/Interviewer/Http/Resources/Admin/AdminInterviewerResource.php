<?php

namespace Modules\Interviewer\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminInterviewerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'specialty' => $this->specialty,
            'status' => $this->status,
            'rating' => (float) $this->rating,
            'price_from' => (float) $this->price_from,
            'account' => optional($this->user)->name,
            'createdAt' => optional($this->created_at)->toISOString(),
        ];
    }
}
