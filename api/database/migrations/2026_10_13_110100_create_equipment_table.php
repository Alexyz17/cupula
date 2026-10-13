<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('type', 20);
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('aperture_mm')->nullable();
            $table->unsignedSmallInteger('focal_length_mm')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
