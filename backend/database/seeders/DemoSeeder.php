<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Modules\Account\Entities\PlatformAccount;
use Modules\Account\Entities\PlatformTransaction;
use Modules\Account\Entities\Wallet;
use Modules\Billing\Entities\Invoice;
use Modules\Interviewer\Entities\Interviewer;
use Modules\Marketplace\Entities\Application;
use Modules\Marketplace\Entities\MarketRequest;
use Modules\Marketplace\Entities\Opportunity;
use Modules\Notification\Entities\Notification;
use Modules\Survey\Entities\Survey;
use Modules\User\Entities\User;
use Spatie\Permission\Models\Role;

/**
 * بذّار المحاكاة الواقعيّة — يملأ المنصّة بحسابات وعمليّات افتراضيّة متماسكة
 * مطابقة لبيانات الواجهة (12 مرشّحًا · منشآت · 10 مقيّمين · خبراء · فرص · طلبات
 * · تقديمات ATS · محافظ · فواتير+خزينة · استبيانات · إشعارات).
 *
 * idempotent (updateOrCreate بمفاتيح طبيعيّة) وإضافيّ — لا يمسح بياناتك الحاليّة.
 * كلمة مرور كلّ الحسابات الافتراضيّة: password123
 */
class DemoSeeder extends Seeder
{
    private const PW = 'password123';

    public function run(): void
    {
        $admin = $this->seedAdmin();
        $companies = $this->seedCompanies();
        $seekers = $this->seedSeekers();
        $this->seedInterviewers();
        $this->seedExperts();

        $opps = $this->seedOpportunities($companies);
        $this->seedRequests($companies);
        $this->seedApplications($seekers, $opps);
        $this->seedWallets(array_merge($seekers, $companies));
        $this->seedBillingAndTreasury($seekers);
        $this->seedSurveys($companies);
        $this->seedNotifications(array_merge($seekers, [$admin]));
    }

    /** يضمن حساب المدير الأعلى (admin_root@test.com / super_admin). */
    private function seedAdmin(): User
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin_root@test.com'],
            ['name' => 'Admin Root', 'password' => self::PW, 'role' => 'seeker', 'kind' => 'individual', 'tier' => 'elite', 'status' => 'active']
        );
        $role = Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first();
        if ($role && ! $admin->hasRole($role)) {
            $admin->assignRole($role);
        }

        return $admin;
    }

    /** منشآت (kind=organization) تملك الفرص والطلبات. */
    private function seedCompanies(): array
    {
        $rows = [
            ['مستقبل التقنية', 'future@tech.test', 'pro'],
            ['شركة الابتكار الرقميّ', 'hr@innovate.test', 'elite'],
            ['مجموعة رواد الأعمال', 'jobs@rowad.test', 'free'],
            ['حلول البيانات الذكيّة', 'careers@smartdata.test', 'pro'],
            ['منصّة نُخبة للتوظيف', 'talent@nukhba.test', 'elite'],
        ];
        $out = [];
        foreach ($rows as $i => [$name, $email, $tier]) {
            $out[] = User::updateOrCreate(
                ['email' => $email],
                ['name' => $name, 'password' => self::PW, 'role' => 'company', 'kind' => 'organization', 'tier' => $tier, 'status' => 'active', 'created_at' => Carbon::now()->subDays(60 - $i * 7)]
            );
        }

        return $out;
    }

    /** الباحثون — الـ12 مرشّحًا من الواجهة (mockCandidates) بباقات متنوّعة. */
    private function seedSeekers(): array
    {
        $rows = [
            ['أحمد المنصور', 'ahmad.mansour', 'elite', 'active'],
            ['سارة العتيبي', 'sara.otaibi', 'pro', 'active'],
            ['خالد الحربي', 'khalid.harbi', 'free', 'active'],
            ['نورة القحطاني', 'noura.qahtani', 'free', 'active'],
            ['محمد الشمري', 'mohammed.shamri', 'pro', 'active'],
            ['ريم الدوسري', 'reem.dosari', 'free', 'active'],
            ['عبدالله الغامدي', 'abdullah.ghamdi', 'elite', 'active'],
            ['لينا سعد', 'lina.saad', 'free', 'active'],
            ['فيصل العنزي', 'faisal.anzi', 'free', 'suspended'],
            ['هند المطيري', 'hind.mutairi', 'free', 'active'],
            ['يوسف البقمي', 'yousef.buqami', 'pro', 'active'],
            ['دانة الفهد', 'dana.fahad', 'elite', 'active'],
        ];
        $out = [];
        foreach ($rows as $i => [$name, $handle, $tier, $status]) {
            $out[] = User::updateOrCreate(
                ['email' => "{$handle}@seeker.test"],
                ['name' => $name, 'password' => self::PW, 'role' => 'seeker', 'kind' => 'individual', 'tier' => $tier, 'status' => $status, 'created_at' => Carbon::now()->subDays(45 - $i * 3)]
            );
        }

        return $out;
    }

    /** المقيّمون المعتمدون — 10 حسابات + سجلّ مقيّم (INTERVIEWERS_SEED). */
    private function seedInterviewers(): void
    {
        $rows = [
            ['م. خالد الشمري', 'تطوير الويب', 4.9, 120],
            ['د. ريم القحطاني', 'الإدارة', 4.8, 200],
            ['أ. سلمى العنزي', 'السلوكي', 4.7, 60],
            ['م. فهد الدوسري', 'البنية التحتية', 4.6, 100],
            ['أ. نورة المطيري', 'التسويق', 4.8, 80],
            ['أ. عبدالله الغامدي', 'المالية', 4.7, 130],
            ['م. ريم الحربي', 'الهندسة والمقاولات', 4.6, 110],
            ['د. سارة الزهراني', 'الصحة والرعاية الطبية', 4.9, 150],
            ['أ. ليان القحطاني', 'التصميم', 4.8, 90],
            ['أ. ماجد العتيبي', 'الموارد البشرية', 4.5, 100],
        ];
        foreach ($rows as $i => [$name, $field, $rating, $price]) {
            $handle = 'interviewer'.($i + 1);
            $user = User::updateOrCreate(
                ['email' => "{$handle}@rec.test"],
                ['name' => $name, 'password' => self::PW, 'role' => 'interviewer', 'kind' => 'individual', 'tier' => 'pro', 'status' => 'active', 'created_at' => Carbon::now()->subDays(50 - $i * 2)]
            );
            Interviewer::updateOrCreate(
                ['user_id' => $user->id],
                ['name' => $name, 'specialty' => $field, 'status' => 'approved', 'rating' => $rating, 'price_from' => $price, 'availability' => ['الأحد', 'الثلاثاء', 'الخميس']]
            );
        }
    }

    /** الخبراء — مرشد/مدرّب/مستشار (MARKET_EXPERTS). */
    private function seedExperts(): void
    {
        $rows = [
            ['أ. هند الزهراني', 'coach', 'elite'],
            ['م. فهد الدوسري الإرشاديّ', 'coach', 'pro'],
            ['م. نوف الشهري', 'trainer', 'pro'],
            ['م. سلطان العمري', 'trainer', 'free'],
            ['د. ريم القحطاني الاستشاريّة', 'consultant', 'elite'],
            ['م. عمر باوزير', 'consultant', 'pro'],
            ['أ. لمى السبيعي', 'coach', 'pro'],
        ];
        foreach ($rows as $i => [$name, $role, $tier]) {
            User::updateOrCreate(
                ['email' => "expert{$i}@rec.test"],
                ['name' => $name, 'password' => self::PW, 'role' => $role, 'kind' => 'individual', 'tier' => $tier, 'status' => 'active', 'created_at' => Carbon::now()->subDays(40 - $i * 2)]
            );
        }
    }

    /** الفرص الوظيفيّة — موزّعة على المنشآت والتصنيفات. */
    private function seedOpportunities(array $companies): array
    {
        $rows = [
            ['مطوّر واجهات أمامية (Vue.js)', 'tech', 'الرياض', '12,000 - 18,000', ['Vue.js', 'TypeScript', 'Vuetify']],
            ['مهندس Full Stack', 'tech', 'جدة', '15,000 - 22,000', ['Vue.js', 'Laravel', 'MySQL']],
            ['مهندس DevOps', 'tech', 'عن بُعد', '18,000 - 25,000', ['Docker', 'AWS', 'CI/CD']],
            ['محلّل بيانات', 'data', 'الرياض', '10,000 - 16,000', ['SQL', 'Python', 'PowerBI']],
            ['عالم بيانات', 'data', 'الخبر', '20,000 - 28,000', ['Python', 'ML', 'TensorFlow']],
            ['مصمّم UI/UX', 'design', 'جدة', '9,000 - 14,000', ['Figma', 'Design Systems']],
            ['مصمّم جرافيك', 'design', 'الرياض', '7,000 - 11,000', ['Illustrator', 'Photoshop']],
            ['أخصّائي تسويق رقميّ', 'marketing', 'الرياض', '8,000 - 13,000', ['SEO', 'Google Ads', 'تحليلات']],
            ['مدير مبيعات', 'sales', 'الدمام', '14,000 - 20,000', ['CRM', 'تفاوض', 'قيادة']],
            ['محاسب أوّل', 'finance', 'الرياض', '11,000 - 16,000', ['SAP', 'تقارير ماليّة', 'IFRS']],
            ['مدير موارد بشريّة', 'hr', 'جدة', '16,000 - 23,000', ['توظيف', 'أداء', 'سياسات']],
            ['مطوّر تطبيقات جوّال', 'tech', 'عن بُعد', '13,000 - 19,000', ['Flutter', 'Kotlin', 'Swift']],
        ];
        $out = [];
        foreach ($rows as $i => [$title, $cat, $loc, $salary, $skills]) {
            $company = $companies[$i % count($companies)];
            $out[] = Opportunity::updateOrCreate(
                ['title' => $title, 'user_id' => $company->id],
                ['company' => $company->name, 'location' => $loc, 'salary' => $salary, 'category' => $cat, 'skills' => $skills, 'created_at' => Carbon::now()->subDays(30 - $i)]
            );
        }

        return $out;
    }

    /** طلبات السوق (أعمال حرّة/مشاريع/استشارات). */
    private function seedRequests(array $companies): void
    {
        $rows = [
            ['project', 'تصميم هويّة بصريّة متكاملة', '8,000 - 12,000', false],
            ['consultation', 'استشارة معماريّة لنظام SaaS', '5,000', true],
            ['job', 'كاتب محتوى تقنيّ (دوام جزئيّ)', '4,000 / شهر', true],
            ['task', 'مراجعة أمنيّة لتطبيق ويب', '3,500', true],
            ['project', 'تطوير متجر إلكترونيّ', '20,000 - 30,000', false],
            ['consultation', 'استشارة تسويق نموّ', '6,000', true],
            ['project', 'لوحة تحكّم تحليلات بيانات', '15,000', true],
            ['task', 'تحسين أداء قاعدة بيانات', '4,500', true],
        ];
        foreach ($rows as $i => [$type, $title, $comp, $remote]) {
            $company = $companies[$i % count($companies)];
            MarketRequest::updateOrCreate(
                ['title' => $title],
                ['user_id' => $company->id, 'type' => $type, 'org' => $company->name, 'state' => ['new', 'open', 'open', 'closed'][$i % 4], 'compensation' => $comp, 'remote' => $remote, 'created_at' => Carbon::now()->subDays(25 - $i)]
            );
        }
    }

    /** التقديمات — الباحثون على الفرص، موزّعة على مراحل ATS. */
    private function seedApplications(array $seekers, array $opps): void
    {
        $stages = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
        foreach ($seekers as $i => $seeker) {
            // كل باحث يتقدّم على 1-3 فرص
            $count = 1 + ($i % 3);
            for ($k = 0; $k < $count; $k++) {
                $opp = $opps[($i + $k) % count($opps)];
                $stage = $stages[($i + $k) % count($stages)];
                Application::updateOrCreate(
                    ['user_id' => $seeker->id, 'opportunity_id' => $opp->id],
                    ['stage' => $stage, 'note' => null, 'stage_changed_at' => Carbon::now()->subDays(($i + $k) % 14)]
                );
            }
        }
    }

    /** المحافظ — رصيد + دفتر عمليّات JSON لكل حساب. */
    private function seedWallets(array $users): void
    {
        foreach ($users as $i => $user) {
            $balance = [0, 250, 480, 1200, 3500, 750][$i % 6];
            $txns = [
                ['id' => 1, 'type' => 'deposit', 'amount' => 500, 'status' => 'completed', 'title' => 'إيداع رصيد', 'at' => Carbon::now()->subDays(20)->toIso8601String(), 'methodLabel' => 'تحويل بنكيّ'],
                ['id' => 2, 'type' => 'earning', 'amount' => 300, 'status' => 'completed', 'title' => 'أرباح جلسة', 'at' => Carbon::now()->subDays(12)->toIso8601String()],
                ['id' => 3, 'type' => 'fee', 'amount' => -20, 'status' => 'completed', 'title' => 'رسوم المنصّة', 'at' => Carbon::now()->subDays(8)->toIso8601String()],
            ];
            Wallet::updateOrCreate(
                ['user_id' => $user->id],
                ['balance' => $balance, 'transactions' => $i % 3 === 0 ? $txns : []]
            );
        }
    }

    /** الفوترة — اشتراكات pro/elite → فواتير مدفوعة + إيراد للخزينة. */
    private function seedBillingAndTreasury(array $seekers): void
    {
        $treasury = PlatformAccount::where('is_default', true)->first() ?? PlatformAccount::first();
        $prices = ['pro' => 99, 'elite' => 299];
        $names = ['pro' => 'الباقة الاحترافيّة', 'elite' => 'الباقة النخبويّة'];
        $revenue = 0;

        foreach ($seekers as $i => $user) {
            if (! isset($prices[$user->tier])) {
                continue;
            }
            $amount = $prices[$user->tier];
            $ref = "INV-DEMO-{$user->id}";
            Invoice::updateOrCreate(
                ['reference' => $ref],
                ['user_id' => $user->id, 'user_name' => $user->name, 'plan_key' => $user->tier, 'plan_name' => $names[$user->tier], 'amount' => $amount, 'status' => 'paid', 'created_at' => Carbon::now()->subDays(15 - $i)]
            );
            if ($treasury) {
                PlatformTransaction::updateOrCreate(
                    ['reference' => $ref],
                    ['platform_account_id' => $treasury->id, 'amount' => $amount, 'type' => 'revenue', 'note' => "اشتراك {$names[$user->tier]} — {$user->name}"]
                );
                $revenue += $amount;
            }
        }

        // إعادة حساب رصيد الخزينة من مجموع حركاتها (idempotent)
        if ($treasury) {
            $treasury->update(['balance' => (float) PlatformTransaction::where('platform_account_id', $treasury->id)->sum('amount')]);
        }
    }

    /** استبيانات مع أسئلة واستجابات. */
    private function seedSurveys(array $companies): void
    {
        $rows = [
            ['استبيان رضا الموظّفين 2026', 'active', 500, 42],
            ['تقييم تجربة المرشّحين', 'active', 300, 28],
            ['استطلاع احتياجات التدريب', 'closed', 200, 15],
        ];
        $questions = [
            ['id' => 1, 'text' => 'ما مدى رضاك عن بيئة العمل؟', 'type' => 'rating', 'scaleMin' => 1, 'scaleMax' => 5],
            ['id' => 2, 'text' => 'هل توصي بالمنصّة لزميل؟', 'type' => 'nps'],
            ['id' => 3, 'text' => 'ما أبرز اقتراح للتحسين؟', 'type' => 'text'],
        ];
        foreach ($rows as $i => [$title, $state, $pool, $respCount]) {
            $responses = [];
            for ($n = 1; $n <= $respCount; $n++) {
                $responses[] = ['id' => $n, 'source' => 'link', 'at' => Carbon::now()->subDays($n % 20)->toIso8601String(), 'durationSec' => 60 + $n, 'completed' => true, 'answers' => ['1' => ($n % 5) + 1, '2' => ($n % 11), '3' => 'ملاحظة تجريبيّة']];
            }
            Survey::updateOrCreate(
                ['title' => $title],
                ['user_id' => $companies[$i % count($companies)]->id, 'state' => $state, 'points_pool' => $pool, 'targeting' => ['audience' => 'all'], 'questions' => $questions, 'responses' => $responses, 'created_at' => Carbon::now()->subDays(20 - $i * 3)]
            );
        }
    }

    /** إشعارات لبعض الحسابات. */
    private function seedNotifications(array $users): void
    {
        $rows = [
            ['mdi-briefcase-check', 'قُبل تقديمك', 'تهانينا! انتقل طلبك إلى مرحلة المقابلة.', 'application', false],
            ['mdi-wallet', 'إيداع ناجح', 'تمّ إيداع 500 ر.س في محفظتك.', 'wallet', true],
            ['mdi-star', 'تقييم جديد', 'حصلت على تقييم 5 نجوم من مقيّم معتمد.', 'review', false],
        ];
        foreach ($users as $ui => $user) {
            foreach ($rows as $ni => [$icon, $title, $body, $cat, $read]) {
                Notification::updateOrCreate(
                    ['user_id' => $user->id, 'title' => $title],
                    ['icon' => $icon, 'body' => $body, 'category' => $cat, 'read' => $read, 'action_to' => null, 'created_at' => Carbon::now()->subDays($ni + 1)]
                );
            }
        }
    }
}
