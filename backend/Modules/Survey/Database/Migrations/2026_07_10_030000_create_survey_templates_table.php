<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('category')->default('custom')->index(); // satisfaction|feedback|nps|poll|assessment|custom
            $table->string('icon')->nullable();
            $table->json('questions')->nullable();                   // مخطّط الأسئلة (وفق أنواع QUESTION_TYPE_META)
            $table->boolean('is_system')->default(false);            // نموذج نظاميّ (لا يُحذف)
            $table->boolean('active')->default(true);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_templates');
    }
};
