import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioItem, ProductAvailability, SucursalInventarioService } from '../../services/sucursal/inventario.service';

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
  categorias: string[] = [];

  busqueda = '';
  filtroEstado = 'todos';
  filtroCategoria = 'todas';
  cargando = true;
  error = '';

  // Disponibilidad en otras sucursales
  expandedProductId: number | null = null;
  availabilityMap: Map<number, ProductAvailability[]> = new Map();
  loadingAvailability: Set<number> = new Set();

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
        this.categorias = [...new Set(data.map(i => i.product.category.name))].sort();
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
      result = result.filter(i => i.product.name.toLowerCase().includes(q));
    }

    if (this.filtroCategoria !== 'todas') {
      result = result.filter(i => i.product.category.name === this.filtroCategoria);
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

  setCategoria(cat: string) {
    this.filtroCategoria = cat;
    this.aplicarFiltros();
  }

  // Doble click — expande/colapsa disponibilidad
  onRowDblClick(item: InventarioItem) {
    const pid = item.product.id;

    if (this.expandedProductId === pid) {
      this.expandedProductId = null;
      return;
    }

    this.expandedProductId = pid;

    if (this.availabilityMap.has(pid)) return; // ya cargado

    this.loadingAvailability.add(pid);
    this.inventarioService.getProductAvailability(pid).subscribe({
      next: (data) => {
        this.availabilityMap.set(pid, data);
        this.loadingAvailability.delete(pid);
      },
      error: () => {
        this.availabilityMap.set(pid, []);
        this.loadingAvailability.delete(pid);
      }
    });
  }

  isExpanded(item: InventarioItem): boolean {
    return this.expandedProductId === item.product.id;
  }

  isLoadingAvailability(item: InventarioItem): boolean {
    return this.loadingAvailability.has(item.product.id);
  }

  getAvailability(item: InventarioItem): ProductAvailability[] {
    return this.availabilityMap.get(item.product.id) ?? [];
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