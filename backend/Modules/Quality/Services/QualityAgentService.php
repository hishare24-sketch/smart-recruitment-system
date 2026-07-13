<?php

namespace Modules\Quality\Services;

use Modules\Ai\Entities\AiSetting;
use Modules\Ai\Services\ProviderFactory;
use Modules\Quality\Entities\RuntimeError;

/**
 * الوكيل الذكيّ متعدّد الطبقات (ف6) — راجع DOC/QUALITY_SYSTEM_PLAN.md §3.
 *  - L1 الفرز (Triage): قاعديّ رخيص بلا LLM — يوجّه القسم والإجراء بالطبقة/النوع/الخطورة.
 *  - L2 التشخيص (Diagnose): LLM يحلّل الرسالة/الستاك/المسار ويقترح السبب الجذريّ (fallback استدلاليّ).
 *  - L3 المعالجة (Remediate): يقترح إصلاحًا نصّيًّا **بموافقة بشريّة** — لا تطبيق تلقائيّ للمنطق.
 */
class QualityAgentService
{
    /** L1 — فرز قاعديّ: القسم المقترَح + الإجراء. */
    public function triage(RuntimeError $e): array
    {
        $department = match ($e->type) {
            'api_5xx' => 'backend',
            'api_4xx' => $e->scope === 'admin' ? 'backend' : 'ops',
            'render', 'unhandled', 'console' => 'frontend',
            'slow' => 'ops',
            default => 'triage',
        };
        // الفلاتر/البيانات: إشارات المطابقة/التصفية تُوجَّه لقسم الفلاتر
        if (str_contains(mb_strtolower($e->message), 'filter') || str_contains(mb_strtolower($e->message ?? ''), 'facet')) {
            $department = 'filters';
        }

        $action = match ($e->severity) {
            'critical' => 'escalate',
            'high' => $e->count >= 5 ? 'escalate' : 'diagnose',
            'warning' => 'track',
            default => 'ignore',
        };

        return ['department' => $department, 'action' => $action, 'severity' => $e->severity];
    }

    /**
     * L2/L3 — تشخيص (LLM إن مُفعّل، وإلّا استدلاليّ) + إصلاح مقترح.
     *
     * @return array{rootCause:string,suggestion:string,source:string,confidence:string}
     */
    public function diagnose(RuntimeError $e): array
    {
        $ai = AiSetting::current();
        $aiActive = $ai->enabled && $ai->provider !== 'simulation';
        $provider = $aiActive ? (new ProviderFactory)->for($ai) : null;

        if ($provider === null) {
            return $this->heuristicDiagnosis($e);
        }

        try {
            $result = $provider->generate($this->systemPrompt(), $this->context($e));
            $parsed = json_decode($this->extractJson($result['text'] ?? ''), true);
            if (! is_array($parsed) || ! isset($parsed['rootCause'])) {
                throw new \RuntimeException('diagnose_parse');
            }

            return [
                'rootCause' => mb_substr((string) $parsed['rootCause'], 0, 500),
                'suggestion' => mb_substr((string) ($parsed['suggestion'] ?? ''), 0, 500),
                'source' => $ai->provider,
                'confidence' => in_array($parsed['confidence'] ?? '', ['low', 'medium', 'high'], true) ? $parsed['confidence'] : 'medium',
            ];
        } catch (\Throwable) {
            return $this->heuristicDiagnosis($e, fallback: true);
        }
    }

    /** تشخيص استدلاليّ (بلا LLM) — قواعد نوع الخطأ. */
    private function heuristicDiagnosis(RuntimeError $e, bool $fallback = false): array
    {
        [$root, $fix] = match ($e->type) {
            'api_5xx' => ['خطأ خادم (5xx) على مسار API — استثناء غير معالَج أو عطل تبعيّة (DB/طابور).', 'راجع سجلّ الخادم للمسار، وأضف معالجة استثناء + اختبار fiature يغطّي المسار.'],
            'api_4xx' => ['طلب غير صالح/غير مصرَّح (4xx) — تحقّق مدخلات أو صلاحيّة.', 'أضف تحقّق طلب (FormRequest) واختبار 422/403، وراجع بوّابة الصلاحيّة.'],
            'render' => ['فشل تصيير في الواجهة — قيمة null/undefined أو خاصّية مفقودة.', 'أضف حرّاس اختياريّة (?.)، وحالة تحميل/فارغة، واختبار مكوّن.'],
            'unhandled' => ['استثناء/رفض وعد غير معالَج في الواجهة.', 'لُفّ العمليّة بـtry/catch أو .catch، وأبلغ المستخدم برسالة لطيفة.'],
            'slow' => ['طلب بطيء — استعلام غير مفهرَس أو N+1 أو حمولة كبيرة.', 'أضف فهرسًا/eager-load أو ترقيمًا، وقِس بـtelemetry.'],
            default => ['تحذير وحدة تحكّم — قد يشير لمشكلة كامنة.', 'تتبّع التكرار؛ عالِج المصدر إن تصاعد.'],
        };

        return [
            'rootCause' => $root,
            'suggestion' => $fix,
            'source' => $fallback ? 'heuristic_fallback' : 'heuristic',
            'confidence' => 'low',
        ];
    }

    private function systemPrompt(): string
    {
        return 'أنت مهندس موثوقيّة. حلّل إشارة خطأ وقت-تشغيل وأعِد JSON صالحًا فقط بالشكل: '
            .'{"rootCause":"السبب الجذريّ المرجّح بجملة","suggestion":"إصلاح مقترح عمليّ بجملة","confidence":"low|medium|high"}. '
            .'لا تختلق تفاصيل غير موجودة في السياق، وكن محدّدًا وموجزًا بالعربيّة.';
    }

    private function context(RuntimeError $e): string
    {
        return "type={$e->type}\nseverity={$e->severity}\nlayer={$e->layer}\nroute={$e->route}\ncount={$e->count}\nmessage={$e->message}";
    }

    private function extractJson(string $text): string
    {
        if (preg_match('/\{.*\}/s', $text, $m)) {
            return $m[0];
        }

        return $text;
    }
}
