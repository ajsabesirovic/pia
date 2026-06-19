import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { OrdersService } from '../../core/orders.service';
import { Narudzbenica, ORDER_STATUS_META, OrderStatus, Paginated } from '../../core/models';

/** Lists purchase orders with a status filter and pagination. */
@Component({
  selector: 'app-order-list',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './order-list.html',
})
export class OrderListComponent {
  private orders = inject(OrdersService);

  readonly statusMeta = ORDER_STATUS_META;
  readonly statuses: OrderStatus[] = ['nacrt', 'poslata', 'isporucena', 'otkazana'];

  readonly page = signal<Paginated<Narudzbenica> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<OrderStatus | ''>('');

  readonly rows = computed(() => this.page()?.data ?? []);

  constructor() {
    this.load();
  }

  load(pageNum = 1): void {
    this.loading.set(true);
    this.error.set(null);
    this.orders.list({ status: this.statusFilter(), page: pageNum }).subscribe({
      next: (res) => {
        this.page.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Greška pri učitavanju narudžbenica.');
        this.loading.set(false);
      },
    });
  }

  onFilterChange(value: string): void {
    this.statusFilter.set(value as OrderStatus | '');
    this.load(1);
  }

  goToPage(n: number): void {
    const p = this.page();
    if (!p || n < 1 || n > p.last_page) return;
    this.load(n);
  }
}
