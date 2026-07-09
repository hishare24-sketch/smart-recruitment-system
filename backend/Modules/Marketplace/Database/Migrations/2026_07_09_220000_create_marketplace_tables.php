<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opportunities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('company')->default('');
            $table->string('location')->default('');
            $table->string('salary')->default('');
            $table->string('category')->default('')->index();
            $table->json('skills')->nullable();
            $table->timestamps();
        });

        Schema::create('market_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->index();
            $table->string('title');
            $table->string('org')->default('');
            $table->string('state')->default('new')->index();
            $table->string('compensation')->default('');
            $table->boolean('remote')->default(false);
            $table->timestamps();
        });

        Schema::create('applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opportunity_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'opportunity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
        Schema::dropIfExists('market_requests');
        Schema::dropIfExists('opportunities');
    }
};
