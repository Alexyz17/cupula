<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Solo el formato. Las reglas de negocio (solapes, límites, franjas) están en ReservationService. */
class StoreReservationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'equipment_id' => ['required', 'integer', 'exists:equipment,id'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'equipment_id.required' => 'Elige un equipo.',
            'equipment_id.exists' => 'El equipo no existe.',
            'starts_at.required' => 'Indica cuándo empieza la reserva.',
            'starts_at.date' => 'La fecha de inicio no es válida.',
            'ends_at.required' => 'Indica cuándo termina la reserva.',
            'ends_at.date' => 'La fecha de fin no es válida.',
            'ends_at.after' => 'La reserva tiene que terminar después de empezar.',
            'notes.max' => 'Las notas no pueden superar los 500 caracteres.',
        ];
    }
}
