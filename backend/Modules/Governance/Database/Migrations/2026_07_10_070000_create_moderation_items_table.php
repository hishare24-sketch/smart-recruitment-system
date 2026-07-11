<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moderation_items', function (Blueprint $table): void {
            $table->id();
            $table->string('type')->index();     // expert_application | skill_verification | content_report | endorsement
            $table->string('subject');           // ما الذي يُراجَع (اسم/عنوان)
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('submitter_name')->nullable();
            $table->string('target_ref')->nullable();
            $table->text('reason')->nullable();
            $table->string('status')->default('pending')->index(); // pending | approved | rejected | resolved
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('resolver_name')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_items');
    }
};
