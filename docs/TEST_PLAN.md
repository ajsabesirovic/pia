# Test plan — IS Farmacy (PIA)

Predmet testiranja: dva procesa REST API-ja i Angular formi.
- **Proces 1:** Prijava korisnika (validacija unosa) — `POST /api/login`, forma `login`.
- **Proces 2:** Obrada narudžbenice (poslovni proces) — `Api\NarudzbenicaController`, forma `order-create` + akcije.

Tehnike: **klase ekvivalencije (EC)** i **analiza graničnih vrednosti (BVA)**.
Alati: Postman (API), manuelno testiranje kroz Angular aplikaciju.
Ukupno: **12 test primera** (zahtev je 8–10).

---

## 1. Analiza ulaza — klase ekvivalencije i granične vrednosti

### Proces 1 — Prijava

| Polje | Validne klase (EC) | Nevalidne klase (EC) | Granične vrednosti (BVA) |
|-------|--------------------|----------------------|--------------------------|
| `email` | ispravan format `x@y.z`, postojeći nalog | prazno; bez `@`; samo razmaci; nepostojeći nalog | min 1 znak; bez domena |
| `password` | tačna lozinka (min 4 znaka na FE) | prazno; pogrešna lozinka; < 4 znaka (FE) | dužina 3 (nevalidno) / 4 (validno) na FE validaciji |
| nalog | `aktivan = true` | `aktivan = false` | — |

### Proces 2 — Narudžbenica

| Polje | Validne klase (EC) | Nevalidne klase (EC) | Granične vrednosti (BVA) |
|-------|--------------------|----------------------|--------------------------|
| `dobavljac_id` | postoji u `dobavljaci` | nedostaje; ne postoji (npr. 999999) | — |
| `apoteka_id` (samo C) | postoji; obavezno za centralnog admina | nedostaje kad je korisnik C | — |
| `stavke[]` | 1..N stavki | prazan niz `[]`; nedostaje | min = 1 (validno), 0 (nevalidno) |
| `stavke.*.kolicina` | ceo broj ≥ 1 | 0; negativan; decimalan; prazno | 0 (nevalidno) / 1 (validno) |
| `stavke.*.cena_po_komadu` | broj ≥ 0 | negativan; prazno | -0.01 (nevalidno) / 0 (validno na API min:0) |
| status (prelaz) | dozvoljen prelaz | nedozvoljen (npr. otkaži isporučenu) | granice mašine stanja |

---

## 2. Test primeri

Legenda statusa: očekivani HTTP kod + ponašanje.

### Proces 1 — Prijava

| ID | Opis / klasa | Ulaz | Očekivani rezultat |
|----|--------------|------|--------------------|
| **TC-01** | Validan login (pozitivan) | email=`admin.apoteka1@apoteke.rs`, password=`password` (seed: admin apoteke A) | **200**, vraća `token` + `user`; Angular preusmerava na `/narudzbenice` |
| **TC-02** | Nevalidan format email-a (EC nevalidno) | email=`admin.apoteka1-apoteke.rs`, password=`password` | **422**, greška na polju `email`; FE prikazuje „unesite ispravan email“ |
| **TC-03** | Prazna polja (BVA — min) | email=``, password=`` | **422**, greške na `email` i `password`; FE dugme onemogućeno dok je forma nevalidna |
| **TC-04** | Pogrešna lozinka (EC nevalidno) | email=`admin.apoteka1@apoteke.rs`, password=`pogresna` | **422**, „Pogrešni podaci za prijavu.“ |
| **TC-05** | Pristup zaštićenom resursu bez tokena | `GET /api/me` bez `Authorization` | **401** Unauthorized; FE interceptor preusmerava na `/login` |
| **TC-13*** | Deaktiviran nalog (EC nevalidno) | validni kredencijali naloga sa `aktivan=false` | **422**, „Vaš nalog je deaktiviran.“ |

\* TC-13 je dodatni (manuelni) primer; zahteva seed nalog sa `aktivan=false`.

### Proces 2 — Narudžbenica

| ID | Opis / klasa | Ulaz | Očekivani rezultat |
|----|--------------|------|--------------------|
| **TC-06** | Validno kreiranje (pozitivan) | `dobavljac_id=1`, `stavke=[{lek_id:1, kolicina:5, cena:120}]` | **201**, status `nacrt`, `ukupna_vrednost=600.00` |
| **TC-07** | Prazne stavke (BVA — 0 stavki) | `dobavljac_id=1`, `stavke=[]` | **422**, greška na `stavke` (min 1) |
| **TC-08** | Količina = 0 (BVA donja granica) | `stavke=[{lek_id:1, kolicina:0, cena:120}]` | **422**, greška na `stavke.0.kolicina` (min 1) |
| **TC-09** | Nepostojeći dobavljač (EC nevalidno) | `dobavljac_id=999999` | **422**, greška na `dobavljac_id` (exists) |
| **TC-10** | Prelaz nacrt → poslata (validan) | `POST /narudzbenice/{id}/posalji` | **200**, status `poslata` |
| **TC-11** | Prelaz poslata → isporučena (validan, side-effect) | `POST /narudzbenice/{id}/isporuceno` | **200**, status `isporučena`; zalihe apoteke uvećane za naručene količine |
| **TC-12** | Nedozvoljen prelaz (mašina stanja) | otkaži već isporučenu: `POST /narudzbenice/{id}/otkazi` | **422**, poruka da nije moguće otkazati isporučenu |
| **TC-14*** | Autorizacija — tuđa apoteka | admin apoteke A traži narudžbenicu druge apoteke | **403** Forbidden |

\* TC-14 je dodatni autorizacioni primer (manuelni).

---

## 3. Redosled izvršavanja (Postman)

1. `Auth / Login (valid)` → snima `{{token}}`.
2. `Narudzbenice / Create order (valid)` → snima `{{narudzbenica_id}}`.
3. `Posalji` → `Oznaci isporuceno` → `Otkazi vec isporucenu` (TC-12 očekuje 422).
4. Negativni primeri (TC-02..09) mogu se pokretati nezavisno.

Kolekcija: `docs/postman/IS_Farmacy_API.postman_collection.json`
Okruženje: `docs/postman/IS_Farmacy_Local.postman_environment.json`

> Seed nalozi (svi sa lozinkom `password`):
> - Centralni admin (C): `admin@apoteke.rs` — pri kreiranju narudžbenice **mora** poslati `apoteka_id`
> - Admin apoteke (A): `admin.apoteka1@apoteke.rs` — preporučen za TC-06..12 (ne šalje `apoteka_id`)
> - Farmaceut (F): `farmaceut1.apoteka1@apoteke.rs` — nema pristup modulu narudžbenica (403)
> - Registrovani (R): `korisnik@apoteke.rs`
>
> Pre pokretanja proveriti da su pokrenuti `php artisan migrate --seed` i da `dobavljac_id=1`,
> `lek_id=1` postoje (vidi `database/seeders`).
