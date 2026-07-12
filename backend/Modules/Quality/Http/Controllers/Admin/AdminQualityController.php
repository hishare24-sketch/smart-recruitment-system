<?php

namespace Modules\Quality\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Quality\Entities\QualitySnapshot;
use Modules\Quality\Entities\TestCase as TestCaseAtom;

/**
 * مركز قيادة الجودة (الأدمن) — قراءة ذرّات حالات الاختبار وإحصاءاتها.
 * تحت /api/admin (auth:sanctum + admin). الصلاحيّة: view_quality.
 */
class AdminQualityController extends Controller
{
    /** بطاقات + توزيعات + اتّجاه التغطية. */
    public function overview()
    {
        $this->authorize('view_quality');

        $total = TestCaseAtom::count();
        $automated = TestCaseAtom::where('status', 'automated')->count();
        $gap = TestCaseAtom::where('status', 'gap')->count();
        $failing = TestCaseAtom::where('status', 'failing')->count();

        return $this->dataResponse([
            'total' => $total,
            'automated' => $automated,
            'gap' => $gap,
            'failing' => $failing,
            'critical' => TestCaseAtom::where('priority', 'critical')->count(),
            'criticalGaps' => TestCaseAtom::where('priority', 'critical')->where('status', 'gap')->count(),
            'coverage' => $total > 0 ? round($automated / $total * 100, 1) : 0.0,
            'byLayer' => $this->countBy('layer'),
            'byType' => $this->countBy('type'),
            'byPriority' => $this->countBy('priority'),
            'byStatus' => $this->countBy('status'),
            'topGapSections' => $this->topGapSections(),
            'series' => $this->series(),
        ]);
    }

    /** قائمة الذرّات مصفّاة/مقسّمة صفحات — يقابل useAdminResource/ResourceScaffold. */
    public function atoms(Request $request)
    {
        $this->authorize('view_quality');

        $query = TestCaseAtom::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q): void {
                $sub->where('case_id', 'like', "%{$q}%")
                    ->orWhere('title', 'like', "%{$q}%")
                    ->orWhere('test_file', 'like', "%{$q}%");
            });
        }

        foreach (['layer', 'section', 'module', 'type', 'priority', 'status'] as $filter) {
            if ($value = $request->query($filter)) {
                $query->where($filter, $value);
            }
        }

        [$column, $direction] = $this->parseSort(
            (string) $request->query('sort', 'case_id'),
            ['case_id', 'layer', 'section', 'module', 'type', 'priority', 'status'],
            'case_id',
        );
        $query->orderBy($column, $direction);

        $page = $query->paginate($this->perPage($request));
        $page->getCollection()->transform(fn (TestCaseAtom $a) => $this->present($a));

        return $this->dashboardResponse($page);
    }

    // ═══ مساعدات ═══

    private function present(TestCaseAtom $a): array
    {
        return [
            'id' => $a->id,
            'caseId' => $a->case_id,
            'title' => $a->title,
            'layer' => $a->layer,
            'section' => $a->section,
            'module' => $a->module,
            'type' => $a->type,
            'priority' => $a->priority,
            'status' => $a->status,
            'lifecycle' => $a->lifecycle,
            'testFile' => $a->test_file,
        ];
    }

    /** @return array<int,array{key:string,count:int}> */
    private function countBy(string $column): array
    {
        return TestCaseAtom::selectRaw("{$column} as k, COUNT(*) as c")
            ->groupBy($column)->orderByDesc('c')->get()
            ->map(fn ($r) => ['key' => (string) ($r->k ?? '—'), 'count' => (int) $r->c])
            ->all();
    }

    /** أعلى الأقسام فجوةً (للتوجيه). */
    private function topGapSections(): array
    {
        return TestCaseAtom::selectRaw('section, layer, COUNT(*) as gaps')
            ->where('status', 'gap')
            ->groupBy('section', 'layer')->orderByDesc('gaps')->limit(8)->get()
            ->map(fn ($r) => ['section' => $r->section, 'layer' => $r->layer, 'gaps' => (int) $r->gaps])
            ->all();
    }

    /** اتّجاه التغطية من اللقطات (آخر 14 لقطة). */
    private function series(): array
    {
        return QualitySnapshot::orderByDesc('captured_on')->limit(14)->get()->reverse()->values()
            ->map(fn (QualitySnapshot $s) => [
                'date' => $s->captured_on->toDateString(),
                'coverage' => $s->total > 0 ? round($s->automated / $s->total * 100, 1) : 0.0,
                'total' => (int) $s->total,
                'automated' => (int) $s->automated,
            ])->all();
    }
}
