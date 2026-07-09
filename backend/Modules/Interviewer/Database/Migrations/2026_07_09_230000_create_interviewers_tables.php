<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interviewers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('specialty')->default('')->index();
            $table->decimal('rating', 3, 2)->default(0);
            $table->decimal('price_from', 10, 2)->default(0);
            $table->json('availability')->nullable();
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('interviewer_id')->constrained()->cascadeOnDelete();
            $table->string('day')->default('');
            $table->string('slot')->default('');
            $table->string('type')->default('');
            $table->string('status')->default('pending')->index();
            $table->json('elements')->nullable();
            $table->json('report')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('interviewers');
    }
};
