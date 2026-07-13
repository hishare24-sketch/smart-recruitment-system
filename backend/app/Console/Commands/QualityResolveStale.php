<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Modules\Quality\Entities\RuntimeError;

/**
 * الوكيل L1 (ف6) — يُنهي دورة حياة الأخطاء الصامتة: مفتوحة لم تُرَ منذ N ساعة → resolved.
 * تُجدوَل دوريًّا (م5). تشغيل يدويّ: php artisan quality:resolve-stale --hours=48
 */
class QualityResolveStale extends Command
{
    protected $signature = 'quality:resolve-stale {--hours=48 : عتبة الصمت بالساعات}';

    protected $description = 'Auto-resolve runtime errors silent for N hours (agent L1 lifecycle)';

    public function handle(): int
    {
        $hours = max(1, (int) $this->option('hours'));
        $cutoff = Carbon::now()->subHours($hours);

        $count = RuntimeError::open()
            ->where('last_seen_at', '<', $cutoff)
            ->update(['status' => 'resolved']);

        $this->info("حُلّت تلقائيًّا {$count} إشارة صامتة منذ {$hours} ساعة.");

        return self::SUCCESS;
    }
}
