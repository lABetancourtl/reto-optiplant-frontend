import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SaleSummary } from '../../models/branch-operations.models';
import { BranchOperationsService } from '../../services/sucursal/branch-operations.service';
import { InventarioItem, SucursalInventarioService } from '../../services/sucursal/inventario.service';
import { Transfer, TransferService } from '../../services/sucursal/trasnfer.servic';

interface RecentActivityRow {
  evento: string;
  detalle: string;
  estado: string;
  timestamp: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  readonly stats = {
    ventasHoy: 0,
    trasladosPendientes: 0,
    productosBajoStock: 0,
    productosEnCero: 0
  };

  readonly quickActions = [
    { title: 'Registrar venta', description: 'Crea una venta y registra productos', icon: 'pi pi-shopping-cart', route: '/sucursal/ventas' },
    { title: 'Gestionar inventario', description: 'Revisa stock y solicita reposición', icon: 'pi pi-box', route: '/sucursal/inventario' },
    { title: 'Ver traslados', description: 'Consulta solicitudes entrantes y salientes', icon: 'pi pi-arrows-h', route: '/sucursal/traslados' }
  ];

  recentActivity: { evento: string; detalle: string; estado: string }[] = [];

  constructor(
    private readonly branchOperationsService: BranchOperationsService,
    private readonly inventarioService: SucursalInventarioService,
    private readonly transferService: TransferService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    forkJoin({
      sales: this.branchOperationsService.getMySales().pipe(catchError(() => of([] as SaleSummary[]))),
      transfers: this.transferService.getMyTransfers().pipe(catchError(() => of([] as Transfer[]))),
      inventory: this.inventarioService.getMyBranchInventory().pipe(catchError(() => of([] as InventarioItem[])))
    }).subscribe(({ sales, transfers, inventory }) => {
      this.updateStats(sales, inventory);
      this.recentActivity = this.buildRecentActivity(sales, transfers)
        .slice(0, 10)
        .map(({ evento, detalle, estado }) => ({ evento, detalle, estado }));
    });
  }

  private updateStats(sales: SaleSummary[], inventory: InventarioItem[]): void {
    this.stats.ventasHoy = sales.filter((sale) => this.isSameLocalDate(sale.createdAt)).length;
    this.stats.productosBajoStock = inventory.filter((item) => item.quantity > 0 && item.quantity <= 10).length;
    this.stats.productosEnCero = inventory.filter((item) => item.quantity === 0).length;
  }

  private buildRecentActivity(sales: SaleSummary[], transfers: Transfer[]): RecentActivityRow[] {
    const saleRows: RecentActivityRow[] = sales.map((sale) => ({
      evento: 'Venta',
      detalle: `Ticket #${sale.id}`,
      estado: this.mapSaleStatus(sale.status),
      timestamp: this.parseDate(sale.createdAt)
    }));

    const transferRows: RecentActivityRow[] = transfers.map((transfer) => ({
      evento: 'Traslado',
      detalle: `Solicitud #${transfer.id}`,
      estado: this.mapTransferStatus(transfer.status),
      timestamp: this.parseDate(transfer.createdAt)
    }));

    return [...saleRows, ...transferRows].sort((a, b) => b.timestamp - a.timestamp);
  }

  private mapSaleStatus(status?: string): string {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (!normalized || normalized === 'PENDING') {
      return 'Pendiente';
    }
    if (normalized === 'COMPLETED' || normalized === 'DONE' || normalized === 'CLOSED') {
      return 'Completado';
    }
    return 'Pendiente';
  }

  private mapTransferStatus(status?: string): string {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (normalized === 'RECEIVED' || normalized === 'APPROVED') {
      return 'Completado';
    }
    return 'Pendiente';
  }

  private parseDate(value?: string): number {
    if (!value) {
      return 0;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private isSameLocalDate(value?: string): boolean {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const today = new Date();
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

}
