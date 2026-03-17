import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { Product, ProductService } from '../../services/admin/product.service';
import { Branch, SucursalesService } from '../../services/admin/sucursal.service';
import { AnalyticsService } from '../../services/admin/analytics.service';
import {
  AdminBranchTopProductItem,
  AdminProductSalesByBranchItem,
  AdminProductTopBranch,
  AdminSalesByBranchItem,
  AdminSalesSummary,
  BranchSalesTimeSeriesResponse,
  SalesByBranchTimeSeriesResponse,
  SalesGranularity
} from '../../models/admin-analytics.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  summary: AdminSalesSummary | null = null;
  salesByBranch: AdminSalesByBranchItem[] = [];
  salesByBranchTimeSeries: SalesByBranchTimeSeriesResponse | null = null;
  productTopBranch: AdminProductTopBranch | null = null;
  productSalesByBranch: AdminProductSalesByBranchItem[] = [];
  branchTopProducts: AdminBranchTopProductItem[] = [];

  products: Product[] = [];
  branches: Branch[] = [];

  selectedProductId: number | null = null;
  selectedBranchId: number | null = null;
  selectedLimit = 10;

  selectedGranularity: SalesGranularity = 'MONTH';
  selectedFromDate = '';
  selectedToDate = '';
  selectedSalesBranchIds: number[] = [];

  loadingSummary = false;
  loadingSalesByBranch = false;
  loadingProductQuery = false;
  loadingBranchQuery = false;
  loadingFilters = false;

  summaryError: string | null = null;
  byBranchError: string | null = null;
  productQueryError: string | null = null;
  branchQueryError: string | null = null;
  filtersError: string | null = null;

  salesByBranchChartType: 'line' = 'line';
  salesByBranchChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  salesByBranchChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => `Monto: ${Number(context.raw).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#6B7280'
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.5)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6B7280',
          callback: (value) => Number(value).toLocaleString('es-CO')
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.6)'
        }
      }
    }
  };

  constructor(
    private analyticsService: AnalyticsService,
    private productService: ProductService,
    private sucursalesService: SucursalesService
  ) {}

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadSummary();
    this.loadSalesByBranch();
    this.loadFilters();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    this.summaryError = null;

    this.analyticsService.getSalesSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.loadingSummary = false;
      },
      error: (error: HttpErrorResponse) => {
        this.summaryError = this.getErrorMessage(error, 'Error al cargar el resumen global.');
        this.loadingSummary = false;
      }
    });
  }

  loadSalesByBranch(): void {
    if (this.selectedFromDate && this.selectedToDate && this.selectedFromDate > this.selectedToDate) {
      this.byBranchError = 'El rango de fechas es inválido: la fecha inicial no puede ser mayor que la final.';
      this.updateSalesByBranchChart([]);
      this.salesByBranch = [];
      return;
    }

    this.loadingSalesByBranch = true;
    this.byBranchError = null;

    const branchIds = this.selectedSalesBranchIds
      .map(id => Number(id))
      .filter(id => Number.isFinite(id));

    const request = {
      granularity: this.selectedGranularity,
      fromDate: this.selectedFromDate || undefined,
      toDate: this.selectedToDate || undefined,
      branchIds: branchIds.length > 0 ? branchIds : undefined
    };

    this.analyticsService.getSalesByBranchTimeSeries(request).subscribe({
      next: (data) => {
        this.salesByBranchTimeSeries = data;
        this.salesByBranch = this.buildSalesByBranchTable(data.branches);
        this.updateSalesByBranchChart(data.branches, data.granularity);
        this.loadingSalesByBranch = false;
      },
      error: (error: HttpErrorResponse) => {
        this.byBranchError = this.getErrorMessage(error, 'Error al cargar ventas por sucursal.');
        this.salesByBranchTimeSeries = null;
        this.salesByBranch = [];
        this.updateSalesByBranchChart([]);
        this.loadingSalesByBranch = false;
      }
    });
  }

  private updateSalesByBranchChart(branches: BranchSalesTimeSeriesResponse[], granularity?: SalesGranularity): void {
    const colors = [
      '#1E3A5F', '#0D9488', '#2563EB', '#7C3AED', '#F59E0B',
      '#EF4444', '#10B981', '#0EA5E9', '#9333EA', '#EA580C'
    ];

    const bucketStarts = Array.from(
      new Set(
        branches.flatMap(branch => branch.points.map(point => point.bucketStart))
      )
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const labels = bucketStarts.map(bucket => this.formatBucketLabel(bucket, granularity ?? this.selectedGranularity));

    this.salesByBranchChartData = {
      labels,
      datasets: branches.map((branch, index) => {
        const color = colors[index % colors.length];
        const pointsByBucket = new Map(branch.points.map(point => [point.bucketStart, point.totalAmount]));

        return {
          label: branch.branchName,
          data: bucketStarts.map(bucket => pointsByBucket.get(bucket) ?? null),
          borderColor: color,
          backgroundColor: `${color}33`,
          tension: 0.35,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        };
      })
    };
  }

  private buildSalesByBranchTable(branches: BranchSalesTimeSeriesResponse[]): AdminSalesByBranchItem[] {
    return branches.map(branch => {
      const totalAmount = branch.points.reduce((sum, point) => sum + point.totalAmount, 0);
      const totalSales = branch.points.reduce((sum, point) => sum + point.totalSales, 0);

      return {
        branchId: branch.branchId,
        branchName: branch.branchName,
        totalAmount,
        totalSales,
      };
    });
  }

  private formatBucketLabel(bucketStart: string, granularity: SalesGranularity): string {
    const date = new Date(bucketStart);

    if (granularity === 'YEAR') {
      return date.getFullYear().toString();
    }

    if (granularity === 'MONTH') {
      return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short' });
    }

    if (granularity === 'WEEK') {
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }

    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  }

  private setDefaultDateRange(): void {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

    this.selectedFromDate = firstDayOfYear.toISOString().slice(0, 10);
    this.selectedToDate = now.toISOString().slice(0, 10);
  }

  loadFilters(): void {
    this.loadingFilters = true;
    this.filtersError = null;

    forkJoin({
      products: this.productService.getAllProducts(),
      branches: this.sucursalesService.getAll()
    }).subscribe({
      next: ({ products, branches }) => {
        this.products = products;
        this.branches = branches;

        if (products.length > 0) {
          this.selectedProductId = products[0].id;
          this.loadProductAnalytics();
        }

        if (branches.length > 0) {
          this.selectedBranchId = branches[0].id;
          this.loadBranchTopProducts();
        }

        this.loadingFilters = false;
      },
      error: (error: HttpErrorResponse) => {
        this.filtersError = this.getErrorMessage(error, 'Error al cargar productos/sucursales para filtros.');
        this.loadingFilters = false;
      }
    });
  }

  loadProductAnalytics(): void {
    if (this.selectedProductId === null) {
      this.productQueryError = 'Selecciona un producto para consultar.';
      return;
    }

    const productId = this.selectedProductId;
    this.loadingProductQuery = true;
    this.productQueryError = null;

    forkJoin({
      topBranch: this.analyticsService.getProductTopBranch(productId),
      salesByBranch: this.analyticsService.getProductSalesByBranch(productId)
    }).subscribe({
      next: ({ topBranch, salesByBranch }) => {
        this.productTopBranch = topBranch;
        this.productSalesByBranch = salesByBranch;
        this.loadingProductQuery = false;
      },
      error: (error: HttpErrorResponse) => {
        this.productQueryError = this.getErrorMessage(error, 'Error al consultar analítica por producto.');
        this.loadingProductQuery = false;
      }
    });
  }

  loadBranchTopProducts(): void {
    if (this.selectedBranchId === null) {
      this.branchQueryError = 'Selecciona una sucursal para consultar.';
      return;
    }

    const limit = Math.min(Math.max(this.selectedLimit || 10, 1), 100);
    this.selectedLimit = limit;

    this.loadingBranchQuery = true;
    this.branchQueryError = null;

    this.analyticsService.getBranchTopProducts(this.selectedBranchId, limit).subscribe({
      next: (data) => {
        this.branchTopProducts = data;
        this.loadingBranchQuery = false;
      },
      error: (error: HttpErrorResponse) => {
        this.branchQueryError = this.getErrorMessage(error, 'Error al consultar top productos por sucursal.');
        this.loadingBranchQuery = false;
      }
    });
  }

  hasProductSales(): boolean {
    return (this.productTopBranch?.unitsSold ?? 0) > 0;
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401 || error.status === 403) {
      return 'Tu sesión no tiene permisos de ADMIN para consultar analítica. Inicia sesión nuevamente.';
    }

    return fallback;
  }
}
