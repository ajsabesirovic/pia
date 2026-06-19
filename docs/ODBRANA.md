# Priprema za odbranu projekta (PIA 2026)

Sve što treba znati i pokazati na odbrani. Profesorov zahtev: pokazati Laravel API + Angular,
demonstrirati komunikaciju, izvršiti manuelno i Postman testiranje, definisati nove test
primere, objasniti klase ekvivalencije i granične vrednosti, i proširiti/izmeniti funkcionalnost.

---

## ⚠️ PODSETNIK — još NIJE urađeno

- [ ] **EER dijagram** — dodati sliku u `docs/` (npr. `docs/eer.png`) iz starog Laravel projekta.
- [ ] **DFD dijagram** — `Dekompozicija_level1.png` već postoji u root-u; **proveriti da se na njemu vide dva procesa**: *Prijava korisnika* i *Obrada narudžbenice*. Po želji premestiti u `docs/` i referencirati u `SSA_EER_MODEL.md`.
- [ ] (opciono) Jednom proći ceo tok u **Postman GUI** da bude komotno za živu demonstraciju.
- [ ] (opciono) `APP_DEBUG=false` u `.env` za demo (da API greške ne vraćaju ceo stack trace).

> Dijagrame NE crtati ponovo — koriste se postojeći iz prethodnog (Laravel) projekta.

---

## 1. Šta smo izabrali (i zašto)

Dva procesa sa prvog nivoa dekompozicije SSA modela:

| Proces | Tip (zahtev) | Zašto |
|--------|--------------|-------|
| **Prijava korisnika** | validacija/obrada unosa | Reactive Forms, validacija, klase ekvivalencije/granične vrednosti |
| **Obrada narudžbenice** | složeniji poslovni proces | mašina stanja, više entiteta i veza, poslovna pravila, side-effect na zalihe |

Narudžbenica je svesno izabrana umesto obične „prikaz“ stranice jer ima: kaskadne padajuće
menije (dobavljač → lekovi), dinamičke stavke (`FormArray`), računanje ukupne vrednosti u
realnom vremenu, mašinu stanja i stvarni efekat na bazu (ažuriranje zaliha).

---

## 2. Arhitektura (jedna rečenica za odbranu)

> „Postojeću Laravel + MySQL aplikaciju nismo menjali. Dodali smo **aditivni JSON API** pod
> `/api/*` (token autentifikacija preko Sanctum-a) koji **ponovo koristi iste Eloquent modele
> i servise** kao stara web aplikacija. Angular SPA komunicira isključivo sa tim API-jem.“

- Backend: `http://localhost:8000` (Laravel 10, PHP 8.2, MySQL)
- Frontend: `http://localhost:4200` (Angular 22, standalone komponente, signals)
- Komunikacija: JSON + `Authorization: Bearer <token>`
- Rute: `routes/api.php`; kontroleri: `app/Http/Controllers/Api/`

---

## 3. Šta pokazati uživo (redosled demonstracije)

1. **Angular login** — prazno polje / pogrešan email format / pogrešna lozinka → pa uspešan login.
2. **Lista narudžbenica** — filter po statusu, paginacija.
3. **Nova narudžbenica** — izbor dobavljača učita njegove lekove i auto-popuni cenu; dodavanje/uklanjanje stavki; ukupna vrednost se računa uživo; snimanje.
4. **Detalj narudžbenice** — mašina stanja: *Pošalji dobavljaču → Označi kao isporučeno* (uveća zalihe) ili *Otkaži*; dugmad se omogućavaju/onemogućavaju po statusu.
5. **Role guard** — login kao `farmaceut1.apoteka1@apoteke.rs` → modul narudžbenica nedostupan (`/forbidden`).
6. **Postman** — uvezi kolekciju iz `docs/postman/` i pokreni Login → Create → Posalji → Isporuceno → Otkazi (422).

---

## 4. Nalozi za prijavu (svi sa lozinkom `password`)

| Email | Uloga | Napomena |
|-------|-------|----------|
| `admin@apoteke.rs` | Centralni admin (C) | mora izabrati apoteku pri kreiranju narudžbenice |
| `admin.apoteka1@apoteke.rs` | Admin apoteke (A) | vezan za apoteku #1 — koristiti za demo narudžbenica |
| `farmaceut1.apoteka1@apoteke.rs` | Farmaceut (F) | namerno blokiran za narudžbenice → demonstrira role guard |
| `korisnik@apoteke.rs` | Registrovani (R) | — |

---

## 5. Rezultati testiranja (već izvršeno 2026-06-17)

**14/14 test primera prošlo.** Detalji u `TEST_REPORT.md`. Ključne tačke:

- **D-01 — pronađen pa ispravljen defekt** (najjači adut za odbranu):
  - API pravilo je dozvoljavalo `cena_po_komadu = 0` (`min:0`), ali baza ima `CHECK (> 0)`.
  - Posledica: HTTP **500** umesto čiste validacije.
  - Ispravka: pravilo promenjeno u `gt:0` u `NarudzbenicaController@store`.
  - Re-test: sada vraća **422** sa jasnom porukom. ✅
  - Ako profesor traži „izmeni/proširi funkcionalnost“, ovo je gotova priča.
- **Side-effect potvrđen nad bazom:** isporuka narudžbenice uvećala zalihe **39 → 44 (+5)**.
- **Autorizacija:** admin apoteke 2 → narudžbenica apoteke 1 = **403**.
- **Mašina stanja:** otkazivanje već isporučene = **422** (nedozvoljen prelaz).

---

## 6. Klase ekvivalencije i granične vrednosti (objasniti svojim rečima)

**Klasa ekvivalencije** = skup ulaza koji se tretiraju isto (npr. svi *nevalidni* email formati →
ista greška), pa je dovoljno testirati jedan predstavnik klase.

**Granična vrednost** = test tačno na ivici dozvoljenog (npr. `kolicina = 0` nevalidno vs
`kolicina = 1` validno; `stavke = 0 komada` vs `1 komad`).

Primeri iz našeg projekta:
- `email`: validan format vs nevalidan (bez `@`) vs prazno → 3 klase.
- `kolicina`: granica 0 (nevalidno) / 1 (validno).
- `cena_po_komadu`: granica 0 (nevalidno, baš zbog D-01) / 0.01+ (validno).
- `stavke[]`: 0 stavki (nevalidno) / ≥1 (validno).
- Mašina stanja: dozvoljeni vs nedozvoljeni prelazi su klase ekvivalencije nad statusima.

Tabela svih klasa i granica: `TEST_PLAN.md`, sekcija 1.

---

## 7. Ako profesor traži NOVI test primer (budi spreman)

Predlozi koje možeš smisliti na licu mesta:
- `kolicina` = veoma velik broj (npr. 1000000) → prolazi (nema gornje granice) — objasni rizik.
- Dva ista leka u dve stavke iste narudžbenice → trenutno dozvoljeno (poslovno pitanje).
- Lek koji **ne pripada** izabranom dobavljaču preko API-ja → vidi defekt **D-02** u izveštaju.
- Login sa email-om u drugačijem registru slova (case sensitivity).
- Token istekao/obrisan → `GET /api/me` vraća 401 (interceptor preusmerava na login).

---

## 8. Ako profesor traži da PROŠIRIŠ/IZMENIŠ funkcionalnost

Lake izmene koje možeš odbraniti:
- **Validacija (D-02):** dodati proveru da `(dobavljac_id, lek_id)` postoji u `dobavljac_lek`.
- **Gornja granica količine:** dodati `max:` pravilo na `kolicina`.
- **Novo polje:** npr. `datum_isporuke` kao očekivani datum pri kreiranju (validacija `after:today`).
- **Novi status/prelaz:** proširiti mašinu stanja (`OrderService::validateStatusTransition`).
- **Frontend:** dodati novu validacionu poruku ili filter na listi.

---

## 9. Gde je šta (mapa fajlova)

| Šta | Gde |
|-----|-----|
| API rute | `routes/api.php` |
| API kontroleri | `app/Http/Controllers/Api/{Auth,Narudzbenica,Reference}Controller.php` |
| Poslovna logika narudžbenica | `app/Services/OrderService.php` (+ `InventoryService`) |
| Angular login | `frontend/src/app/features/login/` |
| Angular narudžbenice | `frontend/src/app/features/orders/` |
| Auth/guard/interceptor | `frontend/src/app/core/` |
| Postman kolekcija | `docs/postman/` |
| Test plan | `docs/TEST_PLAN.md` |
| Izveštaj testiranja | `docs/TEST_REPORT.md` |
| SSA/EER opis | `docs/SSA_EER_MODEL.md` |

---

## 10. Kako pokrenuti (za svaki slučaj)

```bash
export PATH="/opt/homebrew/opt/php@8.2/bin:$PATH"
brew services start mysql
cd /Users/ajsa/Projects/faks/pia
php artisan serve                 # backend :8000  (terminal 1)

cd frontend && npm start          # frontend :4200 (terminal 2)
```
Detalji i troubleshooting: `HOW_TO_RUN.md`.
