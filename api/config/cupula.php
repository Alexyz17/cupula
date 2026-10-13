<?php

/*
 * Reglas de reserva del club. Se pueden ajustar sin tocar código.
 */
return [

    // Zona horaria del club: define qué es "un día" en la consulta de disponibilidad. Las fechas se guardan en UTC.
    'timezone' => env('CUPULA_TIMEZONE', 'Europe/Madrid'),

    // Las reservas empiezan y terminan en múltiplos de este número de minutos.
    'slot_minutes' => (int) env('CUPULA_SLOT_MINUTES', 30),

    // Duración mínima y máxima de una reserva, en minutos.
    'min_duration_minutes' => (int) env('CUPULA_MIN_DURATION', 30),
    'max_duration_minutes' => (int) env('CUPULA_MAX_DURATION', 360),

    // Con cuántos días de antelación se puede reservar como máximo.
    'max_days_ahead' => (int) env('CUPULA_MAX_DAYS_AHEAD', 60),

    // Reservas futuras confirmadas que puede tener a la vez un socio (los administradores no tienen límite).
    'max_active_reservations' => (int) env('CUPULA_MAX_ACTIVE', 3),

];
