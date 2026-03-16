import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];

    if (expectedRoles.length === 0) {
      return true;
    }

    if (this.authService.hasAnyRole(expectedRoles)) {
      return true;
    }

    const userRole = this.authService.getNormalizedUserRole();
    if (userRole === 'ADMIN') {
      this.router.navigate(['/admin']);
      return false;
    }

    if (userRole === 'SUCURSAL') {
      this.router.navigate(['/sucursal']);
      return false;
    }

    this.authService.logout();
    this.router.navigate(['/login']);
    return false;
  }
}
