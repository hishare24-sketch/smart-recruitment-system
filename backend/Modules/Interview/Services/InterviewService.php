<?php

namespace Modules\Interview\Services;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Modules\Interview\Entities\Interview;

class InterviewService
{
    public function list(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return Interview::where('user_id', $userId)->orderByDesc('id')->paginate($perPage);
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
