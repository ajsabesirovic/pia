# SSA i EER model — opis dva izabrana procesa

> Ovaj dokument rekonstruisan je iz postojeće baze podataka (migracije, modeli, servisi)
> postojeće Laravel aplikacije `is_farmacy`. Dijagrame (DFD i EER) iscrtati prema ovim
> opisima u alatu po izboru (npr. draw.io / MySQL Workbench) i priložiti uz projekat.

Sistem: **Informacioni sistem lanca apoteka (IS Farmacy)**.
Tipovi korisnika (kolona `korisnici.tip`):
- `F` — Farmaceut
- `A` — Admin apoteke
- `C` — Centralni admin
- `R` — Registrovani korisnik

---

## 1. SSA model — dekompozicija (DFD)

### Kontekstni dijagram (nivo 0)
Spoljni akteri: **Korisnik (Farmaceut / Admin apoteke / Centralni admin / Registrovani korisnik)**
i **Dobavljač**. Svi komuniciraju sa jednim procesom *IS Farmacy*, koji čita/upisuje u
skladišta podataka (baza MySQL).

### Prvi nivo dekompozicije (glavni procesi)
Iz ovog nivoa biramo **dva procesa** koja su implementirana i testirana:

| # | Proces (prvi nivo) | Tip | Status u projektu |
|---|--------------------|-----|-------------------|
| 1 | **Prijava korisnika** (deo Upravljanja korisnicima) | validacija/obrada unosa | ✅ izabran |
| 2 | **Obrada narudžbenice** | složeniji poslovni proces | ✅ izabran |
| 3 | Upravljanje zalihama | — | postoji u sistemu, nije fokus |
| 4 | Obrada prodaje / izdavanje leka | — | postoji u sistemu, nije fokus |
| 5 | Upravljanje receptima | — | postoji u sistemu, nije fokus |

---

## 2. Proces 1 — Prijava korisnika (validacija unosa)

**Opis procesa (SSA):** Korisnik unosi *email* i *lozinku*. Proces validira format unosa,
proverava kredencijale u skladištu **Korisnici**, proverava da li je nalog aktivan i, ako je
sve ispravno, izdaje pristupni token (Sanctum) i vraća podatke o korisniku. U suprotnom vraća
poruku o grešci.

- **Ulazni tok podataka:** `email`, `password`
- **Izlazni tok podataka:** `token`, `user` (id, ime, prezime, email, tip, apoteka) **ili** poruka o grešci
- **Skladište podataka:** `korisnici` (čitanje), upis `poslednja_prijava`
- **Poslovna pravila:**
  1. `email` je obavezan i mora biti validnog formata.
  2. `password` je obavezan.
  3. Kredencijali se proveravaju nad `lozinka_hash` (bcrypt).
  4. Nalog mora biti aktivan (`aktivan = true`), inače pristup nije dozvoljen.

**Backend:** `POST /api/login` → `Api\AuthController::login`
**Frontend:** `features/login` (Reactive Form + validacija + interceptor + guard)

---

## 3. Proces 2 — Obrada narudžbenice (složeniji poslovni proces)

**Opis procesa (SSA):** Admin apoteke (ili centralni admin) kreira narudžbenicu prema
izabranom **dobavljaču**, dodaje jednu ili više **stavki** (lek, količina, nabavna cena),
sistem računa ukupnu vrednost i čuva narudžbenicu u statusu `nacrt`. Narudžbenica zatim
prolazi kroz **mašinu stanja**: `nacrt → poslata → isporučena`, sa mogućim grananjem na
`otkazana`. Pri prelazu u `isporučena`, ažuriraju se **zalihe** apoteke.

- **Ulazni tokovi:** `dobavljac_id`, `apoteka_id` (samo centralni admin), `napomena`, lista `stavke[]`
- **Izlazni tokovi:** kreirana/izmenjena narudžbenica (JSON), poruke o greškama
- **Skladišta podataka:** `narudzbenice`, `stavke_narudzbenice` (upis), `dobavljaci`,
  `dobavljac_lek`, `lekovi`, `apoteke` (čitanje), `zalihe` (upis pri isporuci)
- **Povezane aktivnosti:** kreiranje → slanje dobavljaču → prijem/isporuka → (ažuriranje zaliha)
  ili otkazivanje.
- **Poslovna pravila:**
  1. Narudžbenica mora imati bar jednu stavku.
  2. Količina > 0, cena po komadu > 0.
  3. `broj_narudzbenice` se generiše automatski i jedinstven je.
  4. `ukupna_vrednost = Σ(kolicina × cena_po_komadu)`.
  5. Dozvoljeni prelazi: `nacrt→{poslata, otkazana}`, `poslata→{isporučena, otkazana}`;
     `isporučena` i `otkazana` su završna stanja (nema prelaza).
  6. Isporuka je moguća samo iz statusa `poslata` i tada uvećava zalihe.
  7. Admin apoteke vidi/menja samo narudžbenice **svoje** apoteke (autorizacija).

**Backend:** `Api\NarudzbenicaController` + `OrderService` (+ `InventoryService`)
**Frontend:** `features/orders` (lista, kreiranje sa `FormArray`, detalj sa akcijama stanja)

---

## 4. EER model — tabele i veze (relevantne za oba procesa)

### Entiteti i ključni atributi

**korisnici** (`id` PK)
`ime, prezime, email` (UNIQUE), `lozinka_hash, aktivan, datum_kreiranja, poslednja_prijava,`
`apoteka_id` (FK→apoteke, NULL), `tip` ∈ {F,A,C,R}

**apoteke** (`id` PK)
`naziv, adresa, grad, telefon, email, aktivna`

**dobavljaci** (`id` PK)
`naziv, pib` (UNIQUE), `telefon, email, aktivan`

**lekovi** (`id` PK)
`naziv, proizvodjac, jkl_sifra` (UNIQUE), `farm_oblik, jacina, pakovanje, na_recept`

**dobavljac_lek** (PK složeni: `dobavljac_id, lek_id`) — veza M:N + cenovnik
`nabavna_cena` (CHECK > 0)

**narudzbenice** (`id` PK)
`broj_narudzbenice` (UNIQUE), `datum_kreiranja, datum_isporuke, status` ∈ {nacrt,poslata,isporucena,otkazana},
`napomena, ukupna_vrednost,`
`apoteka_id` (FK→apoteke, RESTRICT), `dobavljac_id` (FK→dobavljaci, RESTRICT), `korisnik_id` (FK→korisnici, RESTRICT)

**stavke_narudzbenice** (PK složeni: `narudzbenica_id, redni_broj`)
`lek_id` (FK→lekovi, RESTRICT), `kolicina` (CHECK > 0), `cena_po_komadu` (CHECK > 0),
`narudzbenica_id` (FK→narudzbenice, CASCADE)

**zalihe** (PK složeni: `apoteka_id, lek_id`)
`kolicina` (CHECK ≥ 0), `prodajna_cena` (CHECK > 0), `min_zaliha, datum_azuriranja`

### Kardinalnosti (veze)

```
apoteke 1 ──< korisnici            (apoteka ima više korisnika; korisnik 0..1 apoteku)
apoteke 1 ──< narudzbenice         (apoteka ima više narudžbenica)
dobavljaci 1 ──< narudzbenice      (dobavljač isporučuje više narudžbenica)
korisnici 1 ──< narudzbenice       (korisnik kreira više narudžbenica)
narudzbenice 1 ──< stavke_narudzbenice   (narudžbenica ima 1..* stavki)
lekovi 1 ──< stavke_narudzbenice
dobavljaci M ──< dobavljac_lek >── M lekovi   (M:N, atribut: nabavna_cena)
apoteke M ──< zalihe >── M lekovi             (M:N, atributi: kolicina, prodajna_cena)
```

Ova dva procesa zajedno pokrivaju: validaciju korisničkog unosa (Proces 1) i složeni poslovni
tok sa više entiteta, veza i poslovnih pravila (Proces 2), što odgovara zahtevu profesora.
