import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { HeaderComponent } from './shared/header/header.component';
import { filter } from 'rxjs/operators';

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  'admin/dashboard':     { title: 'Dashboard',      subtitle: 'Visión general del inventario y métricas clave' },
  'admin/inventario':    { title: 'Inventario',     subtitle: 'Controla tu stock y niveles de existencias' },
  'admin/productos':     { title: 'Productos',      subtitle: 'Administra productos, precios y categorías' },
  'admin/categorias':    { title: 'Categorías',     subtitle: 'Organiza productos por tipo y familia' },
  'admin/sucursales':    { title: 'Sucursales',     subtitle: 'Gestiona tus puntos de venta y su actividad' },
  'admin/reportes':      { title: 'Reportes',       subtitle: 'Genera informes de ventas e inventario' },
  'admin/configuracion': { title: 'Configuración',  subtitle: 'Ajusta las preferencias y permisos del sistema' },
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  sidebarCollapsed = false;
  sidebarMobileOpen = false;
  pendingAlerts = 3;
  currentTitle = 'Dashboard';
  currentSubtitle = 'Visión general del inventario y métricas clave';

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        const path = nav.urlAfterRedirects.replace(/^[\/]/, '').split('?')[0];
        const meta = routeMeta[path];
        if (meta) {
          this.currentTitle = meta.title;
          this.currentSubtitle = meta.subtitle;
        }
      });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar() {
    this.sidebarMobileOpen = !this.sidebarMobileOpen;
  }

  closeMobileSidebar() {
    this.sidebarMobileOpen = false;
  }
}