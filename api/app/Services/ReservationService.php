<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Models\Equipment;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reglas de negocio de las reservas. Los controladores solo validan el formato de la petición;
 * todo lo que depende del estado del club (solapamientos, límites, horarios) se decide aquí.
 */
class ReservationService
{
    /**
     * @param  array{equipment_id: int, starts_at: string, ends_at: string, notes?: string|null}  $data
     */
    public function create(User $user, array $data): Reservation
    {
        $start = CarbonImmutable::parse($data['starts_at'])->utc();
        $end = CarbonImmutable::parse($data['ends_at'])->utc();

        $this->ensureValidWindow($start, $end);

        return DB::transaction(function () use ($user, $data, $start, $end) {
            // Bloquear la fila del equipo serializa las reservas concurrentes del mismo equipo:
            // la segunda petición espera a que la primera termine y entonces ve su reserva.
            $equipment = Equipment::query()->lockForUpdate()->findOrFail($data['equipment_id']);

            if (! $equipment->is_active) {
                throw ValidationException::withMessages(['equipment_id' => 'Este equipo no está disponible para reservas.']);
            }

            if (! $user->isAdmin()) {
                $active = $user->reservations()->confirmed()->upcoming()->count();
                $max = config('cupula.max_active_reservations');

                if ($active >= $max) {
                    throw ValidationException::withMessages(['starts_at' => "Ya tienes {$max} reservas activas. Cancela alguna antes de hacer otra."]);
                }
            }

            $overlaps = $equipment->reservations()->confirmed()->overlapping($start, $end)->exists();

            if ($overlaps) {
                throw ValidationException::withMessages(['starts_at' => 'El equipo ya está reservado en esa franja.']);
            }

            $reservation = new Reservation([
                'equipment_id' => $equipment->id,
                'starts_at' => $start,
                'ends_at' => $end,
                'notes' => $data['notes'] ?? null,
            ]);
            $reservation->user()->associate($user);
            $reservation->save();

            return $reservation->load(['equipment', 'user']);
        });
    }

    public function cancel(Reservation $reservation): Reservation
    {
        if ($reservation->isCancelled()) {
            throw ValidationException::withMessages(['reservation' => 'La reserva ya estaba cancelada.']);
        }

        if ($reservation->starts_at->isPast()) {
            throw ValidationException::withMessages(['reservation' => 'No se puede cancelar una reserva que ya ha empezado.']);
        }

        $reservation->forceFill([
            'status' => ReservationStatus::Cancelled,
            'cancelled_at' => now(),
        ])->save();

        return $reservation;
    }

    /**
     * Franjas ocupadas de un equipo en un día del calendario del club. No incluye quién reservó.
     *
     * @return Collection<int, array{starts_at: CarbonImmutable, ends_at: CarbonImmutable}>
     */
    public function busySlots(Equipment $equipment, string $date): Collection
    {
        $dayStart = CarbonImmutable::parse($date, config('cupula.timezone'))->startOfDay()->utc();
        $dayEnd = $dayStart->addDay();

        return $equipment->reservations()
            ->confirmed()
            ->overlapping($dayStart, $dayEnd)
            ->orderBy('starts_at')
            ->get(['starts_at', 'ends_at'])
            ->map(fn (Reservation $r) => ['starts_at' => $r->starts_at, 'ends_at' => $r->ends_at]);
    }

    private function ensureValidWindow(CarbonImmutable $start, CarbonImmutable $end): void
    {
        $slot = config('cupula.slot_minutes');
        $minutes = (int) $start->diffInMinutes($end);

        $errors = match (true) {
            $start->minute % $slot !== 0 || $start->second !== 0 || $end->minute % $slot !== 0 || $end->second !== 0 => ['starts_at' => "Las reservas empiezan y terminan en franjas de {$slot} minutos."],
            $start->lte(now()) => ['starts_at' => 'La reserva tiene que empezar en el futuro.'],
            $start->gt(now()->addDays(config('cupula.max_days_ahead'))) => ['starts_at' => 'Solo se puede reservar con '.config('cupula.max_days_ahead').' días de antelación como máximo.'],
            $minutes < config('cupula.min_duration_minutes') => ['ends_at' => 'La reserva debe durar al menos '.config('cupula.min_duration_minutes').' minutos.'],
            $minutes > config('cupula.max_duration_minutes') => ['ends_at' => 'La reserva no puede durar más de '.(config('cupula.max_duration_minutes') / 60).' horas.'],
            default => [],
        };

        if ($errors) {
            throw ValidationException::withMessages($errors);
        }
    }
}
