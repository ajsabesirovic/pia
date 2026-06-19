# Dokumentacija projekta (PIA 2026)

Dokumenti koji pokrivaju zahteve iz `proffesor_task.md` (testiranje + modelovanje), pored
same implementacije (Laravel API + Angular SPA).

| Dokument | Šta pokriva (zahtev profesora) |
|----------|--------------------------------|
| [`ODBRANA.md`](ODBRANA.md) | **Priprema za odbranu** — sve što treba pokazati i znati + podsetnik za dijagrame |
| [`SSA_EER_MODEL.md`](SSA_EER_MODEL.md) | Opis dva procesa iz SSA modela + tabele i veze iz EER modela |
| [`TEST_PLAN.md`](TEST_PLAN.md) | Test plan: klase ekvivalencije i granične vrednosti, 12 test primera |
| [`TEST_REPORT.md`](TEST_REPORT.md) | Izveštaj testiranja + opis pronađenih grešaka/defekata |
| [`postman/`](postman/) | API testiranje Postman-om (kolekcija + okruženje) |
| [`../ANGULAR_IMPLEMENTATION.md`](../ANGULAR_IMPLEMENTATION.md) | Angular frontend forme/servisi + komunikacija sa Laravel API-jem |

## Izabrana dva procesa
1. **Prijava korisnika** — validacija i obrada korisničkog unosa.
2. **Obrada narudžbenice** — složeniji poslovni proces (mašina stanja, više entiteta i pravila).

## Pokretanje testova
1. Pokreni backend (`php artisan serve`) i bazu (sa `migrate --seed`).
2. U Postman-u uvezi `postman/IS_Farmacy_API.postman_collection.json` i
   `postman/IS_Farmacy_Local.postman_environment.json`, izaberi okruženje „IS Farmacy - Local“.
3. Pokreni redom: Login → Create order → Posalji → Isporuceno → (Otkazi = 422).
4. Rezultate upiši u `TEST_REPORT.md`.

## Za odbranu (checklist profesora)
- [x] Laravel API rute (`routes/api.php`) + Angular frontend
- [x] Komunikacija Angular ↔ Laravel (JSON, Bearer token)
- [x] Manuelno i Postman testiranje
- [x] Klase ekvivalencije i granične vrednosti (TEST_PLAN)
- [x] ≥ 8–10 test primera (ima 12)
- [x] Izveštaj + defekti (TEST_REPORT, D-01/D-02)
- [ ] Iscrtati DFD i EER dijagram prema `SSA_EER_MODEL.md` (slika za odbranu)
