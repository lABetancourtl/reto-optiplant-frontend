import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';import { AuthService } from '../../../services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() toggle = new EventEmitter<boolean>();
  @Output() closeMobile = new EventEmitter<void>();

  constructor(private authService: AuthService, private router: Router) {}

  mainNavItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/admin/dashboard' },
    { label: 'Inventario', icon: 'pi pi-box', route: '/admin/inventario', badge: 12 },
    { label: 'Ingreso', icon: 'pi pi-truck', route: '/admin/abastecimiento' },
    { label: 'Traslados', icon: 'pi pi-arrows-h', route: '/admin/traslados' },
    { label: 'Categorias', icon: 'pi pi-sitemap', route: '/admin/categorias' },
    { label: 'Productos', icon: 'pi pi-tags', route: '/admin/productos' },
    { label: 'Sucursales', icon: 'pi pi-building', route: '/admin/sucursales' },
    { label: 'Usuarios', icon: 'pi pi-users', route: '/admin/usuarios' },
    { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reportes' },
  ];

  systemNavItems: NavItem[] = [
    { label: 'Configuración', icon: 'pi pi-cog', route: '/admin/configuracion' },
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