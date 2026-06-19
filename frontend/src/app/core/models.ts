/** Domain models mirroring the JSON returned by the Laravel API. */

export type UserType = 'F' | 'A' | 'C' | 'R';

export type OrderStatus = 'nacrt' | 'poslata' | 'isporucena' | 'otkazana';

export interface Apoteka {
  id: number;
  naziv: string;
  adresa?: string;
  grad?: string;
  telefon?: string;
  email?: string;
  aktivna?: boolean;
}

export interface User {
  id: number;
  ime: string;
  prezime: string;
  puno_ime: string;
  email: string;
  tip: UserType;
  tip_label: string;
  apoteka_id: number | null;
  apoteka: Apoteka | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Dobavljac {
  id: number;
  naziv: string;
  pib?: string;
  telefon?: string;
  email?: string;
  aktivan?: boolean;
}

/** A medicine offered by a supplier (the supplier -> medicine cascade). */
export interface DobavljacLek {
  lek_id: number;
  naziv: string;
  jkl_sifra: string;
  jacina: string | null;
  farm_oblik: string | null;
  nabavna_cena: string | number;
}

export interface Lek {
  id: number;
  naziv: string;
  jkl_sifra: string;
  jacina?: string | null;
  farm_oblik?: string | null;
  proizvodjac?: string | null;
}

export interface StavkaNarudzbenice {
  narudzbenica_id: number;
  redni_broj: number;
  lek_id: number;
  kolicina: number;
  cena_po_komadu: string | number;
  lek?: Lek;
}

export interface Narudzbenica {
  id: number;
  broj_narudzbenice: string;
  datum_kreiranja: string;
  datum_isporuke: string | null;
  status: OrderStatus;
  napomena: string | null;
  apoteka_id: number;
  dobavljac_id: number;
  korisnik_id: number;
  ukupna_vrednost: string | number;
  apoteka?: Apoteka;
  dobavljac?: Dobavljac;
  korisnik?: User;
  stavke?: StavkaNarudzbenice[];
}

/** Shape of Laravel's `paginate()` JSON response. */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Payload sent when creating a new order. */
export interface CreateOrderPayload {
  dobavljac_id: number;
  apoteka_id?: number;
  napomena?: string | null;
  stavke: {
    lek_id: number;
    kolicina: number;
    cena_po_komadu: number;
  }[];
}

/** Human-readable labels + bootstrap-ish colors for each status. */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  nacrt: { label: 'Nacrt', color: '#6c757d' },
  poslata: { label: 'Poslata', color: '#0dcaf0' },
  isporucena: { label: 'Isporučena', color: '#198754' },
  otkazana: { label: 'Otkazana', color: '#dc3545' },
};
