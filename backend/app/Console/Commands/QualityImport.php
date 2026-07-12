<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Quality\Entities\QualitySnapshot;
use Modules\Quality\Entities\TestCase as TestCaseAtom;
use Modules\Quality\Services\TestCaseRegistryParser;

/**
 * يستورد سجلّ حالات الاختبار (DOC/TEST_CASES.md) إلى جدول test_cases (upsert idempotent)
 * ويكتب لقطة تغطية اليوم. مصدر الحقيقة للوحة مركز قيادة الجودة.
 */
class QualityImport extends Command
{
    protected $signature = 'quality:import {--path= : مسار ملفّ Markdown (افتراضيّ ../DOC/TEST_CASES.md)}';

    protected $description = 'Import the test-case registry (TEST_CASES.md) into the quality atoms table';

    public function handle(TestCaseRegistryParser $parser): int
    {
        $path = $this->option('path') ?: base_path('../DOC/TEST_CASES.md');

        if (! is_file($path)) {
            $this->error("ملفّ السجلّ غير موجود: {$path}");

            return self::FAILURE;
        }

        $atoms = $parser->parse((string) file_get_contents($path));

        if ($atoms === []) {
            $this->warn('لم يُعثر على أيّ حالات في الملفّ.');

            return self::FAILURE;
        }

        $seen = [];
        DB::transaction(function () use ($atoms, &$seen): void {
            foreach ($atoms as $atom) {
                TestCaseAtom::updateOrCreate(['case_id' => $atom['case_id']], $atom);
                $seen[] = $atom['case_id'];
            }
            // إزالة الذرّات التي لم تعد في السجلّ (حذف/إعادة تسمية)
            TestCaseAtom::whereNotIn('case_id', $seen)->delete();
        });

        $this->writeSnapshot();

        $this->renderSummary(count($seen));

        return self::SUCCESS;
    }

    /** لقطة تغطية اليوم (صفّ واحد لكلّ يوم — upsert). */
    private function writeSnapshot(): void
    {
        $byLayer = TestCaseAtom::selectRaw("layer, COUNT(*) total, SUM(CASE WHEN status='automated' THEN 1 ELSE 0 END) automated")
            ->groupBy('layer')->get()
            ->mapWithKeys(fn ($r) => [$r->layer => ['total' => (int) $r->total, 'automated' => (int) $r->automated]])
            ->all();

        // لقطة واحدة لكلّ يوم — نحذف لقطة اليوم ثمّ نُنشئ (whereDate محايد لقاعدة البيانات،
        // بخلاف مطابقة عمود date عبر updateOrCreate التي تختلف بين MySQL وSQLite).
        $today = Carbon::now()->toDateString();
        QualitySnapshot::whereDate('captured_on', $today)->delete();
        QualitySnapshot::create([
            'captured_on' => $today,
            'total' => TestCaseAtom::count(),
            'automated' => TestCaseAtom::where('status', 'automated')->count(),
            'gap' => TestCaseAtom::where('status', 'gap')->count(),
            'failing' => TestCaseAtom::where('status', 'failing')->count(),
            'by_layer' => $byLayer,
        ]);
    }

    private function renderSummary(int $count): void
    {
        $automated = TestCaseAtom::where('status', 'automated')->count();
        $gap = TestCaseAtom::where('status', 'gap')->count();
        $coverage = $count > 0 ? round($automated / $count * 100, 1) : 0.0;

        $this->info("استُوردت {$count} ذرّة · مؤتمَت {$automated} · فجوات {$gap} · التغطية {$coverage}%");
    }
}
