<?php

namespace App\Http\Controllers;

use App\Enums\EquipmentType;
use App\Http\Requests\EquipmentRequest;
use App\Http\Resources\EquipmentResource;
use App\Models\Equipment;
use App\Services\ReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class EquipmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['type' => ['nullable', Rule::enum(EquipmentType::class)]]);

        $isAdmin = (bool) $request->user('sanctum')?->isAdmin();

        $equipment = Equipment::query()
            ->when(! ($isAdmin && $request->boolean('include_inactive')), fn ($q) => $q->active())
            ->when($request->query('type'), fn ($q, $type) => $q->where('type', $type))
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return EquipmentResource::collection($equipment);
    }

    public function show(Request $request, Equipment $equipment): EquipmentResource
    {
        abort_if(! $equipment->is_active && ! $request->user('sanctum')?->isAdmin(), 404);

        return new EquipmentResource($equipment);
    }

    public function store(EquipmentRequest $request): JsonResponse
    {
        $equipment = Equipment::create($request->validated());

        return (new EquipmentResource($equipment))->response()->setStatusCode(201);
    }

    public function update(EquipmentRequest $request, Equipment $equipment): EquipmentResource
    {
        $equipment->update($request->validated());

        return new EquipmentResource($equipment);
    }

    public function destroy(Equipment $equipment): Response|JsonResponse
    {
        Gate::authorize('delete', $equipment);

        if ($equipment->hasUpcomingReservations()) {
            return response()->json([
                'message' => 'El equipo tiene reservas pendientes. Desactívalo en lugar de borrarlo, o cancela antes sus reservas.',
            ], 409);
        }

        $equipment->delete();

        return response()->noContent();
    }

    public function availability(Request $request, Equipment $equipment, ReservationService $reservations): JsonResponse
    {
        $data = $request->validate(['date' => ['required', 'date_format:Y-m-d']], [
            'date.required' => 'Indica el día.',
            'date.date_format' => 'El día debe tener el formato AAAA-MM-DD.',
        ]);

        abort_if(! $equipment->is_active, 404);

        $busy = $reservations->busySlots($equipment, $data['date'])->map(fn (array $slot) => [
            'starts_at' => $slot['starts_at']->toIso8601ZuluString(),
            'ends_at' => $slot['ends_at']->toIso8601ZuluString(),
        ]);

        return response()->json([
            'data' => [
                'equipment_id' => $equipment->id,
                'date' => $data['date'],
                'timezone' => config('cupula.timezone'),
                'slot_minutes' => config('cupula.slot_minutes'),
                'busy' => $busy->values(),
            ],
        ]);
    }
}
