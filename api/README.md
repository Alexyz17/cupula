# Cúpula · API

API REST de Cúpula en Laravel 13 (PHP 8.4) con autenticación por token de Sanctum. La descripción del proyecto, la arquitectura y la puesta en marcha completa (API + web) están en el [README principal](../README.md); el contrato de la API, en [docs/openapi.yaml](../docs/openapi.yaml).

## Arrancar

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed      # club de ejemplo con equipos, socios y reservas
php artisan serve               # http://localhost:8000
```

## Comandos útiles

```bash
vendor/bin/pest                 # tests
vendor/bin/pint --test          # formato del código
```

## Dónde está cada cosa

| Carpeta | Contenido |
| --- | --- |
| `routes/api.php` | Rutas bajo `/api/v1`: autenticación, catálogo público y reservas |
| `app/Http/Controllers` | Autenticación, equipos y reservas |
| `app/Policies` | Qué puede hacer un socio y qué solo la coordinación |
| `app/Services/ReservationService.php` | Reglas de reserva: franjas, solapes, límites y antelación |
| `tests/Feature` | Tests de cada flujo contra la API |
