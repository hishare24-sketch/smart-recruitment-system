<?php

namespace Modules\Quality\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

/**
 * يملأ ذرّات الجودة عبر أمر الاستيراد (مصدر الحقيقة DOC/TEST_CASES.md).
 */
class QualitySeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('quality:import');
    }
}
