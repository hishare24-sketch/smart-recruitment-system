<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // أوزان محرّك المطابقة — صفّ مفرد قابل للضبط من الأدمن.
        Schema::create('match_settings', function (Blueprint $table): void {
            $table->id();
            $table->unsignedTinyInteger('skills_weight')->default(60);
            $table->unsignedTinyInteger('experience_weight')->default(20);
            $table->unsignedTinyInteger('category_weight')->default(20);
            $table->unsignedTinyInteger('threshold')->default(50);   // عتبة القبول المرئيّة
            $table->boolean('ai_boost')->default(true);              // تعزيز الذكاء (محكوم بقدرة candidate_matching)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('match_settings');
    }
};
