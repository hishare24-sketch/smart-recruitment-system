<?php

namespace Modules\Quality\Services;

/**
 * محلّل سجلّ حالات الاختبار (DOC/TEST_CASES.md) → ذرّات منظّمة.
 *
 * يفهم:
 *  - عناوين المستوى-1 (# …) لتحديد الطبقة: «الباك-إند» → backend، «الواجهة» → frontend.
 *  - عناوين المستوى-2/3 (## / ###) لتحديد القسم (والموديول المشتقّ منه).
 *  - الجداول بأعمدة متغيّرة عبر قراءة صفّ الرأس (header-driven): يحدّد مواقع
 *    الأعمدة (الوصف/النوع/الأولويّة/الحالة/الاختبار) من عناوينها، فيدعم:
 *      · القياسيّ 6-أعمدة (ID·الحالة·نوع·أولويّة·حالة·الاختبار)
 *      · القياسيّ 4-أعمدة (بلا حالة/اختبار ⇒ فجوة)
 *      · جداول الملخّص (ID (النطاق)·الموديول·الحالات·حالة الغالب·الاختبار …)
 *  - تفكيك نطاقات المعرّفات «FE-OPP-01..09» ومركّبات «SYS-001..005 / RT-001..007».
 *  - رموز الأولويّة 🔴/🟠/⚪ والحالة ✅/⬜/❌ (الجزئيّ ⬜+✅ ⇒ فجوة تحفّظًا).
 */
class TestCaseRegistryParser
{
    /** @return array<int,array<string,string|null>> قائمة الذرّات */
    public function parse(string $markdown): array
    {
        $layer = null;
        $section = null;
        $module = null;
        $cols = null;   // خريطة الأعمدة للجدول الجاري
        $atoms = [];

        foreach (preg_split('/\r\n|\r|\n/', $markdown) as $line) {
            $trimmed = trim($line);

            // عنوان مستوى-1 → الطبقة (+ يُنهي أيّ جدول)
            if (preg_match('/^#\s+(.+)$/u', $trimmed, $m)) {
                $layer = $this->detectLayer($m[1]) ?? $layer;
                $cols = null;

                continue;
            }

            // عنوان مستوى-2/3 → القسم + الموديول (+ يُنهي أيّ جدول)
            if (preg_match('/^#{2,3}\s+(.+)$/u', $trimmed, $m)) {
                $section = $this->cleanSection($m[1]);
                $module = $this->deriveModule($section);
                $cols = null;

                continue;
            }

            if ($layer === null || $section === null || ! str_starts_with($trimmed, '|')) {
                continue;
            }

            $cells = array_map('trim', explode('|', trim($trimmed, '|')));

            // صفّ فاصل (---) → تجاهل
            if ($this->isSeparatorRow($cells)) {
                continue;
            }

            // صفّ رأس (يبدأ عموده الأوّل بـ ID) → يبني خريطة الأعمدة ولا يُنتج ذرّة
            if (str_starts_with($cells[0] ?? '', 'ID')) {
                $cols = $this->mapColumns($cells);

                continue;
            }

            // صفّ بيانات — يتطلّب رأسًا سابقًا ومعرّفًا لاتينيًّا
            if ($cols === null || ! preg_match('/^[A-Z]/', $cells[0] ?? '')) {
                continue;
            }

            $title = $cells[$cols['desc']] ?? ($cells[1] ?? '');
            $type = $cols['type'] !== null ? $this->normalizeType($cells[$cols['type']] ?? null) : null;
            $priority = $cols['priority'] !== null ? $this->normalizePriority($cells[$cols['priority']] ?? '') : 'normal';
            $status = $cols['status'] !== null ? $this->normalizeStatus($cells[$cols['status']] ?? '') : 'gap';
            $testFile = $cols['test'] !== null ? $this->cleanTestFile($cells[$cols['test']] ?? '') : null;

            foreach ($this->expandIds($cells[0]) as $id) {
                $atoms[] = [
                    'case_id' => $id,
                    'title' => $title,
                    'layer' => $layer,
                    'section' => $section,
                    'module' => $module,
                    'type' => $type,
                    'priority' => $priority,
                    'status' => $status,
                    'lifecycle' => $status === 'automated' ? 'ongoing' : 'new',
                    'test_file' => $testFile,
                ];
            }
        }

        return $atoms;
    }

    private function detectLayer(string $heading): ?string
    {
        if (mb_strpos($heading, 'الباك') !== false || stripos($heading, 'Backend') !== false) {
            return 'backend';
        }
        if (mb_strpos($heading, 'الواجهة') !== false || stripos($heading, 'Frontend') !== false) {
            return 'frontend';
        }

        return null;
    }

    private function isSeparatorRow(array $cells): bool
    {
        foreach ($cells as $c) {
            if ($c !== '' && ! preg_match('/^:?-{2,}:?$/', $c)) {
                return false;
            }
        }

        return $cells !== [];
    }

    /**
     * يبني خريطة أعمدة من صفّ الرأس. العمود 0 دائمًا المعرّف.
     * التمييز: «الحالة» (بـال) = وصف · «حالة»/«حالة الغالب» = الحالة.
     *
     * @return array{desc:int,type:?int,priority:?int,status:?int,test:?int}
     */
    private function mapColumns(array $header): array
    {
        $map = ['desc' => 1, 'type' => null, 'priority' => null, 'status' => null, 'test' => null];
        $descFound = false;

        foreach ($header as $i => $label) {
            if ($i === 0) {
                continue;
            }
            if ($label === 'نوع') {
                $map['type'] = $i;
            } elseif ($label === 'أولويّة' || $label === 'أولوية') {
                $map['priority'] = $i;
            } elseif ($label === 'الاختبار') {
                $map['test'] = $i;
            } elseif ($label === 'حالة' || str_starts_with($label, 'حالة ')) {
                $map['status'] = $i;   // «حالة» / «حالة الغالب»
            } elseif (! $descFound && ($label === 'الحالة' || str_starts_with($label, 'الحالات'))) {
                $map['desc'] = $i;     // وصف السيناريو / الحالات
                $descFound = true;
            }
        }

        return $map;
    }

    /** «FE-OPP-01..09» و«SYS-001..005 / RT-001..007» → ذرّات مفردة. */
    private function expandIds(string $rawId): array
    {
        $ids = [];
        foreach (preg_split('#\s*[/,]\s*#u', $rawId) as $part) {
            $part = trim($part);
            if ($part === '') {
                continue;
            }
            if (preg_match('/^(?<prefix>.+?)(?<from>\d+)\.\.(?<to>\d+)$/', $part, $m)) {
                $width = strlen($m['from']);
                $from = (int) $m['from'];
                $to = (int) $m['to'];
                if ($to >= $from && ($to - $from) <= 200) {
                    for ($i = $from; $i <= $to; $i++) {
                        $ids[] = $m['prefix'].str_pad((string) $i, $width, '0', STR_PAD_LEFT);
                    }

                    continue;
                }
            }
            $ids[] = $part;
        }

        return $ids !== [] ? $ids : [$rawId];
    }

    private function normalizeType(?string $cell): ?string
    {
        $c = strtoupper(trim((string) $cell));
        foreach (['U', 'F', 'E'] as $t) {
            if (str_contains($c, $t)) {
                return $t;
            }
        }

        return null;
    }

    private function normalizePriority(string $cell): string
    {
        if (str_contains($cell, '🔴')) {
            return 'critical';
        }
        if (str_contains($cell, '🟠')) {
            return 'important';
        }

        return 'normal';
    }

    /** الترتيب: ❌ فاشل ثمّ ⬜ فجوة ثمّ ✅ مؤتمَت — فالجزئيّ (⬜+✅) يُعدّ فجوة تحفّظًا. */
    private function normalizeStatus(string $cell): string
    {
        if (str_contains($cell, '❌')) {
            return 'failing';
        }
        if (str_contains($cell, '⬜')) {
            return 'gap';
        }
        if (str_contains($cell, '✅')) {
            return 'automated';
        }

        return 'gap';
    }

    private function cleanTestFile(string $cell): ?string
    {
        $c = trim($cell);

        return ($c === '' || $c === '—' || $c === '-') ? null : $c;
    }

    private function cleanSection(string $heading): string
    {
        $s = preg_replace('/^[0-9\x{0621}-\x{064A}A-Za-z\-]+\)\s*/u', '', trim($heading));

        return trim($s ?: $heading);
    }

    private function deriveModule(string $section): string
    {
        $module = preg_split('/\s+[—·(]/u', $section)[0] ?? $section;

        return trim($module) ?: $section;
    }
}
