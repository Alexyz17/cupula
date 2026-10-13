<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => $this->travelTo('2026-11-02 12:00:00'))
    ->in('Feature');

/** Cabecera de autenticación para un usuario: crea un token de Sanctum real. */
function asUser(User $user): array
{
    // Sanctum recuerda el usuario de la petición anterior dentro del mismo test: así cada petición se autentica de cero.
    app('auth')->forgetGuards();

    return ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];
}
