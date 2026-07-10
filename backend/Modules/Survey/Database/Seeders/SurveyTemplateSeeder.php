<?php

namespace Modules\Survey\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Survey\Entities\SurveyTemplate;

class SurveyTemplateSeeder extends Seeder
{
    /** مكتبة نماذج نظاميّة — أنماط جاهزة يشتقّ منها المستخدمون استبياناتهم. */
    public function run(): void
    {
        $templates = [
            [
                'name' => 'رضا العملاء (CSAT)', 'category' => 'satisfaction', 'icon' => 'mdi-emoticon-happy-outline',
                'description' => 'قياس رضا العملاء عن الخدمة',
                'questions' => [
                    ['text' => 'ما مدى رضاك عن الخدمة؟', 'type' => 'rating'],
                    ['text' => 'ما الذي يمكن تحسينه؟', 'type' => 'longtext'],
                ],
            ],
            [
                'name' => 'صافي المروّجين (NPS)', 'category' => 'nps', 'icon' => 'mdi-speedometer',
                'description' => 'قياس ولاء العملاء واحتمال التوصية',
                'questions' => [
                    ['text' => 'ما مدى احتمال أن توصي بنا لصديق؟', 'type' => 'nps'],
                    ['text' => 'ما سبب تقييمك؟', 'type' => 'longtext'],
                ],
            ],
            [
                'name' => 'تغذية راجعة للموظّفين', 'category' => 'feedback', 'icon' => 'mdi-comment-account-outline',
                'description' => 'استطلاع رأي داخليّ للفريق',
                'questions' => [
                    ['text' => 'كيف تقيّم بيئة العمل؟', 'type' => 'scale', 'scaleMin' => 'سيّئة', 'scaleMax' => 'ممتازة'],
                    ['text' => 'ما أولويّاتك للتطوير؟', 'type' => 'ranking', 'options' => ['الرواتب', 'المرونة', 'النموّ المهنيّ', 'القيادة']],
                ],
            ],
            [
                'name' => 'تصويت سريع', 'category' => 'poll', 'icon' => 'mdi-poll',
                'description' => 'سؤال واحد لاستطلاع رأي عاجل',
                'questions' => [
                    ['text' => 'أيّ خيار تفضّل؟', 'type' => 'single', 'options' => ['الخيار أ', 'الخيار ب', 'الخيار ج']],
                ],
            ],
            [
                'name' => 'تقييم مهارات', 'category' => 'assessment', 'icon' => 'mdi-clipboard-check-outline',
                'description' => 'تقييم ذاتيّ لمستوى المهارات',
                'questions' => [
                    ['text' => 'قيّم مستواك في المهارات التالية', 'type' => 'matrix', 'rows' => ['التواصل', 'القيادة', 'التقنية']],
                    ['text' => 'مهارة تودّ تطويرها', 'type' => 'text'],
                ],
            ],
        ];

        foreach ($templates as $i => $tpl) {
            SurveyTemplate::updateOrCreate(
                ['name' => $tpl['name']],
                array_merge($tpl, ['is_system' => true, 'active' => true, 'sort' => $i]),
            );
        }
    }
}
