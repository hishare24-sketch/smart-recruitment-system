<?php

namespace Modules\Survey\Services;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Modules\Survey\Entities\Survey;
use Modules\User\Entities\User;

class SurveyService
{
    /** حدّ عدد الاستبيانات لكل باقة — يطابق تمكين الواجهة. */
    private const SURVEY_LIMIT = ['free' => 1, 'pro' => 10, 'elite' => PHP_INT_MAX];

    public function list(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return Survey::where('user_id', $userId)->orderByDesc('id')->paginate($perPage);
    }

    public function create(int $userId, array $data): Survey
    {
        $tier = User::find($userId)?->tier ?? 'free';
        $limit = self::SURVEY_LIMIT[$tier] ?? 1;
        $count = Survey::where('user_id', $userId)->count();

        if ($count >= $limit) {
            abort(403, __('You reached your plan limit (:limit surveys). Upgrade to create more.', ['limit' => $limit]));
        }

        return Survey::create([
            'user_id' => $userId,
            'title' => $data['title'],
            'state' => $data['state'] ?? 'draft',
            'points_pool' => $data['pointsPool'] ?? 0,
            'targeting' => $data['targeting'] ?? [],
            'questions' => $data['questions'] ?? [],
            'responses' => [],
        ]);
    }

    /** إجابة مستبين — تصرف نقطة من مجمّع الاستبيان (إن بقيت). */
    public function addResponse(int $id, array $answer): void
    {
        $survey = Survey::findOr($id, fn () => abort(404, __('Survey not found')));

        $survey->responses = array_merge($survey->responses ?? [], [
            array_merge($answer, ['at' => Carbon::now()->toISOString()]),
        ]);
        if ($survey->points_pool > 0) {
            $survey->points_pool = $survey->points_pool - 1;
        }
        $survey->save();
    }
}
