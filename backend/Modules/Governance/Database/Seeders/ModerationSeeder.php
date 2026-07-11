<?php

namespace Modules\Governance\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Governance\Entities\ModerationItem;

class ModerationSeeder extends Seeder
{
    /** عناصر مراجعة نموذجيّة (طابور الحوكمة والإشراف). */
    public function run(): void
    {
        $items = [
            ['type' => 'expert_application', 'subject' => 'طلب اعتماد خبير — سلمان الحربي', 'submitter_name' => 'سلمان الحربي', 'target_ref' => 'expert:12', 'reason' => 'خبرة 8 سنوات في علم البيانات', 'status' => 'pending'],
            ['type' => 'expert_application', 'subject' => 'طلب اعتماد خبير — نورة المطيري', 'submitter_name' => 'نورة المطيري', 'target_ref' => 'expert:15', 'reason' => 'استشارية موارد بشرية', 'status' => 'pending'],
            ['type' => 'skill_verification', 'subject' => 'توثيق مهارة — Vue.js (خالد)', 'submitter_name' => 'خالد العتيبي', 'target_ref' => 'skill:88', 'reason' => 'شهادة معتمدة مرفقة', 'status' => 'pending'],
            ['type' => 'skill_verification', 'subject' => 'توثيق مهارة — القيادة (ريم)', 'submitter_name' => 'ريم الدوسري', 'target_ref' => 'skill:91', 'status' => 'pending'],
            ['type' => 'content_report', 'subject' => 'بلاغ عن فرصة مخالفة', 'submitter_name' => 'مستخدم مجهول', 'target_ref' => 'opportunity:5', 'reason' => 'محتوى مضلّل / راتب غير واقعيّ', 'status' => 'pending'],
            ['type' => 'content_report', 'subject' => 'بلاغ عن تعليق مسيء', 'submitter_name' => 'أحمد', 'target_ref' => 'comment:203', 'reason' => 'لغة غير لائقة', 'status' => 'pending'],
            ['type' => 'endorsement', 'subject' => 'تزكية بانتظار الموافقة', 'submitter_name' => 'فهد', 'target_ref' => 'endorsement:33', 'status' => 'pending'],
        ];

        foreach ($items as $item) {
            ModerationItem::firstOrCreate(
                ['type' => $item['type'], 'subject' => $item['subject']],
                $item,
            );
        }
    }
}
