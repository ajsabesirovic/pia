<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Narudzbenica;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Additive JSON API for the purchase-order (narudžbenica) module.
 *
 * Reuses the exact same OrderService that the web controller uses, so all the
 * business logic (order-number generation, totals, the status state machine and
 * stock updates on delivery) is identical. Only the transport layer is new.
 */
class NarudzbenicaController extends Controller
{
    public function __construct(protected OrderService $orderService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Narudzbenica::with(['apoteka', 'dobavljac', 'korisnik']);

        // Pharmacy admins only see their own pharmacy's orders.
        if (!$user->isCentralniAdmin()) {
            $query->where('apoteka_id', $user->apoteka_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json(
            $query->orderByDesc('datum_kreiranja')->paginate(15)
        );
    }

    public function show(Request $request, Narudzbenica $narudzbenica): JsonResponse
    {
        $this->authorizeAccess($request, $narudzbenica);

        $narudzbenica->load(['apoteka', 'dobavljac', 'korisnik', 'stavke.lek']);

        return response()->json($narudzbenica);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'dobavljac_id' => 'required|exists:dobavljaci,id',
            'napomena' => 'nullable|string',
            'stavke' => 'required|array|min:1',
            'stavke.*.lek_id' => 'required|exists:lekovi,id',
            'stavke.*.kolicina' => 'required|integer|min:1',
            'stavke.*.cena_po_komadu' => 'required|numeric|gt:0',
        ];

        if ($user->isCentralniAdmin()) {
            $rules['apoteka_id'] = 'required|exists:apoteke,id';
        }

        $validated = $request->validate($rules);

        $apotekaId = $user->isCentralniAdmin()
            ? $validated['apoteka_id']
            : $user->apoteka_id;

        try {
            $narudzbenica = $this->orderService->createOrder([
                'dobavljac_id' => $validated['dobavljac_id'],
                'napomena' => $validated['napomena'] ?? null,
                'apoteka_id' => $apotekaId,
                'korisnik_id' => $user->id,
            ], $validated['stavke']);

            return response()->json($narudzbenica, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function send(Request $request, Narudzbenica $narudzbenica): JsonResponse
    {
        return $this->runTransition($request, $narudzbenica, function () use ($narudzbenica) {
            return $this->orderService->updateStatus($narudzbenica->id, OrderStatus::POSLATA);
        });
    }

    public function markDelivered(Request $request, Narudzbenica $narudzbenica): JsonResponse
    {
        return $this->runTransition($request, $narudzbenica, function () use ($narudzbenica) {
            return $this->orderService->markAsDelivered($narudzbenica->id);
        });
    }

    public function cancel(Request $request, Narudzbenica $narudzbenica): JsonResponse
    {
        return $this->runTransition($request, $narudzbenica, function () use ($narudzbenica) {
            return $this->orderService->cancelOrder($narudzbenica->id);
        });
    }

    /**
     * Run a status-changing action, enforcing access and translating the
     * service's domain exceptions into a 422 JSON response.
     */
    private function runTransition(Request $request, Narudzbenica $narudzbenica, callable $action): JsonResponse
    {
        $this->authorizeAccess($request, $narudzbenica);

        try {
            $action();
            $narudzbenica->refresh()->load(['apoteka', 'dobavljac', 'korisnik', 'stavke.lek']);

            return response()->json($narudzbenica);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Pharmacy admins may only touch orders belonging to their own pharmacy.
     */
    private function authorizeAccess(Request $request, Narudzbenica $narudzbenica): void
    {
        $user = $request->user();

        if (!$user->isCentralniAdmin() && $narudzbenica->apoteka_id !== $user->apoteka_id) {
            abort(403, 'Nemate pristup ovoj narudžbenici.');
        }
    }
}
