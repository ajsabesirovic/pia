import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OrdersService } from '../../core/orders.service';
import { Narudzbenica, ORDER_STATUS_META } from '../../core/models';

/**
 * Order detail + the status state machine actions.
 * Which buttons are enabled depends on the current status, mirroring the
 * backend OrderService transitions:
 *   nacrt   -> poslata | otkazana
 *   poslata -> isporucena | otkazana
 *   isporucena / otkazana -> terminal
 */
@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './order-detail.html',
})
export class OrderDetailComponent {
  private route = inject(ActivatedRoute);
  private orders = inject(OrdersService);

  readonly statusMeta = ORDER_STATUS_META;

  readonly order = signal<Narudzbenica | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly acting = signal(false);

  readonly canSend = computed(() => this.order()?.status === 'nacrt');
  readonly canDeliver = computed(() => this.order()?.status === 'poslata');
  readonly canCancel = computed(
    () => this.order()?.status === 'nacrt' || this.order()?.status === 'poslata',
  );

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.fetch(id);
  }

  private fetch(id: number): void {
    this.loading.set(true);
    this.orders.get(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 403
          ? 'Nemate pristup ovoj narudžbenici.'
          : 'Narudžbenica nije pronađena.');
        this.loading.set(false);
      },
    });
  }

  send(): void {
    this.run(this.orders.send(this.order()!.id), 'Narudžbenica je poslata.');
  }

  deliver(): void {
    this.run(
      this.orders.markDelivered(this.order()!.id),
      'Narudžbenica je isporučena. Zalihe su ažurirane.',
    );
  }

  cancel(): void {
    this.run(this.orders.cancel(this.order()!.id), 'Narudžbenica je otkazana.');
  }

  private run(obs: ReturnType<OrdersService['send']>, okMsg: string): void {
    this.error.set(null);
    this.success.set(null);
    this.acting.set(true);
    obs.subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.success.set(okMsg);
        this.acting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'Akcija nije uspela.');
        this.acting.set(false);
      },
    });
  }
}
