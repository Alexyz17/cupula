<?php

namespace App\Http\Requests;

use App\Enums\EquipmentType;
use App\Models\Equipment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Alta (POST) y edición parcial (PATCH) de equipos. */
class EquipmentRequest extends FormRequest
{
    /** Se comprueba antes de validar: un socio recibe 403 aunque envíe datos incorrectos. */
    public function authorize(): bool
    {
        return $this->isMethod('post')
            ? $this->user()->can('create', Equipment::class)
            : $this->user()->can('update', $this->route('equipment'));
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:120'],
            'type' => [$required, Rule::enum(EquipmentType::class)],
            'description' => ['nullable', 'string', 'max:2000'],
            'aperture_mm' => ['nullable', 'integer', 'min:1', 'max:2000'],
            'focal_length_mm' => ['nullable', 'integer', 'min:1', 'max:20000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Escribe el nombre del equipo.',
            'type.required' => 'Elige el tipo de equipo.',
            'type.enum' => 'El tipo de equipo no es válido.',
            'aperture_mm.integer' => 'La apertura debe ser un número entero de milímetros.',
            'focal_length_mm.integer' => 'La focal debe ser un número entero de milímetros.',
        ];
    }
}
