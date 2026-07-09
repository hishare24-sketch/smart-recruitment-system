<?php

namespace Modules\Interview\Services;

use Illuminate\Support\Collection;
use Modules\Interview\Entities\Interview;

class InterviewService
{
    public function list(int $userId): Collection
    {
        return Interview::where('user_id', $userId)->orderByDesc('id')->get();
    }

    public function create(int $userId, array $data): Interview
    {
        return Interview::create([
            'user_id' => $userId,
            'track' => $data['track'],
            'status' => $data['status'] ?? 'scheduled',
            'score' => $data['score'] ?? 0,
            'integrity' => $data['integrity'] ?? [],
        ]);
    }
}
