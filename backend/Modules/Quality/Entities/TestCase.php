<?php

namespace Modules\Quality\Entities;

use Illuminate\Database\Eloquent\Model;

/**
 * ذرّة اختبار — حالة واحدة من سجلّ TEST_CASES.md.
 * أصغر وحدة جودة قابلة للتتبّع في مركز قيادة الجودة.
 */
class TestCase extends Model
{
    protected $table = 'test_cases';

    protected $fillable = [
        'case_id', 'title', 'layer', 'section', 'module',
        'type', 'priority', 'status', 'lifecycle', 'test_file',
    ];
}
