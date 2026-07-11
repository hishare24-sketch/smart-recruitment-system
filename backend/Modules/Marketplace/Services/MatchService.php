<?php

namespace Modules\Marketplace\Services;

use Modules\Ai\Entities\AiCapability;
use Modules\Ai\Entities\AiSetting;
use Modules\Marketplace\Entities\MatchSetting;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Profile\Entities\Profile;

/**
 * محرّك المطابقة والفرز — يسجّل ملاءمة مرشّح⟷فرصة بأوزان قابلة للضبط،
 * ويُعزَّز بالذكاء حين تُفعَّل قدرة candidate_matching (موصول بحوكمة الذكاء).
 */
class MatchService
{
    /** هل تعزيز الذكاء مفعّل فعليًّا (حوكمة الذكاء + قدرة المطابقة)؟ */
    public function aiActive(): bool
    {
        $ai = AiSetting::current();
        $cap = AiCapability::where('key', 'candidate_matching')->first();

        return $ai->enabled && ($cap?->enabled ?? false);
    }

    /** درجة ملاءمة مرشّح (ملفّه) لفرصة + تفصيل. */
    public function score(?Profile $profile, Opportunity $opp, MatchSetting $w, bool $aiActive): array
    {
        $candSkills = $this->skillNames($profile?->skills);
        $oppSkills = $this->skillNames($opp->skills);
        $matched = array_values(array_intersect($candSkills, $oppSkills));
        $skillMatch = count($oppSkills) ? count($matched) / count($oppSkills) : 0;

        $expCount = is_array($profile?->experiences) ? count($profile->experiences) : 0;
        $expMatch = min(1, $expCount / 3);

        $interested = data_get($profile?->prefs, 'interestedSectors', []);
        $catMatch = (is_array($interested) && in_array($opp->category, $interested, true)) ? 1 : 0;

        $sum = max(1, $w->skills_weight + $w->experience_weight + $w->category_weight);
        $base = ($skillMatch * $w->skills_weight + $expMatch * $w->experience_weight + $catMatch * $w->category_weight) / $sum * 100;

        $boosted = $aiActive && $w->ai_boost;
        $score = $boosted ? min(100, $base * 1.1) : $base;

        return [
            'score' => round($score, 1),
            'breakdown' => [
                'skills' => (int) round($skillMatch * 100),
                'experience' => (int) round($expMatch * 100),
                'category' => $catMatch * 100,
                'aiBoost' => $boosted,
            ],
            'matchedSkills' => array_map(fn ($s) => $s, $matched),
        ];
    }

    /** تطبيع المهارات إلى مجموعة نصوص صغيرة (يقبل نصوصًا أو كائنات {name}). */
    private function skillNames($skills): array
    {
        if (! is_array($skills)) {
            return [];
        }

        return collect($skills)
            ->map(fn ($s) => is_array($s) ? ($s['name'] ?? '') : (string) $s)
            ->filter()
            ->map(fn ($s) => mb_strtolower(trim($s)))
            ->unique()->values()->all();
    }
}
