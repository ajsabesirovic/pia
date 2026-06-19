<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Apoteka;
use App\Models\Dobavljac;
use App\Models\DobavljacLek;
use Illuminate\Http\JsonResponse;

/**
 * Read-only reference data the Angular order form needs:
 * supplier list, the supplier -> medicine cascade (with default purchase price),
 * and the pharmacy list (used by the central admin to pick a target pharmacy).
 */
class ReferenceController extends Controller
{
    public function dobavljaci(): JsonResponse
    {
        return response()->json(
            Dobavljac::where('aktivan', true)->orderBy('naziv')->get()
        );
    }

    public function dobavljacLekovi(int $dobavljac): JsonResponse
    {
        $stavke = DobavljacLek::where('dobavljac_id', $dobavljac)
            ->with('lek')
            ->get()
            ->map(fn (DobavljacLek $dl) => [
                'lek_id' => $dl->lek_id,
                'naziv' => $dl->lek?->naziv,
                'jkl_sifra' => $dl->lek?->jkl_sifra,
                'jacina' => $dl->lek?->jacina,
                'farm_oblik' => $dl->lek?->farm_oblik,
                'nabavna_cena' => $dl->nabavna_cena,
            ])
            ->values();

        return response()->json($stavke);
    }

    public function apoteke(): JsonResponse
    {
        return response()->json(
            Apoteka::where('aktivna', true)->orderBy('naziv')->get()
        );
    }
}
