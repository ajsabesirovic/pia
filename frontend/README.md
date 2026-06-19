# Apoteka — Angular frontend

Angular 22 SPA for the existing **is_farmacy** Laravel app. It implements two modules
against the existing PHP backend + MySQL database **without modifying** the existing
web app: the new code is an additive, token-based JSON API under `/api/*`.

## Modules
1. **Login** — Reactive Forms, validation, error handling, Sanctum bearer-token auth,
   route protection via guards.
2. **Purchase Orders (Narudžbenice)** — list with status filter + pagination, create
   form with a dynamic `FormArray` of line items, supplier→medicine cascade with price
   auto-fill and a live total, and a detail view exposing the order **status state
   machine** (send → deliver → cancel).

## Architecture
- `core/` — `AuthService` (signals + localStorage), `OrdersService` (HTTP), functional
  `authInterceptor` (attaches token, handles 401), `authGuard` + `roleGuard`, models.
- `shell/` — authenticated layout (top nav + logout) and a 403 page.
- `features/login`, `features/orders` — the two modules (lazy-loaded routes).

## Running locally

**1. Backend (Laravel, port 8000)** — from the repo root:
```bash
export PATH="/opt/homebrew/opt/php@8.2/bin:$PATH"
php artisan serve
```
MySQL must be running (`brew services start mysql`); DB `laravel` is migrated + seeded.

**2. Frontend (Angular, port 4200)** — from `frontend/`:
```bash
npm start          # ng serve
```
Open http://localhost:4200.

The API base URL is configured in `src/app/core/config.ts`.

## Test accounts (password: `password`)
| Email | Role |
|---|---|
| `admin@apoteke.rs` | Centralni admin (must pick a pharmacy when creating orders) |
| `admin.apoteka1@apoteke.rs` | Admin apoteke (scoped to pharmacy 1) |

> Farmaceut accounts (role `F`) intentionally get **403** on the orders module — used to
> demonstrate `roleGuard` + backend role middleware.
