import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  readonly stats = {
    ventasHoy: 0,
    trasladosPendientes: 0,
    productosBajoStock: 0
  };

  readonly quickActions = [
    { title: 'Registrar venta', description: 'Crea una venta y registra productos', icon: 'pi pi-shopping-cart', route: '/sucursal/ventas' },
    { title: 'Gestionar inventario', description: 'Revisa stock y solicita reposición', icon: 'pi pi-box', route: '/sucursal/inventario' },
    { title: 'Ver traslados', description: 'Consulta solicitudes entrantes y salientes', icon: 'pi pi-arrows-h', route: '/sucursal/traslados' }
  ];

  readonly recentActivity = [
    { evento: 'Venta', detalle: 'Ticket VENTA-0001', estado: 'Completado' },
    { evento: 'Traslado', detalle: 'Solicitud TRAS-0004', estado: 'Pendiente' }
  ];

}
