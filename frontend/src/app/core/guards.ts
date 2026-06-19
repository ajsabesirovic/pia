import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { UserType } from './models';

/** Blocks a route unless the user is authenticated. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

/**
 * Factory that builds a role guard. Use as `roleGuard('A', 'C')` in route data.
 * Redirects authenticated-but-unauthorized users to /forbidden.
 */
export const roleGuard = (...roles: UserType[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
    if (auth.hasRole(...roles)) return true;
    return router.createUrlTree(['/forbidden']);
  };
};
