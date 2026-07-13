<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // الوكيل L2/L3 (ف6): تشخيص مقترح + إصلاح مقترح (بموافقة بشريّة، لا تطبيق تلقائيّ).
        Schema::table('runtime_errors', function (Blueprint $table): void {
            $table->json('diagnosis')->nullable()->after('meta'); // {rootCause,suggestion,source,confidence}
            $table->timestamp('diagnosed_at')->nullable()->after('diagnosis');
        });
    }

    public function down(): void
    {
        Schema::table('runtime_errors', function (Blueprint $table): void {
            $table->dropColumn(['diagnosis', 'diagnosed_at']);
        });
    }
};
