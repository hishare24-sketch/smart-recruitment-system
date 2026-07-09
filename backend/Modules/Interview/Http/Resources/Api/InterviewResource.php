<?php

namespace Modules\Interview\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class InterviewResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'track' => $this->track,
            'status' => $this->status,
            'score' => (float) $this->score,
            'integrity' => $this->integrity ?: (object) [],
        ];
    }
}
