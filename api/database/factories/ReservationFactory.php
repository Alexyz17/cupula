<?php

namespace Database\Factories;

use App\Enums\ReservationStatus;
use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    public function definition(): array
    {
        $start = now()->addDays(fake()->numberBetween(1, 20))->setTime(21, 0);

        return [
            'user_id' => User::factory(),
            'equipment_id' => Equipment::factory(),
            'starts_at' => $start,
            'ends_at' => $start->copy()->addHours(2),
            'status' => ReservationStatus::Confirmed,
            'notes' => null,
        ];
    }

    public function between(string $start, string $end): static
    {
        return $this->state(fn () => ['starts_at' => $start, 'ends_at' => $end]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => ReservationStatus::Cancelled, 'cancelled_at' => now()]);
    }
}
