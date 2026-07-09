<?php

namespace Modules\Account\Http\Resources\Api;

use Illuminate\Http\Resources\Json\JsonResource;

class WalletResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'balance' => (float) $this->balance,
            'transactions' => $this->transactions ?? [],
        ];
    }
}
