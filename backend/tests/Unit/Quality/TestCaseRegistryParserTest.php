<?php

namespace Tests\Unit\Quality;

use Modules\Quality\Services\TestCaseRegistryParser;
use PHPUnit\Framework\TestCase;

class TestCaseRegistryParserTest extends TestCase
{
    private function parse(string $md): array
    {
        return (new TestCaseRegistryParser)->parse($md);
    }

    public function test_parses_six_column_rows_with_layer_section_status(): void
    {
        $md = <<<'MD'
        # الباك-إند (Backend)
        ### User (المصادقة)
        | ID | الحالة | نوع | أولويّة | حالة | الاختبار |
        |----|--------|-----|--------|------|----------|
        | AUTH-01 | دخول صحيح → 200 | F | 🔴 | ✅ | AuthTest |
        | AUTH-07 | register بلا اسم → 422 | F | 🔴 | ⬜ | AuthTest |
        MD;

        $atoms = $this->parse($md);

        $this->assertCount(2, $atoms);
        $this->assertSame('AUTH-01', $atoms[0]['case_id']);
        $this->assertSame('backend', $atoms[0]['layer']);
        $this->assertSame('User (المصادقة)', $atoms[0]['section']);
        $this->assertSame('User', $atoms[0]['module']);
        $this->assertSame('F', $atoms[0]['type']);
        $this->assertSame('critical', $atoms[0]['priority']);
        $this->assertSame('automated', $atoms[0]['status']);
        $this->assertSame('AuthTest', $atoms[0]['test_file']);
        // الصفّ الثاني فجوة
        $this->assertSame('gap', $atoms[1]['status']);
    }

    public function test_four_column_rows_default_to_gap_and_no_test_file(): void
    {
        $md = <<<'MD'
        # الواجهة (Frontend)
        ### الصفحات (E)
        | ID | الحالة | نوع | أولويّة |
        |----|--------|-----|--------|
        | FE-DASH-01 | لوحة المستخدم | E | 🟠 |
        MD;

        $atoms = $this->parse($md);

        $this->assertCount(1, $atoms);
        $this->assertSame('frontend', $atoms[0]['layer']);
        $this->assertSame('E', $atoms[0]['type']);
        $this->assertSame('important', $atoms[0]['priority']);
        $this->assertSame('gap', $atoms[0]['status']);
        $this->assertNull($atoms[0]['test_file']);
    }

    public function test_expands_id_ranges_into_individual_atoms(): void
    {
        $md = <<<'MD'
        # الواجهة (Frontend)
        ### الصفحات (E)
        | ID | الحالة | نوع | أولويّة |
        |----|--------|-----|--------|
        | FE-OPP-01..09 | OpportunitiesPage: شبكة · فاسِتات · فرز | E | 🔴🟠 |
        MD;

        $atoms = $this->parse($md);

        $this->assertCount(9, $atoms);
        $this->assertSame('FE-OPP-01', $atoms[0]['case_id']);
        $this->assertSame('FE-OPP-09', $atoms[8]['case_id']);
        // أولويّة أعلى رمز (🔴) تفوز
        $this->assertSame('critical', $atoms[0]['priority']);
    }

    public function test_summary_schema_and_compound_range_expansion(): void
    {
        // جدول ملخّص بأعمدة مختلفة: ID(النطاق) · الموديول · الحالات · حالة الغالب · الاختبار
        $md = <<<'MD'
        # الباك-إند (Backend)
        ### System/Realtime
        | ID (النطاق) | الموديول | الحالات | حالة الغالب | الاختبار |
        |----|--------|-----|--------|------|
        | SYS-001..003 / RT-001..002 | System | health · قنوات | ✅ أساس · ⬜ مفقود | HealthTest / RTTest |
        MD;

        $atoms = $this->parse($md);

        // 3 (SYS) + 2 (RT) = 5 ذرّات
        $this->assertCount(5, $atoms);
        $ids = array_column($atoms, 'case_id');
        $this->assertSame(['SYS-001', 'SYS-002', 'SYS-003', 'RT-001', 'RT-002'], $ids);
        // الوصف من عمود «الحالات»، والاختبار من العمود الصحيح
        $this->assertSame('health · قنوات', $atoms[0]['title']);
        $this->assertSame('HealthTest / RTTest', $atoms[0]['test_file']);
        // حالة الغالب مختلطة (⬜+✅) ⇒ فجوة تحفّظًا
        $this->assertSame('gap', $atoms[0]['status']);
        // بلا عمود نوع/أولويّة ⇒ افتراضات
        $this->assertNull($atoms[0]['type']);
        $this->assertSame('normal', $atoms[0]['priority']);
    }

    public function test_ignores_header_separator_and_non_table_lines(): void
    {
        $md = <<<'MD'
        # الباك-إند (Backend)
        نصّ عاديّ خارج الجدول.
        ### Account (المحفظة)
        | ID | الحالة | نوع | أولويّة | حالة | الاختبار |
        |----|--------|-----|--------|------|----------|
        | ACCT-01 | رصيد ترحيبيّ | F | 🟠 | ✅ | AccountTest |
        MD;

        $atoms = $this->parse($md);

        // صفّ بيانات واحد فقط (لا الرأس ولا الفاصل ولا النصّ العاديّ)
        $this->assertCount(1, $atoms);
        $this->assertSame('ACCT-01', $atoms[0]['case_id']);
    }
}
