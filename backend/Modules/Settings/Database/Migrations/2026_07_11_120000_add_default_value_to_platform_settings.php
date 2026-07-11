<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_settings', function (Blueprint $table): void {
            // القيمة الافتراضيّة المصنعيّة — تتيح «إعادة الضبط» وحساب «المُعدَّل عن الافتراضيّ».
            $table->text('default_value')->nullable()->after('value');
        });

        // backfill: الصفوف القائمة على قيم البذر → الافتراضيّ = القيمة الحاليّة (فلا شيء يبدو «مُعدَّلًا»).
        DB::table('platform_settings')->whereNull('default_value')->update([
            'default_value' => DB::raw('value'),
        ]);
    }

    public function down(): void
    {
        Schema::table('platform_settings', function (Blueprint $table): void {
            $table->dropColumn('default_value');
        });
    }
};
