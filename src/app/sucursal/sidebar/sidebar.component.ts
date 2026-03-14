import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // ajusta la ruta si es necesario

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

constructor(private authService: AuthService, private router: Router) {
  this.sucursalNombre = this.authService.getDecodedToken()?.branchName || 'Mi Sucursal';
}

  navItems: NavItem[] = [
    { label: 'Dashboard',     icon: 'pi pi-chart-line',    route: '/sucursal/dashboard' },
    { label: 'Inventario',    icon: 'pi pi-box',           route: '/sucursal/inventario' },
    { label: 'Ventas',        icon: 'pi pi-shopping-cart', route: '/sucursal/ventas' },
    { label: 'Cambios',       icon: 'pi pi-refresh',       route: '/sucursal/cambios' },
    { label: 'Devoluciones',  icon: 'pi pi-reply',         route: '/sucursal/devoluciones' },
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