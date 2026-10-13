<?php

use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\User;

it('lista solo los equipos activos al público', function () {
    Equipment::factory()->create(['name' => 'Dobson 254']);
    Equipment::factory()->inactive()->create(['name' => 'Refractor roto']);

    $this->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Dobson 254');
});

it('filtra el catálogo por tipo', function () {
    Equipment::factory()->create(['type' => 'telescope']);
    Equipment::factory()->create(['type' => 'camera', 'name' => 'Cámara planetaria']);

    $this->getJson('/api/v1/equipment?type=camera')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'camera');
});

it('un administrador puede ver también los equipos inactivos', function () {
    Equipment::factory()->create();
    Equipment::factory()->inactive()->create();

    $this->getJson('/api/v1/equipment?include_inactive=1', asUser(User::factory()->admin()->create()))
        ->assertJsonCount(2, 'data');

    // Un socio que pide lo mismo sigue viendo solo los activos.
    $this->getJson('/api/v1/equipment?include_inactive=1', asUser(User::factory()->create()))
        ->assertJsonCount(1, 'data');
});

it('oculta la ficha de un equipo inactivo al público', function () {
    $equipment = Equipment::factory()->inactive()->create();

    $this->getJson("/api/v1/equipment/{$equipment->id}")->assertNotFound();
});

it('un administrador da de alta un equipo', function () {
    $this->postJson('/api/v1/equipment', [
        'name' => 'Schmidt-Cassegrain 203/2032',
        'type' => 'telescope',
        'aperture_mm' => 203,
        'focal_length_mm' => 2032,
    ], asUser(User::factory()->admin()->create()))
        ->assertCreated()
        ->assertJsonPath('data.name', 'Schmidt-Cassegrain 203/2032')
        ->assertJsonPath('data.is_active', true);
});

it('un socio no puede crear, editar ni borrar equipos', function () {
    $member = asUser(User::factory()->create());
    $equipment = Equipment::factory()->create();

    // 403 aunque los datos sean incorrectos: la autorización va antes que la validación.
    $this->postJson('/api/v1/equipment', ['name' => ''], $member)->assertForbidden();
    $this->patchJson("/api/v1/equipment/{$equipment->id}", ['name' => 'Mío'], $member)->assertForbidden();
    $this->deleteJson("/api/v1/equipment/{$equipment->id}", [], $member)
        ->assertForbidden()
        ->assertJsonPath('message', 'No tienes permiso para hacer esto.');
});

it('valida el alta de equipos', function () {
    $this->postJson('/api/v1/equipment', ['name' => '', 'type' => 'nave-espacial'], asUser(User::factory()->admin()->create()))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'type']);
});

it('edita un equipo de forma parcial', function () {
    $equipment = Equipment::factory()->create(['name' => 'Viejo nombre']);

    $this->patchJson("/api/v1/equipment/{$equipment->id}", ['is_active' => false], asUser(User::factory()->admin()->create()))
        ->assertOk()
        ->assertJsonPath('data.name', 'Viejo nombre')
        ->assertJsonPath('data.is_active', false);
});

it('no borra un equipo con reservas pendientes', function () {
    $equipment = Equipment::factory()->create();
    Reservation::factory()->for($equipment)->between('2026-11-05 20:00:00', '2026-11-05 22:00:00')->create();

    $this->deleteJson("/api/v1/equipment/{$equipment->id}", [], asUser(User::factory()->admin()->create()))
        ->assertConflict();

    $this->assertModelExists($equipment);
});

it('borra un equipo sin reservas pendientes', function () {
    $equipment = Equipment::factory()->create();
    Reservation::factory()->for($equipment)->between('2026-10-20 20:00:00', '2026-10-20 22:00:00')->create();

    $this->deleteJson("/api/v1/equipment/{$equipment->id}", [], asUser(User::factory()->admin()->create()))
        ->assertNoContent();

    $this->assertModelMissing($equipment);
});

it('muestra primero los telescopios y después el resto por tipo y nombre', function () {
    Equipment::factory()->create(['type' => 'accessory', 'name' => 'Filtro solar']);
    Equipment::factory()->create(['type' => 'camera', 'name' => 'Cámara planetaria']);
    Equipment::factory()->create(['type' => 'telescope', 'name' => 'Refractor 80']);
    Equipment::factory()->create(['type' => 'telescope', 'name' => 'Dobson 254']);

    expect($this->getJson('/api/v1/equipment')->json('data.*.name'))
        ->toBe(['Dobson 254', 'Refractor 80', 'Cámara planetaria', 'Filtro solar']);
});
