<?php

namespace Modules\Compliance\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\Opportunity;
use Modules\User\Entities\User;

/**
 * بيانات عدالة تجريبيّة — تقديمات موزّعة على قطاعات/باقات مع نتائج متفاوتة،
 * مُهندَسة لإظهار أثر تمييزيّ حسب باقة المرشّح (تنبيه قاعدة الأربعة أخماس).
 */
class ComplianceDemoSeeder extends Seeder
{
    public function run(): void
    {
        $categories = ['tech', 'data', 'design', 'sales'];
        $opps = [];
        foreach ($categories as $i => $cat) {
            $opps[$cat] = Opportunity::updateOrCreate(
                ['title' => "فرصة امتثال ({$cat})"],
                ['company' => 'منشأة تجريبيّة', 'category' => $cat, 'location' => 'الرياض', 'skills' => []]
            )->id;
        }

        // [الباقة, عدد المتقدّمين, عدد المُوظَّفين] — free منخفض التوظيف (أثر تمييزيّ)
        $plan = [
            ['free', 8, 1],
            ['pro', 5, 3],
            ['elite', 5, 3],
        ];

        $catIdx = 0;
        foreach ($plan as [$tier, $count, $hired]) {
            for ($n = 1; $n <= $count; $n++) {
                $email = "cmp-{$tier}-{$n}@rec.test";
                $user = User::updateOrCreate(
                    ['email' => $email],
                    ['name' => "مرشّح {$tier} {$n}", 'password' => bcrypt('secret123'), 'role' => 'seeker', 'tier' => $tier]
                );

                $stage = $n <= $hired ? 'hired' : ($n === $count ? 'rejected' : ['screening', 'interview', 'applied', 'offer'][$n % 4]);
                $oppId = $opps[$categories[$catIdx % count($categories)]];
                $catIdx++;

                Application::updateOrCreate(
                    ['user_id' => $user->id, 'opportunity_id' => $oppId],
                    ['stage' => $stage]
                );
            }
        }
    }
}
