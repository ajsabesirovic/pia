import { Routes } from '@angular/router';

import { authGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'narudzbenice' },
      {
        path: 'narudzbenice',
        canActivate: [roleGuard('A', 'C')],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/orders/order-list').then((m) => m.OrderListComponent),
          },
          {
            path: 'nova',
            loadComponent: () =>
              import('./features/orders/order-create').then((m) => m.OrderCreateComponent),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/orders/order-detail').then((m) => m.OrderDetailComponent),
          },
        ],
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./shell/forbidden').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
