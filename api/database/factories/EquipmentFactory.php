<?php

namespace Database\Factories;

use App\Enums\EquipmentType;
use App\Models\Equipment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Equipment>
 */
class EquipmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Telescopio '.fake()->unique()->numerify('###'),
            'type' => EquipmentType::Telescope,
            'description' => fake()->sentence(),
            'aperture_mm' => fake()->randomElement([80, 130, 203, 254]),
            'focal_length_mm' => fake()->randomElement([480, 900, 1200, 2032]),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
