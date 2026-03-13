import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  // Datos de ejemplo para la tabla
  productos = [
    { codigo: 'PRD-001', nombre: 'Tornillos 1/4', stock: 150, estado: 'ok' },
    { codigo: 'PRD-002', nombre: 'Tuercas M6', stock: 45, estado: 'medium' },
    { codigo: 'PRD-003', nombre: 'Arandelas Planas', stock: 8, estado: 'low' },
    { codigo: 'PRD-004', nombre: 'Clavos 2 pulgadas', stock: 0, estado: 'empty' },
    { codigo: 'PRD-005', nombre: 'Pernos Hexagonales', stock: 230, estado: 'ok' }
  ];

  // Estadisticas
  stats = {
    totalProductos: 1234,
    stockBajo: 23,
    sucursales: 5
  };
}
