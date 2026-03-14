import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioItem, SucursalInventarioService } from '../../services/sucursal/inventario.service';


@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit {

  inventario: InventarioItem[] = [];
  filtrado: InventarioItem[] = [];
  busqueda = '';
  filtroEstado = 'todos';
  cargando = true;
  error = '';

  constructor(private inventarioService: SucursalInventarioService) {}

  ngOnInit() {
    this.cargarInventario();
  }

  cargarInventario() {
    this.cargando = true;
    this.error = '';
    this.inventarioService.getMyBranchInventory().subscribe({
      next: (data) => {
        this.inventario = data;
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el inventario. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  aplicarFiltros() {
    let result = [...this.inventario];

    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      result = result.filter(i =>
        i.product.name.toLowerCase().includes(q) ||
        i.product.category.name.toLowerCase().includes(q)
      );
    }

    if (this.filtroEstado === 'bajo') {
      result = result.filter(i => i.quantity > 0 && i.quantity <= 10);
    } else if (this.filtroEstado === 'sin') {
      result = result.filter(i => i.quantity === 0);
    }

    this.filtrado = result;
  }

  setFiltro(filtro: string) {
    this.filtroEstado = filtro;
    this.aplicarFiltros();
  }

  getEstado(quantity: number): { label: string; clase: string } {
    if (quantity === 0)  return { label: 'Sin stock', clase: 'badge-neutral' };
    if (quantity <= 5)   return { label: 'Crítico',   clase: 'badge-danger' };
    if (quantity <= 10)  return { label: 'Bajo',      clase: 'badge-warn' };
    return               { label: 'OK',               clase: 'badge-ok' };
  }

  getStockPct(quantity: number): number {
    return Math.min(Math.round((quantity / 50) * 100), 100);
  }

  getBarColor(quantity: number): string {
    if (quantity === 0)  return 'var(--stock-empty)';
    if (quantity <= 5)   return 'var(--stock-low)';
    if (quantity <= 10)  return 'var(--stock-medium)';
    return 'var(--stock-ok)';
  }
}