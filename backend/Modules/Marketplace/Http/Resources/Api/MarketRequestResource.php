<?php

namespace Modules\Marketplace\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class MarketRequestResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'org' => $this->org,
            'state' => $this->state,
            'compensation' => $this->compensation,
            'remote' => (bool) $this->remote,
        ];
    }
}
