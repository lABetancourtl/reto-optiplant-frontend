import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { AdminDashboardDataService } from '../../../services/admin/admin-dashboard-data.service';
import {
  AdminDashboardProductOptionResponse,
  AdminDashboardProductSalesByBranchItemResponse,
  AdminDashboardProductTopBranchResponse
} from '../../../models/admin-dashboard.models';

@Component({
  selector: 'app-product-analytics-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './product-analytics-widget.component.html',
  styleUrls: ['./product-analytics-widget.component.css']
})
export class ProductAnalyticsWidgetComponent implements OnInit {
  @Input() selectedProductIdExternal: number | null = null;

  products: AdminDashboardProductOptionResponse[] = [];
  selectedProductId: number | null = null;
  productSearchTerm = '';

  topBranch: AdminDashboardProductTopBranchResponse | null = null;
  salesByBranch: AdminDashboardProductSalesByBranchItemResponse[] = [];

  loading = false;
  error: string | null = null;
  loadingProducts = false;

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
      },
      x: {
        ticks: {
          color: '#6B7280'
        }
      }
    }
  };

  constructor(private readonly adminDashboardDataService: AdminDashboardDataService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['selectedProductIdExternal']) {
      return;
    }

    const externalProductId = this.selectedProductIdExternal;

    if (externalProductId === null) {
      return;
    }

    if (this.selectedProductId === externalProductId) {
      return;
    }

    this.selectedProductId = externalProductId;
    this.syncSearchTermWithSelectedProduct();

    if (this.products.length > 0) {
      this.loadProductAnalytics();
    }
  }

  get hasData(): boolean {
    return this.salesByBranch.length > 0;
  }

  onProductChange(): void {
    this.syncSearchTermWithSelectedProduct();
    this.loadProductAnalytics();
  }

  onProductSearchApply(): void {
    const term = this.productSearchTerm.trim();

    if (!term) {
      this.selectedProductId = null;
      this.topBranch = null;
      this.salesByBranch = [];
      this.updateChart([]);
      this.error = null;
      return;
    }

    const match = this.findProductByName(term);
    if (!match) {
      this.error = 'No se encontró un producto con ese nombre. Selecciona una opción válida.';
      return;
    }

    this.error = null;
    this.productSearchTerm = match.name;

    if (this.selectedProductId !== match.id) {
      this.selectedProductId = match.id;
      this.loadProductAnalytics();
    }
  }

  private loadProducts(): void {
    this.loadingProducts = true;
    this.error = null;

    this.adminDashboardDataService.getProducts().subscribe({
      next: (products) => {
        this.products = [...products].sort((a, b) => a.name.localeCompare(b.name));

        if (this.products.length === 0) {
          this.selectedProductId = null;
          this.productSearchTerm = '';
          this.topBranch = null;
          this.salesByBranch = [];
          this.updateChart([]);
          this.loadingProducts = false;
          return;
        }

        if (this.selectedProductIdExternal && this.products.some((product) => product.id === this.selectedProductIdExternal)) {
          this.selectedProductId = this.selectedProductIdExternal;
        } else if (!this.selectedProductId) {
          this.selectedProductId = this.products[0].id;
        }

        this.syncSearchTermWithSelectedProduct();
        this.loadingProducts = false;
        this.loadProductAnalytics();
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudieron cargar los productos para el filtro.');
        this.products = [];
        this.selectedProductId = null;
        this.productSearchTerm = '';
        this.topBranch = null;
        this.salesByBranch = [];
        this.updateChart([]);
        this.loadingProducts = false;
      }
    });
  }

  private loadProductAnalytics(): void {
    if (this.selectedProductId === null) {
      this.topBranch = null;
      this.salesByBranch = [];
      this.updateChart([]);
      return;
    }

    this.loading = true;
    this.error = null;

    forkJoin({
      topBranch: this.adminDashboardDataService.getProductTopBranch(this.selectedProductId),
      salesByBranch: this.adminDashboardDataService.getProductSalesByBranch(this.selectedProductId)
    }).subscribe({
      next: ({ topBranch, salesByBranch }) => {
        this.topBranch = topBranch;
        this.salesByBranch = [...salesByBranch].sort((a, b) => b.totalAmount - a.totalAmount);
        this.updateChart(this.salesByBranch);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudo cargar la analítica del producto seleccionado.');
        this.topBranch = null;
        this.salesByBranch = [];
        this.updateChart([]);
        this.loading = false;
      }
    });
  }

  private updateChart(rows: AdminDashboardProductSalesByBranchItemResponse[]): void {
    const topRows = [...rows].slice(0, 10);

    this.chartData = {
      labels: topRows.map((row) => row.branchName),
      datasets: [
        {
          label: 'Monto por sucursal',
          data: topRows.map((row) => row.totalAmount),
          backgroundColor: '#2563EBCC',
          borderColor: '#2563EB',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 32
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

  private findProductByName(term: string): AdminDashboardProductOptionResponse | null {
    const normalizedTerm = term.trim().toLowerCase();

    const exactMatch = this.products.find((product) => product.name.trim().toLowerCase() === normalizedTerm);
    if (exactMatch) {
      return exactMatch;
    }

    const containsMatch = this.products.find((product) => product.name.toLowerCase().includes(normalizedTerm));
    return containsMatch ?? null;
  }

  private syncSearchTermWithSelectedProduct(): void {
    if (this.selectedProductId === null) {
      this.productSearchTerm = '';
      return;
    }

    const selectedProduct = this.products.find((product) => product.id === this.selectedProductId);
    this.productSearchTerm = selectedProduct?.name ?? '';
  }
}
