<?php

namespace Modules\User\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class AuthUserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'tier' => $this->tier,
            'phone' => $this->phone,
            'created_at' => optional($this->created_at)->toISOString(),
        ];
    }
}
