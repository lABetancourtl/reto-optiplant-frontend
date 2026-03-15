import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioItem, ProductAvailability, SucursalInventarioService } from '../../services/sucursal/inventario.service';
import { AuthService } from '../../services/auth.service';
import { TransferService } from '../../services/sucursal/trasnfer.servic';

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

  // Modal transferencia
  showTransferModal = false;
  transferItem: InventarioItem | null = null;
  transferFrom: ProductAvailability | null = null;
  transferQuantity: number = 1;
  transferError: string | null = null;
  sendingTransfer = false;
  transferSuccess = false;

  private myBranchId: number | null = null;

  constructor(
    private inventarioService: SucursalInventarioService,
    private transferService: TransferService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.myBranchId = this.authService.getUserBranchId();
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

  setFiltro(filtro: string) { this.filtroEstado = filtro; this.aplicarFiltros(); }
  setCategoria(cat: string) { this.filtroCategoria = cat; this.aplicarFiltros(); }

  onRowDblClick(item: InventarioItem) {
    const pid = item.product.id;
    if (this.expandedProductId === pid) { this.expandedProductId = null; return; }
    this.expandedProductId = pid;
    if (this.availabilityMap.has(pid)) return;
    this.loadingAvailability.add(pid);
    this.inventarioService.getProductAvailability(pid).subscribe({
      next: (data) => {
        // Excluir la sucursal propia del usuario
        const otras = data.filter(av => av.branchId !== this.myBranchId);
        this.availabilityMap.set(pid, otras);
        this.loadingAvailability.delete(pid);
      },
      error: () => { this.availabilityMap.set(pid, []); this.loadingAvailability.delete(pid); }
    });
  }

  isExpanded(item: InventarioItem): boolean { return this.expandedProductId === item.product.id; }
  isLoadingAvailability(item: InventarioItem): boolean { return this.loadingAvailability.has(item.product.id); }
  getAvailability(item: InventarioItem): ProductAvailability[] { return this.availabilityMap.get(item.product.id) ?? []; }

  // ── Transferencia ──────────────────────────────

  openTransferModal(item: InventarioItem, from: ProductAvailability, event: Event) {
    event.stopPropagation();
    this.transferItem = item;
    this.transferFrom = from;
    this.transferQuantity = 1;
    this.transferError = null;
    this.transferSuccess = false;
    this.showTransferModal = true;
  }

  closeTransferModal() {
    this.showTransferModal = false;
    this.transferItem = null;
    this.transferFrom = null;
    this.transferError = null;
  }

  get maxTransferQuantity(): number {
    return this.transferFrom?.quantity ?? 1;
  }

  submitTransfer() {
    if (!this.transferItem || !this.transferFrom || !this.myBranchId) {
      this.transferError = 'No se pudo identificar la sucursal destino. Verifica tu sesión.';
      return;
    }
    if (this.transferQuantity < 1 || this.transferQuantity > this.maxTransferQuantity) {
      this.transferError = `La cantidad debe estar entre 1 y ${this.maxTransferQuantity}.`;
      return;
    }
    this.sendingTransfer = true;
    this.transferError = null;
    this.transferService.createTransferRequest({
      sourceBranchId: this.transferFrom.branchId,
      destBranchId: this.myBranchId,
      productId: this.transferItem.product.id,
      quantity: this.transferQuantity
    }).subscribe({
      next: () => {
        this.sendingTransfer = false;
        this.transferSuccess = true;
        setTimeout(() => this.closeTransferModal(), 1800);
      },
      error: () => {
        this.transferError = 'Error al enviar la solicitud. Intenta de nuevo.';
        this.sendingTransfer = false;
      }
    });
  }

  getEstado(quantity: number): { label: string; clase: string } {
    if (quantity === 0)  return { label: 'Sin stock', clase: 'badge-neutral' };
    if (quantity <= 5)   return { label: 'Crítico',   clase: 'badge-danger' };
    if (quantity <= 10)  return { label: 'Bajo',      clase: 'badge-warn' };
    return               { label: 'OK',               clase: 'badge-ok' };
  }

  getStockPct(quantity: number): number { return Math.min(Math.round((quantity / 50) * 100), 100); }

  getBarColor(quantity: number): string {
    if (quantity === 0)  return 'var(--stock-empty)';
    if (quantity <= 5)   return 'var(--stock-low)';
    if (quantity <= 10)  return 'var(--stock-medium)';
    return 'var(--stock-ok)';
  }
}