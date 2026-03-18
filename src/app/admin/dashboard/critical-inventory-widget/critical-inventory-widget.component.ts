import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminDashboardDataService } from '../../../services/admin/admin-dashboard-data.service';
import { AdminDashboardInventoryItemResponse } from '../../../models/admin-dashboard.models';

interface InventoryCriticalRow {
  branchName: string;
  productName: string;
  categoryName: string;
  quantity: number;
}

@Component({
  selector: 'app-critical-inventory-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './critical-inventory-widget.component.html',
  styleUrls: ['./critical-inventory-widget.component.css']
})
export class CriticalInventoryWidgetComponent implements OnInit, OnChanges {
  @Input() branchId: number | null = null;
  @Input() productId: number | null = null;

  loading = false;
  error: string | null = null;

  lowStockThreshold = 5;

  inventories: AdminDashboardInventoryItemResponse[] = [];
  lowStockRows: InventoryCriticalRow[] = [];
  zeroStockRows: InventoryCriticalRow[] = [];

  constructor(private readonly adminDashboardDataService: AdminDashboardDataService) {}

  ngOnInit(): void {
    this.loadInventories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['branchId'] && !changes['productId']) {
      return;
    }

    this.computeViews();
  }

  get hasData(): boolean {
    return this.lowStockRows.length > 0 || this.zeroStockRows.length > 0;
  }

  get affectedBranchesCount(): number {
    const branches = new Set<string>([...this.lowStockRows, ...this.zeroStockRows].map((row) => row.branchName));
    return branches.size;
  }

  private loadInventories(): void {
    this.loading = true;
    this.error = null;

    this.adminDashboardDataService.getAllInventories().subscribe({
      next: (rows) => {
        this.inventories = rows;
        this.loading = false;
        this.computeViews();
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudo cargar el inventario para detectar quiebres.');
        this.loading = false;
        this.inventories = [];
        this.lowStockRows = [];
        this.zeroStockRows = [];
      }
    });
  }

  private computeViews(): void {
    const normalizedRows = this.inventories
      .filter((row) => this.filterByGlobalSelection(row))
      .map((row) => ({
        branchName: row.branch?.name ?? `Sucursal ${row.branchId ?? 'N/A'}`,
        productName: row.product?.name ?? 'Producto sin nombre',
        categoryName: row.product?.category?.name ?? 'Sin categoría',
        quantity: row.quantity ?? 0
      }));

    this.lowStockRows = normalizedRows
      .filter((row) => row.quantity > 0 && row.quantity <= this.lowStockThreshold)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 15);

    this.zeroStockRows = normalizedRows
      .filter((row) => row.quantity === 0)
      .sort((a, b) => a.branchName.localeCompare(b.branchName) || a.productName.localeCompare(b.productName))
      .slice(0, 20);
  }

  private filterByGlobalSelection(row: AdminDashboardInventoryItemResponse): boolean {
    if (this.branchId) {
      const rowBranchId = row.branch?.id ?? row.branchId ?? null;
      if (rowBranchId !== this.branchId) {
        return false;
      }
    }

    if (this.productId && row.product?.id !== this.productId) {
      return false;
    }

    return true;
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401 || error.status === 403) {
      return 'No autorizado para consultar inventario de ADMIN. Inicia sesión de nuevo.';
    }

    if (error.status === 0) {
      return 'No hay conexión con el backend. Verifica el servicio e intenta nuevamente.';
    }

    return fallback;
  }
}
