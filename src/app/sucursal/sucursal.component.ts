import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SucursalSidebarComponent } from './shared/sidebar/sidebar.component';
import { HeaderComponent } from './shared/header/header.component';

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  'sucursal/dashboard':    { title: 'Dashboard',               subtitle: 'Resumen del turno actual' },
  'sucursal/inventario':   { title: 'Inventario',              subtitle: 'Consulta y estado del stock en tienda' },
  'sucursal/traslados':    { title: 'Solicitudes de Traslado', subtitle: 'Pide reabastecimiento desde bodega' },
  'sucursal/cambios':      { title: 'Cambios',                 subtitle: 'Registro de cambios de talla y modelo' },
  'sucursal/devoluciones': { title: 'Devoluciones',            subtitle: 'Gestión de devoluciones de clientes' },
};

@Component({
  selector: 'app-sucursal',
  standalone: true,
  imports: [CommonModule, RouterModule, SucursalSidebarComponent, HeaderComponent],
  templateUrl: './sucursal.component.html',
  styleUrl: './sucursal.component.css'
})
export class SucursalComponent {
  sidebarCollapsed = false;
  sidebarMobileOpen = false;
  pendingAlerts = 3;
  currentTitle = 'Dashboard';
  currentSubtitle = 'Resumen del turno actual';

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const path = e.urlAfterRedirects.replace(/^\//, '').split('?')[0];
        const meta = routeMeta[path];
        if (meta) {
          this.currentTitle    = meta.title;
          this.currentSubtitle = meta.subtitle;
        }
      });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.sidebarMobileOpen = !this.sidebarMobileOpen;
  }

  closeMobileSidebar(): void {
    this.sidebarMobileOpen = false;
  }
}