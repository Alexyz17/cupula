<?php

use App\Models\Equipment;
use App\Models\Reservation;

it('devuelve las franjas ocupadas de un día del club sin datos de los socios', function () {
    $telescope = Equipment::factory()->create();
    // 5 de noviembre en Madrid va de las 23:00 UTC del día 4 a las 23:00 UTC del día 5.
    Reservation::factory()->for($telescope)->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();
    Reservation::factory()->for($telescope)->between('2026-11-04 22:00:00', '2026-11-05 00:00:00')->create(); // cruza la medianoche local
    Reservation::factory()->for($telescope)->between('2026-11-06 20:00:00', '2026-11-06 22:00:00')->create(); // otro día
    Reservation::factory()->for($telescope)->cancelled()->between('2026-11-05 18:00:00', '2026-11-05 19:00:00')->create();

    $response = $this->getJson("/api/v1/equipment/{$telescope->id}/availability?date=2026-11-05");

    $response->assertOk()
        ->assertJsonPath('data.timezone', 'Europe/Madrid')
        ->assertJsonPath('data.slot_minutes', 30)
        ->assertJsonCount(2, 'data.busy')
        ->assertJsonPath('data.busy.0', ['starts_at' => '2026-11-04T22:00:00Z', 'ends_at' => '2026-11-05T00:00:00Z'])
        ->assertJsonPath('data.busy.1', ['starts_at' => '2026-11-05T20:00:00Z', 'ends_at' => '2026-11-05T22:00:00Z']);
});

it('exige el día con formato AAAA-MM-DD', function () {
    $telescope = Equipment::factory()->create();

    $this->getJson("/api/v1/equipment/{$telescope->id}/availability?date=05/11/2026")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['date']);
});

it('no da disponibilidad de equipos inactivos', function () {
    $telescope = Equipment::factory()->inactive()->create();

    $this->getJson("/api/v1/equipment/{$telescope->id}/availability?date=2026-11-05")->assertNotFound();
});
