<?php

use App\Enums\Role;
use App\Models\User;

it('registra un socio y devuelve un token', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'Laura',
        'email' => 'laura@example.com',
        'password' => 'estrellas1',
        'password_confirmation' => 'estrellas1',
    ]);

    $response->assertCreated()
        ->assertJsonPath('user.email', 'laura@example.com')
        ->assertJsonPath('user.role', 'member')
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
});

it('no permite hacerse administrador desde el registro', function () {
    $this->postJson('/api/v1/auth/register', [
        'name' => 'Pirata',
        'email' => 'pirata@example.com',
        'password' => 'estrellas1',
        'password_confirmation' => 'estrellas1',
        'role' => 'admin',
    ])->assertCreated()->assertJsonPath('user.role', 'member');

    expect(User::where('email', 'pirata@example.com')->first()->role)->toBe(Role::Member);
});

it('valida el registro con mensajes en español', function () {
    User::factory()->create(['email' => 'ocupado@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => '',
        'email' => 'ocupado@example.com',
        'password' => 'corta',
        'password_confirmation' => 'otra',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'password'])
        ->assertJsonPath('errors.email.0', 'Ya existe una cuenta con este email.');
});

it('inicia sesión con credenciales correctas', function () {
    User::factory()->create(['email' => 'pau@example.com', 'password' => 'estrellas1']);

    $this->postJson('/api/v1/auth/login', ['email' => 'pau@example.com', 'password' => 'estrellas1'])
        ->assertOk()
        ->assertJsonStructure(['token', 'user']);
});

it('da el mismo error si el email no existe o la contraseña falla', function () {
    User::factory()->create(['email' => 'pau@example.com', 'password' => 'estrellas1']);

    $wrongPassword = $this->postJson('/api/v1/auth/login', ['email' => 'pau@example.com', 'password' => 'mala']);
    $unknownEmail = $this->postJson('/api/v1/auth/login', ['email' => 'nadie@example.com', 'password' => 'mala']);

    $wrongPassword->assertUnprocessable();
    $unknownEmail->assertUnprocessable();
    expect($wrongPassword->json('errors.email'))->toBe($unknownEmail->json('errors.email'));
});

it('limita los intentos de inicio de sesión', function () {
    foreach (range(1, 5) as $i) {
        $this->postJson('/api/v1/auth/login', ['email' => 'x@example.com', 'password' => 'mala'])->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/login', ['email' => 'x@example.com', 'password' => 'mala'])
        ->assertTooManyRequests()
        ->assertJsonPath('message', 'Demasiados intentos. Espera un momento y vuelve a probar.');
});

it('devuelve el usuario conectado y exige token', function () {
    $user = User::factory()->create();

    $this->getJson('/api/v1/me')->assertUnauthorized()->assertJsonPath('message', 'Inicia sesión para continuar.');
    $this->getJson('/api/v1/me', asUser($user))->assertOk()->assertJsonPath('data.id', $user->id);
});

it('al cerrar sesión el token deja de servir', function () {
    $user = User::factory()->create();
    $headers = asUser($user);

    $this->postJson('/api/v1/auth/logout', [], $headers)->assertNoContent();

    expect($user->tokens()->count())->toBe(0);
});
