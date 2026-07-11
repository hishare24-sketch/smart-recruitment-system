<?php

namespace Modules\Settings\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Settings\Entities\PlatformSetting;

class PlatformSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // عامّ
            ['key' => 'general.platform_name', 'value' => 'منظومة التوظيف الذكية', 'type' => 'string', 'group' => 'general', 'label' => 'اسم المنصّة', 'sort' => 0],
            ['key' => 'general.support_email', 'value' => 'support@rec.test', 'type' => 'string', 'group' => 'general', 'label' => 'بريد الدعم', 'sort' => 1],
            ['key' => 'general.default_locale', 'value' => 'ar', 'type' => 'select', 'group' => 'general', 'label' => 'اللغة الافتراضيّة', 'sort' => 2,
                'options' => [['value' => 'ar', 'label' => 'العربيّة'], ['value' => 'en', 'label' => 'English']]],

            // التسجيل
            ['key' => 'registration.allow_signups', 'value' => 'true', 'type' => 'boolean', 'group' => 'registration', 'label' => 'السماح بالتسجيل', 'description' => 'إيقافه يمنع إنشاء حسابات جديدة', 'sort' => 0],
            ['key' => 'registration.default_tier', 'value' => 'free', 'type' => 'select', 'group' => 'registration', 'label' => 'الباقة الافتراضيّة', 'sort' => 1,
                'options' => [['value' => 'free', 'label' => 'الأساسية'], ['value' => 'pro', 'label' => 'الاحترافية'], ['value' => 'elite', 'label' => 'النخبة']]],
            ['key' => 'registration.email_verification', 'value' => 'false', 'type' => 'boolean', 'group' => 'registration', 'label' => 'توثيق البريد إلزاميّ', 'sort' => 2],

            // الماليّة
            ['key' => 'finance.currency', 'value' => 'SAR', 'type' => 'string', 'group' => 'finance', 'label' => 'العملة', 'sort' => 0],
            ['key' => 'finance.welcome_balance', 'value' => '100', 'type' => 'number', 'group' => 'finance', 'label' => 'الرصيد الترحيبيّ', 'description' => 'رصيد محفظة المستخدم عند أوّل دخول', 'sort' => 1],

            // الاستبيانات
            ['key' => 'surveys.default_reward_points', 'value' => '5', 'type' => 'number', 'group' => 'surveys', 'label' => 'نقاط المكافأة الافتراضيّة', 'sort' => 0],
        ];

        foreach ($settings as $s) {
            // الافتراضيّ المصنعيّ = قيمة البذر (يتيح إعادة الضبط وحساب «المُعدَّل»).
            $s['default_value'] = $s['value'];
            // لا نطمس تعديل الأدمن على القيمة عند إعادة البذر — نحدّث الوصف/الافتراضيّ فقط.
            $existing = PlatformSetting::where('key', $s['key'])->first();
            if ($existing !== null) {
                $existing->update([
                    'default_value' => $s['default_value'],
                    'type' => $s['type'],
                    'group' => $s['group'],
                    'label' => $s['label'],
                    'description' => $s['description'] ?? null,
                    'options' => $s['options'] ?? null,
                    'sort' => $s['sort'],
                ]);
            } else {
                PlatformSetting::create($s);
            }
        }
    }
}
