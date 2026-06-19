<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Korisnik;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Additive JSON auth layer for the Angular SPA.
 *
 * Mirrors the existing web LoginController logic (email + lozinka_hash + aktivan
 * checks) but issues a Sanctum personal access token instead of starting a web
 * session. The existing web/session auth is left completely untouched.
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $korisnik = Korisnik::with('apoteka')->where('email', $request->email)->first();

        if (!$korisnik || !Hash::check($request->password, $korisnik->lozinka_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Pogrešni podaci za prijavu.'],
            ]);
        }

        if (!$korisnik->aktivan) {
            throw ValidationException::withMessages([
                'email' => ['Vaš nalog je deaktiviran.'],
            ]);
        }

        $korisnik->poslednja_prijava = now();
        $korisnik->save();

        $token = $korisnik->createToken('angular-spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($korisnik),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()->load('apoteka')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Revoke only the token used for the current request.
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Odjava uspešna.']);
    }

    private function userPayload(Korisnik $korisnik): array
    {
        return [
            'id' => $korisnik->id,
            'ime' => $korisnik->ime,
            'prezime' => $korisnik->prezime,
            'puno_ime' => $korisnik->puno_ime,
            'email' => $korisnik->email,
            'tip' => $korisnik->tip->value,
            'tip_label' => $korisnik->tip->label(),
            'apoteka_id' => $korisnik->apoteka_id,
            'apoteka' => $korisnik->apoteka,
        ];
    }
}
