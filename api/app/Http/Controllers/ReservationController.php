<?php

namespace App\Http\Controllers;

use App\Enums\ReservationStatus;
use App\Http\Requests\StoreReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ReservationController extends Controller
{
    public function __construct(private readonly ReservationService $reservations) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'scope' => ['nullable', Rule::in(['mine', 'all'])],
            'equipment_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::enum(ReservationStatus::class)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $scope = $filters['scope'] ?? 'mine';
        if ($scope === 'all') {
            Gate::authorize('viewAll', Reservation::class);
        }

        $reservations = Reservation::query()
            ->with(['equipment', 'user'])
            ->when($scope === 'mine', fn ($q) => $q->whereBelongsTo($request->user()))
            ->when($filters['equipment_id'] ?? null, fn ($q, $id) => $q->where('equipment_id', $id))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->where('ends_at', '>', $from))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->where('starts_at', '<', $to))
            ->orderBy('starts_at')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return ReservationResource::collection($reservations);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        $reservation = $this->reservations->create($request->user(), $request->validated());

        return (new ReservationResource($reservation))->response()->setStatusCode(201);
    }

    public function show(Reservation $reservation): ReservationResource
    {
        Gate::authorize('view', $reservation);

        return new ReservationResource($reservation->load(['equipment', 'user']));
    }

    public function cancel(Reservation $reservation): ReservationResource
    {
        Gate::authorize('cancel', $reservation);

        return new ReservationResource($this->reservations->cancel($reservation)->load(['equipment', 'user']));
    }
}
