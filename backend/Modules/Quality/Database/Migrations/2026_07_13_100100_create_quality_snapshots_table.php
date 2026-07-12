<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // لقطة تغطية لكلّ استيراد — صفّ يوميّ يبني اتّجاه التغطية الحقيقيّ للوحة.
        Schema::create('quality_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->date('captured_on')->unique();   // لقطة واحدة لكلّ يوم (upsert)
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('automated')->default(0);
            $table->unsignedInteger('gap')->default(0);
            $table->unsignedInteger('failing')->default(0);
            $table->json('by_layer')->nullable();    // {backend:{total,automated},frontend:{...}}
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_snapshots');
    }
};
