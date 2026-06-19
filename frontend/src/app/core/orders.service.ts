import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import {
  Apoteka,
  CreateOrderPayload,
  Dobavljac,
  DobavljacLek,
  Narudzbenica,
  OrderStatus,
  Paginated,
} from './models';

/** All HTTP calls for the purchase-orders module + its reference data. */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);

  list(opts: { status?: OrderStatus | ''; page?: number } = {}): Observable<Paginated<Narudzbenica>> {
    let params = new HttpParams();
    if (opts.status) params = params.set('status', opts.status);
    if (opts.page) params = params.set('page', String(opts.page));
    return this.http.get<Paginated<Narudzbenica>>(`${API_URL}/narudzbenice`, { params });
  }

  get(id: number): Observable<Narudzbenica> {
    return this.http.get<Narudzbenica>(`${API_URL}/narudzbenice/${id}`);
  }

  create(payload: CreateOrderPayload): Observable<Narudzbenica> {
    return this.http.post<Narudzbenica>(`${API_URL}/narudzbenice`, payload);
  }

  send(id: number): Observable<Narudzbenica> {
    return this.http.post<Narudzbenica>(`${API_URL}/narudzbenice/${id}/posalji`, {});
  }

  markDelivered(id: number): Observable<Narudzbenica> {
    return this.http.post<Narudzbenica>(`${API_URL}/narudzbenice/${id}/isporuceno`, {});
  }

  cancel(id: number): Observable<Narudzbenica> {
    return this.http.post<Narudzbenica>(`${API_URL}/narudzbenice/${id}/otkazi`, {});
  }

  // --- reference data for the order form ---

  dobavljaci(): Observable<Dobavljac[]> {
    return this.http.get<Dobavljac[]>(`${API_URL}/dobavljaci`);
  }

  dobavljacLekovi(dobavljacId: number): Observable<DobavljacLek[]> {
    return this.http.get<DobavljacLek[]>(`${API_URL}/dobavljaci/${dobavljacId}/lekovi`);
  }

  apoteke(): Observable<Apoteka[]> {
    return this.http.get<Apoteka[]>(`${API_URL}/apoteke`);
  }
}
