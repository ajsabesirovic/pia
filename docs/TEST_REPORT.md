# Izveštaj o testiranju — IS Farmacy (PIA)

Okruženje: Laravel backend `http://localhost:8000`, MySQL baza (seed podaci),
izvršeno preko REST poziva (curl/Postman) + provera baze.
**Datum testiranja:** 2026-06-17.

> Rezultati ispod su **stvarno izmereni** pokretanjem backend-a i slanjem zahteva.
> Iste rezultate daje i Postman kolekcija (`docs/postman/`) — preporučeno demonstrirati na odbrani.

---

## 1. Rezime

| Proces | Broj TC | Prošlo | Palo | Napomena |
|--------|---------|--------|------|----------|
| Prijava | 6 (TC-01..05, TC-13) | 6 | 0 | sve prošlo |
| Narudžbenica | 8 (TC-06..12, TC-14) | 8 | 0 | D-01 ispravljen i re-testiran |

**Ukupno: 14/14 test primera prošlo.** Defekt D-01 pronađen, ispravljen i potvrđen re-testom.

---

## 2. Detaljni rezultati

| ID | Očekivano | Stvarni rezultat | Status |
|----|-----------|------------------|--------|
| TC-01 | 200 + token + user (`admin.apoteka1@apoteke.rs` / `password`) | **200**, vraćen `token` + `user` (tip=A, apoteka_id=1) | ✅ |
| TC-02 | 422, greška `email` | **422**, „Polje email mora biti validna email adresa.“ | ✅ |
| TC-03 | 422, greške `email`+`password` | **422**, greške na `email` i `password` (lozinka) | ✅ |
| TC-04 | 422, „Pogrešni podaci za prijavu.“ | **422**, „Pogrešni podaci za prijavu.“ | ✅ |
| TC-05 | 401 Unauthorized | **401**, „Unauthenticated.“ | ✅ |
| TC-13 | 422, „Vaš nalog je deaktiviran.“ | **422**, „Vaš nalog je deaktiviran.“ (nalog vraćen u aktivno stanje posle testa) | ✅ |
| TC-06 | 201, status `nacrt`, ukupno 600.00 | **201**, `broj=NAR-20260617-5FJI`, status `nacrt`, `ukupna_vrednost=600.00` | ✅ |
| TC-07 | 422, greška `stavke` | **422**, „Polje stavke je obavezno.“ | ✅ |
| TC-08 | 422, greška `stavke.0.kolicina` | **422**, „Polje stavke.0.kolicina mora biti najmanje 1.“ | ✅ |
| TC-09 | 422, greška `dobavljac_id` | **422**, „Izabrana vrednost za dobavljac nije validna.“ | ✅ |
| TC-10 | 200, status `poslata` | **200**, status `poslata` | ✅ |
| TC-11 | 200, status `isporučena`, zalihe uvećane | **200**, status `isporučena`; zalihe (apoteka 1, lek 1): **39 → 44 (+5)** | ✅ |
| TC-12 | 422, nedozvoljen prelaz | **422**, „Nije moguće otkazati narudžbenicu sa statusom: Isporučena“ | ✅ |
| TC-14 | 403 Forbidden | **403**, „Nemate pristup ovoj narudžbenici.“ (admin apoteke 2 → narudžbenica apoteke 1) | ✅ |

---

## 3. Pronađeni defekti

### D-01 — Cena po komadu = 0 prolazi validaciju ali ruši upis u bazu
- **Ozbiljnost:** srednja
- **Gde:** `app/Http/Controllers/Api/NarudzbenicaController@store`
- **Opis:** API pravilo je `stavke.*.cena_po_komadu => required|numeric|min:0`, ali baza ima
  ograničenje `CHECK (cena_po_komadu > 0)` na tabeli `stavke_narudzbenice`. Ako se pošalje
  `cena_po_komadu = 0`, validacija **prolazi**, a zatim upis pada na DB constraint-u i vraća
  se **HTTP 500** umesto čiste poruke **422**.
- **Koraci za reprodukciju:** kreiraj narudžbenicu sa `{lek_id:1, kolicina:1, cena_po_komadu:0}`.
- **Očekivano:** 422 sa jasnom porukom da cena mora biti veća od 0.
- **Predlog ispravke:** promeniti pravilo u `gt:0` da se uskladi sa bazom.
- **STATUS: ISPRAVLJENO i POTVRĐENO.** Pravilo u `NarudzbenicaController@store` promenjeno sa
  `min:0` na `gt:0`. Re-test (2026-06-17) sa `cena_po_komadu: 0` vratio je **422**:
  „Polje stavke.0.cena_po_komadu mora biti vece od 0.“ (pre ispravke bi se dobio HTTP 500).

### D-02 (potencijalno) — Lek nije vezan za izabranog dobavljača
- **Ozbiljnost:** niska
- **Opis:** `store` validira da `lek_id` postoji u `lekovi`, ali ne i da taj lek pripada
  izabranom dobavljaču (`dobavljac_lek`). Moguće je ručno (preko API-ja) naručiti lek koji
  dobavljač ne nudi. UI to sprečava kaskadnim padajućim menijem, ali API ne.
- **Predlog:** dodatno proveriti postojanje para (`dobavljac_id`, `lek_id`) u `dobavljac_lek`.

> Ako se prilikom odbrane traži proširenje funkcionalnosti, D-01 je idealan kandidat —
> jednolinijska izmena validacionog pravila + ponovni test (TC sa cenom 0).

---

## 4. Zaključak

Svih **14 test primera je prošlo** (2026-06-17). Oba procesa funkcionišu u skladu sa
definisanim poslovnim pravilima; validacija i autorizacija rade na backend-u (autoritativno)
i na frontend-u (UX). Poslovni side-effect je potvrđen nad bazom: isporuka narudžbenice
uvećava zalihe (39 → 44). Identifikovan je jedan stvarni defekt (D-01) koji je **ispravljen i
re-testiran**, i jedna potencijalna nedoslednost (D-02) sa predloženom ispravkom.
