import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';

/** Authenticated layout: top navigation bar + routed content. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="brand">💊 Apoteka <span class="muted">SPA</span></div>
      <nav>
        <a routerLink="/narudzbenice" routerLinkActive="active">Narudžbenice</a>
      </nav>
      <div class="spacer"></div>
      @if (auth.user(); as u) {
        <div class="user">
          <span class="name">{{ u.puno_ime }}</span>
          <span class="badge role">{{ u.tip_label }}</span>
        </div>
      }
      <button class="btn btn-ghost btn-sm" (click)="logout()">Odjava</button>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; gap: 1.25rem;
      padding: 0.75rem 1.5rem;
      background: #fff; border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow);
    }
    .brand { font-weight: 700; font-size: 1.1rem; }
    nav a { padding: 0.4rem 0.6rem; border-radius: 6px; color: var(--text); font-weight: 500; }
    nav a.active { background: var(--primary); color: #fff; }
    .user { display: flex; align-items: center; gap: 0.5rem; }
    .name { font-weight: 500; }
    .badge.role { background: #eef2f7; color: var(--muted); }
  `],
})
export class ShellComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
