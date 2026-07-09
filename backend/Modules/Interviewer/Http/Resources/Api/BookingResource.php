<?php

namespace Modules\Interviewer\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'interviewerId' => $this->interviewer_id,
            'day' => $this->day,
            'slot' => $this->slot,
            'type' => $this->type,
            'status' => $this->status,
            'elements' => $this->elements ?? [],
            'report' => $this->report,
        ];
    }
}
