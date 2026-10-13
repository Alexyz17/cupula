<?php

use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\User;

// "Ahora" es el lunes 2 de noviembre de 2026 a las 12:00 UTC (ver tests/Pest.php).

function reserve(User $user, Equipment $equipment, string $start, string $end, array $extra = [])
{
    return test()->postJson('/api/v1/reservations', [
        'equipment_id' => $equipment->id,
        'starts_at' => $start,
        'ends_at' => $end,
        ...$extra,
    ], asUser($user));
}

beforeEach(function () {
    $this->member = User::factory()->create();
    $this->telescope = Equipment::factory()->create(['name' => 'Dobson 254']);
});

it('crea una reserva', function () {
    reserve($this->member, $this->telescope, '2026-11-05T20:00:00Z', '2026-11-05T22:00:00Z', ['notes' => 'Júpiter'])
        ->assertCreated()
        ->assertJsonPath('data.equipment.name', 'Dobson 254')
        ->assertJsonPath('data.user.name', $this->member->name)
        ->assertJsonPath('data.starts_at', '2026-11-05T20:00:00Z')
        ->assertJsonPath('data.status', 'confirmed')
        ->assertJsonPath('data.notes', 'Júpiter');
});

it('acepta horas con zona horaria y las guarda en UTC', function () {
    // 21:00 en Madrid (UTC+1 en noviembre) son las 20:00 UTC.
    reserve($this->member, $this->telescope, '2026-11-05T21:00:00+01:00', '2026-11-05T23:00:00+01:00')
        ->assertCreated()
        ->assertJsonPath('data.starts_at', '2026-11-05T20:00:00Z');
});

it('rechaza una reserva que se solapa con otra', function () {
    Reservation::factory()->for($this->telescope)->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();

    reserve($this->member, $this->telescope, '2026-11-05T21:00:00Z', '2026-11-05T23:00:00Z')
        ->assertUnprocessable()
        ->assertJsonPath('errors.starts_at.0', 'El equipo ya está reservado en esa franja.');
});

it('permite reservar justo cuando termina otra reserva', function () {
    Reservation::factory()->for($this->telescope)->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();

    reserve($this->member, $this->telescope, '2026-11-05T22:00:00Z', '2026-11-05T23:00:00Z')->assertCreated();
});

it('una reserva cancelada deja la franja libre', function () {
    Reservation::factory()->for($this->telescope)->cancelled()->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();

    reserve($this->member, $this->telescope, '2026-11-05T20:00:00Z', '2026-11-05T22:00:00Z')->assertCreated();
});

it('el solape es por equipo: otro equipo a la misma hora está libre', function () {
    Reservation::factory()->for($this->telescope)->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();

    reserve($this->member, Equipment::factory()->create(), '2026-11-05T20:00:00Z', '2026-11-05T22:00:00Z')->assertCreated();
});

it('aplica las reglas de franja, antelación y duración', function (string $start, string $end, string $field, string $message) {
    reserve($this->member, $this->telescope, $start, $end)
        ->assertUnprocessable()
        ->assertJsonPath("errors.{$field}.0", $message);
})->with([
    'no alineada a 30 minutos' => ['2026-11-05T20:15:00Z', '2026-11-05T22:00:00Z', 'starts_at', 'Las reservas empiezan y terminan en franjas de 30 minutos.'],
    'en el pasado' => ['2026-11-01T20:00:00Z', '2026-11-01T22:00:00Z', 'starts_at', 'La reserva tiene que empezar en el futuro.'],
    'demasiado lejos' => ['2027-02-01T20:00:00Z', '2027-02-01T22:00:00Z', 'starts_at', 'Solo se puede reservar con 60 días de antelación como máximo.'],
    'más de 6 horas' => ['2026-11-05T18:00:00Z', '2026-11-06T01:00:00Z', 'ends_at', 'La reserva no puede durar más de 6 horas.'],
]);

it('exige que la reserva termine después de empezar', function () {
    reserve($this->member, $this->telescope, '2026-11-05T22:00:00Z', '2026-11-05T20:00:00Z')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['ends_at']);
});

it('no permite reservar un equipo inactivo', function () {
    reserve($this->member, Equipment::factory()->inactive()->create(), '2026-11-05T20:00:00Z', '2026-11-05T22:00:00Z')
        ->assertUnprocessable()
        ->assertJsonPath('errors.equipment_id.0', 'Este equipo no está disponible para reservas.');
});

it('limita a 3 las reservas activas de un socio', function () {
    Reservation::factory()->count(3)->for($this->member)->sequence(
        ['starts_at' => '2026-11-03 20:00:00', 'ends_at' => '2026-11-03 21:00:00'],
        ['starts_at' => '2026-11-04 20:00:00', 'ends_at' => '2026-11-04 21:00:00'],
        ['starts_at' => '2026-11-05 20:00:00', 'ends_at' => '2026-11-05 21:00:00'],
    )->create();

    reserve($this->member, $this->telescope, '2026-11-06T20:00:00Z', '2026-11-06T21:00:00Z')
        ->assertUnprocessable()
        ->assertJsonPath('errors.starts_at.0', 'Ya tienes 3 reservas activas. Cancela alguna antes de hacer otra.');
});

it('las reservas pasadas y canceladas no cuentan para el límite', function () {
    Reservation::factory()->for($this->member)->between('2026-10-20 20:00:00', '2026-10-20 21:00:00')->create();
    Reservation::factory()->count(2)->for($this->member)->cancelled()->create();
    Reservation::factory()->count(2)->for($this->member)->sequence(
        ['starts_at' => '2026-11-03 20:00:00', 'ends_at' => '2026-11-03 21:00:00'],
        ['starts_at' => '2026-11-04 20:00:00', 'ends_at' => '2026-11-04 21:00:00'],
    )->create();

    reserve($this->member, $this->telescope, '2026-11-06T20:00:00Z', '2026-11-06T21:00:00Z')->assertCreated();
});

it('los administradores no tienen límite de reservas', function () {
    $admin = User::factory()->admin()->create();
    Reservation::factory()->count(3)->for($admin)->sequence(
        ['starts_at' => '2026-11-03 20:00:00', 'ends_at' => '2026-11-03 21:00:00'],
        ['starts_at' => '2026-11-04 20:00:00', 'ends_at' => '2026-11-04 21:00:00'],
        ['starts_at' => '2026-11-05 20:00:00', 'ends_at' => '2026-11-05 21:00:00'],
    )->create();

    reserve($admin, $this->telescope, '2026-11-06T20:00:00Z', '2026-11-06T21:00:00Z')->assertCreated();
});

it('exige iniciar sesión para reservar', function () {
    $this->postJson('/api/v1/reservations', [])->assertUnauthorized();
});

it('un socio solo ve sus propias reservas', function () {
    Reservation::factory()->for($this->member)->create();
    Reservation::factory()->count(2)->create();

    $this->getJson('/api/v1/reservations', asUser($this->member))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.user.id', $this->member->id)
        ->assertJsonStructure(['data', 'links', 'meta' => ['current_page', 'total']]);
});

it('un socio no puede listar las reservas de todo el club', function () {
    $this->getJson('/api/v1/reservations?scope=all', asUser($this->member))->assertForbidden();
});

it('un administrador lista y filtra las reservas de todo el club', function () {
    $other = Equipment::factory()->create();
    Reservation::factory()->for($this->telescope)->count(2)->create();
    Reservation::factory()->for($other)->create();

    $admin = asUser(User::factory()->admin()->create());

    $this->getJson('/api/v1/reservations?scope=all', $admin)->assertJsonCount(3, 'data');
    $this->getJson("/api/v1/reservations?scope=all&equipment_id={$other->id}", $admin)->assertJsonCount(1, 'data');
});

it('los listados no exponen el email de otros socios', function () {
    Reservation::factory()->create();

    $response = $this->getJson('/api/v1/reservations?scope=all', asUser(User::factory()->admin()->create()));

    expect($response->json('data.0.user'))->toHaveKeys(['id', 'name'])->not->toHaveKey('email');
});

it('nadie ve la reserva de otro socio', function () {
    $reservation = Reservation::factory()->create();

    $this->getJson("/api/v1/reservations/{$reservation->id}", asUser($this->member))->assertForbidden();
    $this->getJson("/api/v1/reservations/{$reservation->id}", asUser($reservation->user))->assertOk();
});

it('un socio cancela su reserva y la franja queda libre', function () {
    $reservation = Reservation::factory()->for($this->member)->for($this->telescope)
        ->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();

    $this->postJson("/api/v1/reservations/{$reservation->id}/cancel", [], asUser($this->member))
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    reserve(User::factory()->create(), $this->telescope, '2026-11-05T20:00:00Z', '2026-11-05T22:00:00Z')->assertCreated();
});

it('un socio no puede cancelar la reserva de otro, pero un administrador sí', function () {
    $reservation = Reservation::factory()->create();

    $this->postJson("/api/v1/reservations/{$reservation->id}/cancel", [], asUser($this->member))->assertForbidden();
    $this->postJson("/api/v1/reservations/{$reservation->id}/cancel", [], asUser(User::factory()->admin()->create()))->assertOk();
});

it('no cancela reservas ya empezadas ni ya canceladas', function () {
    $started = Reservation::factory()->for($this->member)->between('2026-11-02 11:00:00', '2026-11-02 13:00:00')->create();
    $cancelled = Reservation::factory()->for($this->member)->cancelled()->create();

    $this->postJson("/api/v1/reservations/{$started->id}/cancel", [], asUser($this->member))
        ->assertUnprocessable()
        ->assertJsonPath('errors.reservation.0', 'No se puede cancelar una reserva que ya ha empezado.');

    $this->postJson("/api/v1/reservations/{$cancelled->id}/cancel", [], asUser($this->member))
        ->assertUnprocessable()
        ->assertJsonPath('errors.reservation.0', 'La reserva ya estaba cancelada.');
});
