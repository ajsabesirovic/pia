import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_URL, TOKEN_KEY } from './config';
import { LoginResponse, User, UserType } from './models';

const USER_KEY = 'farmacy_user';

/**
 * Holds authentication state for the SPA: the Sanctum bearer token and the
 * current user. State is kept in signals (for reactive templates) and mirrored
 * to localStorage so a page refresh keeps the user logged in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  /** Current user as a signal; null when logged out. */
  readonly user = signal<User | null>(this.readStoredUser());
  readonly isLoggedIn = computed(() => this.user() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_URL}/login`, { email, password })
      .pipe(tap((res) => this.persistSession(res.token, res.user)));
  }

  logout(): Observable<unknown> {
    // Tell the backend to revoke the token, then clear local state regardless.
    return this.http.post(`${API_URL}/logout`, {}).pipe(tap({
      next: () => this.clearSession(),
      error: () => this.clearSession(),
    }));
  }

  /** Local-only logout fallback (e.g. on a 401 from the interceptor). */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: UserType[]): boolean {
    const u = this.user();
    return !!u && roles.includes(u.tip);
  }

  private persistSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  private readStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
