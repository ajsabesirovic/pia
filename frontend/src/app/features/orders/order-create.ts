import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { OrdersService } from '../../core/orders.service';
import { Apoteka, Dobavljac, DobavljacLek, CreateOrderPayload } from '../../core/models';

/**
 * Create-order form. Demonstrates:
 *  - a dynamic FormArray of order line items (add/remove rows),
 *  - a dependent dropdown (supplier -> its medicines cascade) with price auto-fill,
 *  - a conditionally-required control (pharmacy select, only for the central admin),
 *  - a live computed total.
 */
@Component({
  selector: 'app-order-create',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './order-create.html',
})
export class OrderCreateComponent {
  private fb = inject(FormBuilder);
  private orders = inject(OrdersService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly isCentral = this.auth.hasRole('C');

  readonly dobavljaci = signal<Dobavljac[]>([]);
  readonly apoteke = signal<Apoteka[]>([]);
  /** Medicines available for the currently selected supplier. */
  readonly lekovi = signal<DobavljacLek[]>([]);

  readonly loadingLekovi = signal(false);
  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);

  /** Live order total, recomputed from the FormArray on every change. */
  readonly total = signal(0);

  readonly form: FormGroup = this.fb.group({
    dobavljac_id: [null as number | null, Validators.required],
    apoteka_id: [null as number | null, this.isCentral ? Validators.required : []],
    napomena: [''],
    stavke: this.fb.array([]),
  });

  get stavke(): FormArray<FormGroup> {
    return this.form.get('stavke') as FormArray<FormGroup>;
  }

  readonly canSubmit = computed(() => !this.saving());

  constructor() {
    this.orders.dobavljaci().subscribe((d) => this.dobavljaci.set(d));
    if (this.isCentral) {
      this.orders.apoteke().subscribe((a) => this.apoteke.set(a));
    }

    // Keep the total in sync with any change to the line items.
    this.stavke.valueChanges.subscribe(() => this.recomputeTotal());
  }

  /** Supplier changed: load its catalogue and reset the line items. */
  onDobavljacChange(value: string): void {
    const id = Number(value);
    this.form.patchValue({ dobavljac_id: id || null });
    this.stavke.clear();
    this.lekovi.set([]);
    this.recomputeTotal();

    if (!id) return;

    this.loadingLekovi.set(true);
    this.orders.dobavljacLekovi(id).subscribe({
      next: (l) => {
        this.lekovi.set(l);
        this.loadingLekovi.set(false);
        if (l.length) this.addStavka();
      },
      error: () => this.loadingLekovi.set(false),
    });
  }

  addStavka(): void {
    this.stavke.push(
      this.fb.group({
        lek_id: [null as number | null, Validators.required],
        kolicina: [1, [Validators.required, Validators.min(1)]],
        cena_po_komadu: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeStavka(i: number): void {
    this.stavke.removeAt(i);
    this.recomputeTotal();
  }

  /** When a medicine is chosen, auto-fill the price from the supplier's catalogue. */
  onLekChange(i: number, value: string): void {
    const lekId = Number(value);
    const match = this.lekovi().find((l) => l.lek_id === lekId);
    const row = this.stavke.at(i);
    row.patchValue({
      lek_id: lekId || null,
      cena_po_komadu: match ? Number(match.nabavna_cena) : 0,
    });
  }

  lineTotal(i: number): number {
    const v = this.stavke.at(i).getRawValue();
    return (Number(v.kolicina) || 0) * (Number(v.cena_po_komadu) || 0);
  }

  private recomputeTotal(): void {
    let sum = 0;
    this.stavke.controls.forEach((_, i) => (sum += this.lineTotal(i)));
    this.total.set(sum);
  }

  submit(): void {
    this.serverError.set(null);

    if (this.stavke.length === 0) {
      this.serverError.set('Dodajte bar jednu stavku.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CreateOrderPayload = {
      dobavljac_id: raw.dobavljac_id,
      napomena: raw.napomena || null,
      stavke: raw.stavke.map((s: any) => ({
        lek_id: s.lek_id,
        kolicina: Number(s.kolicina),
        cena_po_komadu: Number(s.cena_po_komadu),
      })),
    };
    if (this.isCentral) payload.apoteka_id = raw.apoteka_id;

    this.saving.set(true);
    this.orders.create(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.router.navigate(['/narudzbenice', created.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.serverError.set(err.error?.message ?? 'Greška pri kreiranju narudžbenice.');
      },
    });
  }
}
