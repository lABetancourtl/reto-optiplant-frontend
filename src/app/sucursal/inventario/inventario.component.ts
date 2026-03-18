import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioItem, ProductAvailability, SucursalInventarioService } from '../../services/sucursal/inventario.service';
import { AuthService } from '../../services/auth.service';
import { TransferService } from '../../services/sucursal/trasnfer.servic';
import { InventoryEvent, WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit, OnDestroy {
  private readonly pageSizeStorageKey = 'sucursal.inventario.pageSize';

 
  inventario: InventarioItem[] = [];
  filtrado: InventarioItem[] = [];
  paginatedFiltrado: InventarioItem[] = [];
  categorias: string[] = [];

  // Paginación
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;
 
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
  private wsSub: Subscription | null = null;
 
  constructor(
    private inventarioService: SucursalInventarioService,
    private transferService: TransferService,
    private authService: AuthService,
    private wsService: WebSocketService
  ) {}
 
  ngOnInit() {
    this.restorePageSizePreference();
    this.myBranchId = this.authService.getUserBranchId();
    this.cargarInventario();
    this.conectarWebSocket();
  }

  private restorePageSizePreference(): void {
    const stored = sessionStorage.getItem(this.pageSizeStorageKey);
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && this.pageSizeOptions.includes(parsed)) {
      this.pageSize = parsed;
    }
  }

  private persistPageSizePreference(): void {
    sessionStorage.setItem(this.pageSizeStorageKey, String(this.pageSize));
  }
 
  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    // No desconectar el WebSocket — es singleton y debe mantenerse activo
  }
 
  private conectarWebSocket(): void {
    this.wsService.connect();
    if (this.myBranchId) {
      this.wsService.subscribeToInventoryByBranch(this.myBranchId);
    }
    this.wsSub = this.wsService.inventory$.subscribe((event: InventoryEvent) => {
      // Actualizar el item en la lista sin recargar todo
      const idx = this.inventario.findIndex(i => i.product.id === event.productId);
      if (idx !== -1) {
        this.inventario[idx] = { ...this.inventario[idx], quantity: event.quantity };
        // Limpiar caché de disponibilidad del producto afectado
        this.availabilityMap.delete(event.productId);
        this.aplicarFiltros(false);
      } else if (event.type === 'TRANSFER_IN') {
        // Producto nuevo en esta sucursal — recargar lista completa
        this.cargarInventario();
      }
    });
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
 
  aplicarFiltros(resetPage: boolean = true) {
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

    if (resetPage) {
      this.currentPage = 1;
    }
    this.updatePagination();
  }

  updatePagination(): void {
    const safePageSize = Number(this.pageSize) || 10;
    this.pageSize = safePageSize;

    this.totalPages = Math.ceil(this.filtrado.length / safePageSize) || 1;

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * safePageSize;
    const endIndex = startIndex + safePageSize;
    this.paginatedFiltrado = this.filtrado.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }
  goToPreviousPage(): void { this.goToPage(this.currentPage - 1); }
  goToNextPage(): void { this.goToPage(this.currentPage + 1); }

  onPageSizeChange(size?: number | string): void {
    if (size !== undefined) {
      this.pageSize = Number(size) || this.pageSizeOptions[0];
    }
    this.persistPageSizePreference();
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  get startRecord(): number {
    if (this.filtrado.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filtrado.length);
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