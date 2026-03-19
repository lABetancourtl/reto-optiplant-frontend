import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventarioService, InventoryItem } from '../../services/admin/inventario.service';
import { SucursalesService, Branch } from '../../services/admin/sucursal.service';
import { InventoryEvent, WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

type ModalMode = 'create' | 'edit' | null;

interface InventoryForm {
  branchId: number | null;
  productId: number | null;
  quantity: number | null;
}

export interface GroupedProduct {
  productId: number;
  productName: string;
  productDescription?: string;
  categoryName: string;         // ← nuevo
  totalQuantity: number;
  branchCount: number;
  rows: InventoryItem[];
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit, OnDestroy {
  private readonly pageSizeStorageKey = 'admin.inventario.pageSize';


  // ── Data ──
  allInventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];
  groupedInventory: GroupedProduct[] = [];
  filteredGrouped: GroupedProduct[] = [];
  branches: Branch[] = [];

  // ── Filters ──
  selectedBranchId: number | 'all' = 'all';
  searchTerm = '';

  // ── Expanded rows ──
  expandedProductIds = new Set<number>();

  // ── UI state ──
  loading = false;
  loadingBranches = false;
  error: string | null = null;

  // ── Stats ──
  get totalProducts(): number {
    return this.selectedBranchId === 'all'
      ? this.groupedInventory.length
      : this.allInventory.length;
  }
  get totalUnits(): number {
    return this.allInventory.reduce((sum, i) => sum + i.quantity, 0);
  }
  get lowStockCount(): number {
    if (this.selectedBranchId === 'all')
      return this.groupedInventory.filter(g => g.totalQuantity > 0 && g.totalQuantity <= 5).length;
    return this.allInventory.filter(i => i.quantity > 0 && i.quantity <= 5).length;
  }
  get emptyStockCount(): number {
    if (this.selectedBranchId === 'all')
      return this.groupedInventory.filter(g => g.totalQuantity === 0).length;
    return this.allInventory.filter(i => i.quantity === 0).length;
  }

  // ── Modal ──
  modalMode: ModalMode = null;
  selectedItem: InventoryItem | null = null;
  form: InventoryForm = { branchId: null, productId: null, quantity: null };
  formError: string | null = null;
  saving = false;

  // ── Delete confirm ──
  deleteConfirmId: number | null = null;

  // ── Pagination ──
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalPages = 1;
  paginatedGrouped: GroupedProduct[] = [];
  paginatedInventory: InventoryItem[] = [];
  private wsSub: Subscription | null = null;

  constructor(
    private inventarioService: InventarioService,
    private sucursalesService: SucursalesService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.restorePageSizePreference();
    this.loadBranches();
    this.loadInventory();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    // No desconectar el WebSocket — es singleton y debe mantenerse activo
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

  // ══════════════════════════════════════
  //  LOAD
  // ══════════════════════════════════════
  loadBranches(): void {
    this.loadingBranches = true;
    this.sucursalesService.getAll().subscribe({
      next: (data) => { this.branches = data; this.loadingBranches = false; },
      error: () => { this.loadingBranches = false; }
    });
  }

  loadInventory(): void {
    this.loading = true;
    this.error = null;
    this.expandedProductIds.clear();

    if (this.selectedBranchId === 'all') {
      this.inventarioService.getAll().subscribe({
        next: (data) => {
          this.allInventory = data;
          this.buildGrouped();
          this.applyFilters();
          this.loading = false;
        },
        error: () => { this.error = 'Error al cargar el inventario.'; this.loading = false; }
      });
    } else {
      this.inventarioService.getByBranch(this.selectedBranchId as number).subscribe({
        next: (data) => {
          this.allInventory = data;
          this.groupedInventory = [];
          this.applyFilters();
          this.loading = false;
        },
        error: () => { this.error = 'Error al cargar el inventario.'; this.loading = false; }
      });
    }
  }

  private connectWebSocket(): void {
    this.wsService.connect();
    this.wsService.subscribeToAllInventory();

    this.wsSub = this.wsService.inventory$.subscribe((event: InventoryEvent) => {
      this.applyInventoryEvent(event);
    });
  }

  private applyInventoryEvent(event: InventoryEvent): void {
    const byIdIndex = this.allInventory.findIndex((item) => item.id === event.inventoryId);
    const byCompositeIndex = byIdIndex !== -1
      ? byIdIndex
      : this.allInventory.findIndex((item) => {
          const itemBranchId = item.branch?.id ?? item.branchId;
          return itemBranchId === event.branchId && item.product.id === event.productId;
        });

    if (byCompositeIndex === -1) {
      this.loadInventory();
      return;
    }

    this.allInventory[byCompositeIndex] = {
      ...this.allInventory[byCompositeIndex],
      quantity: event.quantity,
      branchId: event.branchId,
      branch: {
        id: event.branchId,
        name: event.branchName
      }
    };

    if (this.selectedBranchId === 'all') {
      this.buildGrouped();
    }

    this.applyFilters();
  }

  // ══════════════════════════════════════
  //  GROUPING
  // ══════════════════════════════════════
  buildGrouped(): void {
    const map = new Map<number, GroupedProduct>();

    for (const item of this.allInventory) {
      const pid = item.product.id;
      if (!map.has(pid)) {
        map.set(pid, {
          productId: pid,
          productName: item.product.name,
          productDescription: item.product.description,
          categoryName: item.product.category?.name ?? 'Sin categoría',
          totalQuantity: 0,
          branchCount: 0,
          rows: []
        });
      }
      const group = map.get(pid)!;
      group.totalQuantity += item.quantity;
      group.branchCount++;
      group.rows.push(item);
    }

    this.groupedInventory = Array.from(map.values())
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }

  // ══════════════════════════════════════
  //  EXPAND / COLLAPSE
  // ══════════════════════════════════════
  toggleExpand(productId: number): void {
    if (this.expandedProductIds.has(productId)) {
      this.expandedProductIds.delete(productId);
    } else {
      this.expandedProductIds.add(productId);
    }
  }

  isExpanded(productId: number): boolean {
    return this.expandedProductIds.has(productId);
  }

  // ══════════════════════════════════════
  //  FILTERS
  // ══════════════════════════════════════
  onBranchChange(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadInventory();
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    if (this.selectedBranchId === 'all') {
      this.filteredGrouped = !term
        ? [...this.groupedInventory]
        : this.groupedInventory.filter(g =>
            g.productName.toLowerCase().includes(term) ||
            g.categoryName.toLowerCase().includes(term)
          );
      // Auto-expandir grupos si el término coincide solo con categoría
      // (el producto puede no contener el término pero sí su categoría)
      if (term) {
        this.filteredGrouped.forEach(g => this.expandedProductIds.add(g.productId));
      }
    } else {
      this.filteredInventory = !term
        ? [...this.allInventory]
        : this.allInventory.filter(item =>
            item.product.name.toLowerCase().includes(term) ||
            (item.product.category?.name ?? '').toLowerCase().includes(term)
          );
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const safePageSize = Number(this.pageSize) || 10;
    this.pageSize = safePageSize;

    const source = this.selectedBranchId === 'all'
      ? this.filteredGrouped
      : this.filteredInventory;
    this.totalPages = Math.ceil(source.length / safePageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const start = (this.currentPage - 1) * safePageSize;
    const end = start + safePageSize;
    if (this.selectedBranchId === 'all') {
      this.paginatedGrouped = this.filteredGrouped.slice(start, end);
    } else {
      this.paginatedInventory = this.filteredInventory.slice(start, end);
    }
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

  get currentSourceLength(): number {
    return this.selectedBranchId === 'all'
      ? this.filteredGrouped.length
      : this.filteredInventory.length;
  }

  get startRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.currentSourceLength);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.expandedProductIds.clear();
    this.applyFilters();
  }

  getCategoryName(item: InventoryItem): string {
    return item.product.category?.name ?? 'Sin categoría';
  }

  getBranchName(item: InventoryItem): string {
    return item.branch?.name ?? this.branches.find(b => b.id === item.branchId)?.name ?? '—';
  }

  getSelectedBranchName(): string {
    if (this.selectedBranchId === 'all') return '';
    return this.branches.find(b => b.id === this.selectedBranchId)?.name ?? '';
  }

  // ══════════════════════════════════════
  //  MODAL CREATE / EDIT
  // ══════════════════════════════════════
  openCreate(): void {
    this.form = {
      branchId: this.selectedBranchId === 'all' ? null : this.selectedBranchId as number,
      productId: null,
      quantity: null
    };
    this.formError = null;
    this.modalMode = 'create';
  }

  openEdit(item: InventoryItem, event?: MouseEvent): void {
    event?.stopPropagation();
    this.selectedItem = item;
    this.form = {
      branchId: item.branchId ?? item.branch?.id ?? null,
      productId: item.product.id,
      quantity: item.quantity
    };
    this.formError = null;
    this.modalMode = 'edit';
  }

  closeModal(): void {
    this.modalMode = null;
    this.selectedItem = null;
    this.formError = null;
  }

  isFormValid(): boolean {
    if (this.form.quantity === null || this.form.quantity < 0) return false;
    if (this.modalMode === 'create') return !!(this.form.branchId && this.form.productId !== null);
    return true;
  }

  save(): void {
    if (!this.isFormValid()) {
      this.formError = this.modalMode === 'create'
        ? 'Sucursal, producto y cantidad son obligatorios.'
        : 'La cantidad es obligatoria y debe ser mayor o igual a 0.';
      return;
    }
    this.saving = true;
    this.formError = null;

    if (this.modalMode === 'create') {
      this.inventarioService.create({
        branchId: this.form.branchId!,
        productId: this.form.productId!,
        quantity: this.form.quantity!
      }).subscribe({
        next: () => { this.saving = false; this.closeModal(); this.loadInventory(); },
        error: () => { this.formError = 'Error al crear el registro de inventario.'; this.saving = false; }
      });
    } else if (this.selectedItem) {
      this.inventarioService.update(this.selectedItem.id, { quantity: this.form.quantity! }).subscribe({
        next: () => { this.saving = false; this.closeModal(); this.loadInventory(); },
        error: () => { this.formError = 'Error al actualizar el inventario.'; this.saving = false; }
      });
    }
  }

  // ══════════════════════════════════════
  //  DELETE
  // ══════════════════════════════════════
  confirmDelete(id: number, event?: MouseEvent): void {
    event?.stopPropagation();
    this.deleteConfirmId = id;
  }

  cancelDelete(): void { this.deleteConfirmId = null; }

  get itemToDelete(): InventoryItem | undefined {
    return this.allInventory.find(i => i.id === this.deleteConfirmId);
  }

  deleteItem(): void {
    if (this.deleteConfirmId === null) return;
    const id = this.deleteConfirmId;
    this.inventarioService.delete(id).subscribe({
      next: () => { this.deleteConfirmId = null; this.loadInventory(); },
      error: () => { this.error = 'Error al eliminar el registro.'; this.deleteConfirmId = null; }
    });
  }

  // ══════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════
  getStockClass(qty: number): string {
    if (qty === 0) return 'stock-empty';
    if (qty <= 5) return 'stock-low';
    return 'stock-ok';
  }

  getStockLabel(qty: number): string {
    if (qty === 0) return 'Sin stock';
    if (qty <= 5) return 'Stock bajo';
    return 'En stock';
  }

  getGroupStockClass(group: GroupedProduct): string {
    if (group.rows.some(r => r.quantity === 0)) return 'stock-empty';
    if (group.rows.some(r => r.quantity <= 5)) return 'stock-low';
    return 'stock-ok';
  }

  getGroupStockLabel(group: GroupedProduct): string {
    if (group.rows.some(r => r.quantity === 0)) return 'Sin stock en alguna';
    if (group.rows.some(r => r.quantity <= 5)) return 'Stock bajo en alguna';
    return 'En stock';
  }
}