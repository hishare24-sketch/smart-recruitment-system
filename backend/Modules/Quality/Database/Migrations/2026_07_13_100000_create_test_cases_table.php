<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // سجلّ حالات الاختبار (الذرّات) — مصدر الحقيقة يُستورَد من DOC/TEST_CASES.md
        // عبر الأمر quality:import (upsert بـ case_id). تغذّي لوحة مركز قيادة الجودة.
        Schema::create('test_cases', function (Blueprint $table): void {
            $table->id();
            $table->string('case_id')->unique();          // AUTH-01 · FE-OPP-03 …
            $table->text('title');
            $table->string('layer')->index();             // backend | frontend | ops | filters
            $table->string('section')->index();           // "User (المصادقة)" …
            $table->string('module')->index();            // مشتقّ من القسم
            $table->string('type', 4)->nullable();        // U | F | E
            $table->string('priority', 12)->default('normal'); // critical | important | normal
            $table->string('status', 12)->default('gap')->index(); // automated | gap | failing
            $table->string('lifecycle', 12)->default('new');       // new | ongoing | resolved | regressed
            $table->string('test_file')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_cases');
    }
};
