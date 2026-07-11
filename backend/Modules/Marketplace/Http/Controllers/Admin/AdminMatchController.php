<?php

namespace Modules\Marketplace\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\MatchSetting;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Marketplace\Services\MatchService;
use Modules\Profile\Entities\Profile;

/**
 * المطابقة والفرز الذكيّ — قوائم مختصرة مرتّبة بدرجة الملاءمة، بأوزان قابلة للضبط
 * ومعزّزة بالذكاء (موصول بحوكمة الذكاء عبر قدرة candidate_matching).
 */
class AdminMatchController extends Controller
{
    public function __construct(private readonly MatchService $service) {}

    /** أوزان المطابقة + حالة تعزيز الذكاء الحيّة. */
    public function settings()
    {
        $this->authorize('view_matching');

        return $this->dataResponse([
            'settings' => $this->payload(MatchSetting::current()),
            'aiActive' => $this->service->aiActive(),
        ]);
    }

    /** ضبط الأوزان (جزئيّ). */
    public function updateSettings(Request $request)
    {
        $this->authorize('manage_matching');

        $data = $request->validate([
            'skills_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'experience_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'category_weight' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'threshold' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'ai_boost' => ['sometimes', 'boolean'],
        ]);

        $s = MatchSetting::current();
        $s->fill($data)->save();

        return $this->updatedResponse($this->payload($s->fresh()));
    }

    /** قائمة مختصرة مرتّبة بدرجة الملاءمة لمتقدّمي فرصة. */
    public function shortlist(Request $request)
    {
        $this->authorize('view_matching');

        $data = $request->validate(['opportunity_id' => ['required', 'integer']]);
        $opp = Opportunity::findOrFail($data['opportunity_id']);
        $weights = MatchSetting::current();
        $aiActive = $this->service->aiActive();

        $apps = Application::where('opportunity_id', $opp->id)->with('user:id,name,email')->get();
        $profiles = Profile::whereIn('user_id', $apps->pluck('user_id'))->get()->keyBy('user_id');

        $rows = $apps->map(function (Application $a) use ($opp, $weights, $aiActive, $profiles) {
            $scored = $this->service->score($profiles->get($a->user_id), $opp, $weights, $aiActive);

            return [
                'applicationId' => $a->id,
                'candidate' => $a->user?->name ?? '—',
                'stage' => $a->stage,
                'score' => $scored['score'],
                'breakdown' => $scored['breakdown'],
                'matchedSkills' => $scored['matchedSkills'],
            ];
        })->sortByDesc('score')->values();

        return $this->dataResponse([
            'opportunity' => ['id' => $opp->id, 'title' => $opp->title, 'company' => $opp->company, 'skills' => $opp->skills ?? []],
            'aiActive' => $aiActive,
            'threshold' => $weights->threshold,
            'shortlist' => $rows,
        ]);
    }

    private function payload(MatchSetting $s): array
    {
        return [
            'skillsWeight' => $s->skills_weight,
            'experienceWeight' => $s->experience_weight,
            'categoryWeight' => $s->category_weight,
            'threshold' => $s->threshold,
            'aiBoost' => $s->ai_boost,
        ];
    }
}
