import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth.service';

/**
 * Login screen.
 * Uses Angular Reactive Forms with validation, posts credentials to the
 * Laravel API, stores the returned Sanctum token and redirects to the app.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Server-side / network error message shown above the form. */
  readonly serverError = signal<string | null>(null);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  /** Helper so the template can show errors only after the field is touched. */
  showError(field: 'email' | 'password'): boolean {
    const c = this.form.controls[field];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading.set(true);

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/narudzbenice']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(this.extractMessage(err));
      },
    });
  }

  private extractMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Server nije dostupan. Proverite da li backend radi na portu 8000.';
    }
    // Laravel validation error shape: { message, errors: { email: [...] } }
    const emailErrors = err.error?.errors?.email;
    if (Array.isArray(emailErrors) && emailErrors.length) return emailErrors[0];
    return err.error?.message ?? 'Prijava nije uspela. Pokušajte ponovo.';
  }
}
