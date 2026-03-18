import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { AdminDashboardDataService } from '../../../services/admin/admin-dashboard-data.service';
import {
  AdminDashboardBranchOptionResponse,
  AdminDashboardBranchTopProductItemResponse
} from '../../../models/admin-dashboard.models';
import { exportToCsv } from '../../../shared/utils/csv-export.util';

@Component({
  selector: 'app-branch-top-products-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './branch-top-products-widget.component.html',
  styleUrls: ['./branch-top-products-widget.component.css']
})
export class BranchTopProductsWidgetComponent implements OnInit {
  @Input() selectedBranchIdExternal: number | null = null;

  branches: AdminDashboardBranchOptionResponse[] = [];
  selectedBranchId: number | null = null;
  selectedLimit = 10;

  topProducts: AdminDashboardBranchTopProductItemResponse[] = [];

  loading = false;
  loadingBranches = false;
  error: string | null = null;

  chartType: 'bar' = 'bar';
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Monto: ${Number(context.raw).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => Number(value).toLocaleString('es-CO')
        }
      }
    }
  };

  constructor(private readonly adminDashboardDataService: AdminDashboardDataService) {}

  ngOnInit(): void {
    this.loadBranches();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['selectedBranchIdExternal']) {
      return;
    }

    const externalBranchId = this.selectedBranchIdExternal;

    if (externalBranchId === null) {
      return;
    }

    if (this.selectedBranchId === externalBranchId) {
      return;
    }

    this.selectedBranchId = externalBranchId;

    if (this.branches.length > 0) {
      this.loadTopProducts();
    }
  }

  get hasData(): boolean {
    return this.topProducts.length > 0;
  }

  onBranchChange(): void {
    this.loadTopProducts();
  }

  onLimitChange(): void {
    const normalizedLimit = Number(this.selectedLimit);
    this.selectedLimit = Math.min(Math.max(Number.isFinite(normalizedLimit) ? normalizedLimit : 10, 1), 10);
    this.loadTopProducts();
  }

  exportTopProductsCsv(): void {
    exportToCsv('top-productos-por-sucursal.csv', this.topProducts, [
      { header: 'Producto', map: (row) => row.productName },
      { header: 'Unidades vendidas', map: (row) => row.unitsSold },
      { header: 'Monto total', map: (row) => row.totalAmount }
    ]);
  }

  private loadBranches(): void {
    this.loadingBranches = true;
    this.error = null;

    this.adminDashboardDataService.getBranches().subscribe({
      next: (branches) => {
        this.branches = [...branches].sort((a, b) => a.name.localeCompare(b.name));

        if (this.branches.length === 0) {
          this.selectedBranchId = null;
          this.topProducts = [];
          this.updateChart([]);
          this.loadingBranches = false;
          return;
        }

        if (this.selectedBranchIdExternal && this.branches.some((branch) => branch.id === this.selectedBranchIdExternal)) {
          this.selectedBranchId = this.selectedBranchIdExternal;
        } else if (!this.selectedBranchId) {
          this.selectedBranchId = this.branches[0].id;
        }

        this.loadingBranches = false;
        this.loadTopProducts();
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudieron cargar las sucursales para el filtro.');
        this.branches = [];
        this.selectedBranchId = null;
        this.topProducts = [];
        this.updateChart([]);
        this.loadingBranches = false;
      }
    });
  }

  private loadTopProducts(): void {
    if (this.selectedBranchId === null) {
      this.topProducts = [];
      this.updateChart([]);
      return;
    }

    this.loading = true;
    this.error = null;

    this.adminDashboardDataService.getBranchTopProducts(this.selectedBranchId, this.selectedLimit).subscribe({
      next: (rows) => {
        this.topProducts = [...rows].sort((a, b) => b.totalAmount - a.totalAmount);
        this.updateChart(this.topProducts);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudo cargar el top productos de la sucursal seleccionada.');
        this.topProducts = [];
        this.updateChart([]);
        this.loading = false;
      }
    });
  }

  private updateChart(rows: AdminDashboardBranchTopProductItemResponse[]): void {
    const chartRows = [...rows].slice(0, 10);

    this.chartData = {
      labels: chartRows.map((row) => row.productName),
      datasets: [
        {
          label: 'Monto vendido',
          data: chartRows.map((row) => row.totalAmount),
          backgroundColor: '#0D9488CC',
          borderColor: '#0D9488',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 28
        }
      ]
    };
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401 || error.status === 403) {
      return 'No autorizado para consultar analítica de ADMIN. Inicia sesión de nuevo.';
    }

    if (error.status === 0) {
      return 'No hay conexión con el backend. Verifica el servicio e intenta nuevamente.';
    }

    return fallback;
  }
}
