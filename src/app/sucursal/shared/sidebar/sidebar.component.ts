import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sucursal-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SucursalSidebarComponent {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() toggle = new EventEmitter<boolean>();
  @Output() closeMobile = new EventEmitter<void>();

  sucursalNombre = '';
  cajeroNombre = '';
  cajeroIniciales = '';

  constructor(private authService: AuthService, private router: Router) {
    const token = this.authService.getDecodedToken();
    this.sucursalNombre = token?.branchName || 'Mi Sucursal';
    this.cajeroNombre   = token?.name        || 'Usuario';
    this.cajeroIniciales = this.cajeroNombre
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'pi pi-layout',        route: '/sucursal/dashboard' },
    { label: 'Inventario',   icon: 'pi pi-box',           route: '/sucursal/inventario' },
    { label: 'Traslados',    icon: 'pi pi-arrows-h',      route: '/sucursal/traslados', badge: 2 },
    { label: 'Cambios',      icon: 'pi pi-refresh',       route: '/sucursal/cambios' },
    { label: 'Devoluciones', icon: 'pi pi-reply',         route: '/sucursal/devoluciones' },
  ];

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.toggle.emit(this.collapsed);
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}