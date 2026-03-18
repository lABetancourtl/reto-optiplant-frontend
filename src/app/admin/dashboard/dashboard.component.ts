import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { AdminDashboardDataService } from '../../services/admin/admin-dashboard-data.service';
import {
  AdminDashboardBranchOptionResponse,
  AdminDashboardBranchTimeSeriesResponse,
  AdminDashboardProductOptionResponse,
  AdminDashboardSalesByBranchItemResponse,
  AdminDashboardSalesSummaryResponse,
  AdminDashboardUiGranularity
} from '../../models/admin-dashboard.models';
import { ProductAnalyticsWidgetComponent } from './product-analytics-widget/product-analytics-widget.component';
import { BranchTopProductsWidgetComponent } from './branch-top-products-widget/branch-top-products-widget.component';
import { SalesComparisonWidgetComponent } from './sales-comparison-widget/sales-comparison-widget.component';
import { TransfersOpsWidgetComponent } from './transfers-ops-widget/transfers-ops-widget.component';
import { CriticalInventoryWidgetComponent } from './critical-inventory-widget/critical-inventory-widget.component';
import { exportToCsv } from '../../shared/utils/csv-export.util';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    ProductAnalyticsWidgetComponent,
    BranchTopProductsWidgetComponent,
    SalesComparisonWidgetComponent,
    TransfersOpsWidgetComponent,
    CriticalInventoryWidgetComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private readonly filtersStorageKey = 'adminDashboardGlobalFilters.v1';
  private trendCurrentBranches: AdminDashboardBranchTimeSeriesResponse[] = [];
  private trendPreviousBranches: AdminDashboardBranchTimeSeriesResponse[] = [];

  summary: AdminDashboardSalesSummaryResponse | null = null;
  summaryLoading = false;
  summaryError: string | null = null;

  rankingRows: AdminDashboardSalesByBranchItemResponse[] = [];
  rankingLoading = false;
  rankingError: string | null = null;

  trendLoading = false;
  trendError: string | null = null;
  filteredPeriodSummary: AdminDashboardSalesSummaryResponse | null = null;

  branchOptions: AdminDashboardBranchOptionResponse[] = [];
  productOptions: AdminDashboardProductOptionResponse[] = [];

  selectedGranularity: AdminDashboardUiGranularity = 'MONTHLY';
  selectedFromDate = '';
  selectedToDate = '';
  selectedGlobalBranchId: number | null = null;
  selectedGlobalProductId: number | null = null;
  selectedTrendMetric: 'AMOUNT' | 'SALES' | 'TICKET' = 'AMOUNT';
  commercialSectionCollapsed = false;
  productSectionCollapsed = false;
  operationsSectionCollapsed = false;

  trendMetricOptions: Array<{ value: 'AMOUNT' | 'SALES' | 'TICKET'; label: string }> = [
    { value: 'AMOUNT', label: 'Monto' },
    { value: 'SALES', label: 'Ventas' },
    { value: 'TICKET', label: 'Ticket promedio' }
  ];

  granularityOptions: Array<{ value: AdminDashboardUiGranularity; label: string }> = [
    { value: 'DAILY', label: 'Diario' },
    { value: 'WEEKLY', label: 'Semanal' },
    { value: 'MONTHLY', label: 'Mensual' },
    { value: 'YEARLY', label: 'Anual' }
  ];

  rankingChartType: 'bar' = 'bar';
  rankingChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  trendChartType: 'line' = 'line';
  trendChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  trendByBranchChartType: 'line' = 'line';
  trendByBranchChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  rankingChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => Number(value).toLocaleString('es-CO')
        }
      }
    }
  };

  trendChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${this.formatTrendMetricValue(Number(context.raw ?? 0))}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => this.formatTrendMetricValue(Number(value))
        }
      }
    }
  };

  constructor(private readonly adminDashboardDataService: AdminDashboardDataService) {}

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.restoreGlobalFilters();
    this.loadGlobalFilterOptions();

    this.loadRankingWidget();
    this.loadTrendWidget();
  }

  get averageTicket(): number {
    if (!this.summary || this.summary.totalSales <= 0) {
      return 0;
    }

    return this.summary.totalAmount / this.summary.totalSales;
  }

  get filteredPeriodAverageTicket(): number {
    if (!this.filteredPeriodSummary || this.filteredPeriodSummary.totalSales <= 0) {
      return 0;
    }

    return this.filteredPeriodSummary.totalAmount / this.filteredPeriodSummary.totalSales;
  }

  get hasTrendData(): boolean {
    return (this.trendChartData.labels?.length ?? 0) > 0;
  }

  applyGlobalFilters(): void {
    this.persistGlobalFilters();
    this.loadTrendWidget();
  }

  onTrendMetricChange(): void {
    this.updateTrendChart(this.trendCurrentBranches, this.trendPreviousBranches);
  }

  toggleCommercialSection(): void {
    this.commercialSectionCollapsed = !this.commercialSectionCollapsed;
  }

  toggleProductSection(): void {
    this.productSectionCollapsed = !this.productSectionCollapsed;
  }

  toggleOperationsSection(): void {
    this.operationsSectionCollapsed = !this.operationsSectionCollapsed;
  }

  resetGlobalFilters(): void {
    this.selectedGranularity = 'MONTHLY';
    this.selectedGlobalBranchId = null;
    this.selectedGlobalProductId = null;
    this.setDefaultDateRange();

    this.persistGlobalFilters();
    this.loadTrendWidget();
  }

  exportSalesByBranchCsv(): void {
    exportToCsv('ventas-por-sucursal.csv', this.rankingRows, [
      { header: 'Sucursal', map: (row) => row.branchName },
      { header: 'Monto total', map: (row) => row.totalAmount },
      { header: 'Total ventas', map: (row) => row.totalSales }
    ]);
  }

  private loadGlobalFilterOptions(): void {
    forkJoin({
      branches: this.adminDashboardDataService.getBranches(),
      products: this.adminDashboardDataService.getProducts()
    }).subscribe({
      next: ({ branches, products }) => {
        this.branchOptions = [...branches].sort((a, b) => a.name.localeCompare(b.name));
        this.productOptions = [...products].sort((a, b) => a.name.localeCompare(b.name));

        if (this.selectedGlobalBranchId && !this.branchOptions.some((branch) => branch.id === this.selectedGlobalBranchId)) {
          this.selectedGlobalBranchId = null;
        }

        if (this.selectedGlobalProductId && !this.productOptions.some((product) => product.id === this.selectedGlobalProductId)) {
          this.selectedGlobalProductId = null;
        }
      },
      error: () => {
        this.branchOptions = [];
        this.productOptions = [];
      }
    });
  }

  private persistGlobalFilters(): void {
    const payload = {
      selectedGranularity: this.selectedGranularity,
      selectedFromDate: this.selectedFromDate,
      selectedToDate: this.selectedToDate,
      selectedGlobalBranchId: this.selectedGlobalBranchId,
      selectedGlobalProductId: this.selectedGlobalProductId
    };

    sessionStorage.setItem(this.filtersStorageKey, JSON.stringify(payload));
  }

  private restoreGlobalFilters(): void {
    const raw = sessionStorage.getItem(this.filtersStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        selectedGranularity?: AdminDashboardUiGranularity;
        selectedFromDate?: string;
        selectedToDate?: string;
        selectedGlobalBranchId?: number | null;
        selectedGlobalProductId?: number | null;
      };

      if (parsed.selectedGranularity) {
        this.selectedGranularity = parsed.selectedGranularity;
      }

      if (parsed.selectedFromDate) {
        this.selectedFromDate = parsed.selectedFromDate;
      }

      if (parsed.selectedToDate) {
        this.selectedToDate = parsed.selectedToDate;
      }

      if (typeof parsed.selectedGlobalBranchId === 'number') {
        this.selectedGlobalBranchId = parsed.selectedGlobalBranchId;
      }

      if (typeof parsed.selectedGlobalProductId === 'number') {
        this.selectedGlobalProductId = parsed.selectedGlobalProductId;
      }
    } catch {
      sessionStorage.removeItem(this.filtersStorageKey);
    }
  }

  private loadRankingWidget(): void {
    this.rankingLoading = true;
    this.rankingError = null;

    this.adminDashboardDataService.getSalesByBranch().subscribe({
      next: (response) => {
        const rows = [...response].sort((a, b) => b.totalAmount - a.totalAmount);
        this.rankingRows = rows;
        this.updateRankingChart(rows);
        this.rankingLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.rankingError = this.getHttpErrorMessage(error, 'No se pudo cargar el ranking por sucursal.');
        this.rankingRows = [];
        this.updateRankingChart([]);
        this.rankingLoading = false;
      }
    });
  }

  private loadTrendWidget(): void {
    if (this.selectedFromDate && this.selectedToDate && this.selectedFromDate > this.selectedToDate) {
      this.trendError = 'El rango es inválido: la fecha inicial no puede ser mayor que la fecha final.';
      this.summaryError = this.trendError;
      this.summary = null;
      this.summaryLoading = false;
      this.filteredPeriodSummary = null;
      this.trendCurrentBranches = [];
      this.trendPreviousBranches = [];
      this.updateTrendChart([], []);
      this.updateTrendByBranchChart([]);
      return;
    }

    this.trendLoading = true;
    this.trendError = null;
    this.summaryLoading = true;
    this.summaryError = null;

    const currentRange = {
      fromDate: this.selectedFromDate || undefined,
      toDate: this.selectedToDate || undefined
    };

    const previousRange = this.selectedFromDate && this.selectedToDate
      ? this.getPreviousRange(this.selectedFromDate, this.selectedToDate)
      : null;

    const branchIds = this.selectedGlobalBranchId ? [this.selectedGlobalBranchId] : undefined;

    const currentSeriesRequest = this.adminDashboardDataService.getSalesByBranchTimeSeries({
      granularity: this.mapUiGranularityToApi(this.selectedGranularity),
      fromDate: currentRange.fromDate,
      toDate: currentRange.toDate,
      branchIds
    });

    const previousSeriesRequest = previousRange
      ? this.adminDashboardDataService.getSalesByBranchTimeSeries({
        granularity: this.mapUiGranularityToApi(this.selectedGranularity),
        fromDate: previousRange.fromDate,
        toDate: previousRange.toDate,
        branchIds
      })
      : this.adminDashboardDataService.getSalesByBranchTimeSeries({
        granularity: this.mapUiGranularityToApi(this.selectedGranularity),
        fromDate: currentRange.fromDate,
        toDate: currentRange.toDate,
        branchIds
      });

    forkJoin({
      current: currentSeriesRequest,
      previous: previousSeriesRequest
    }).subscribe({
      next: ({ current, previous }) => {
        this.trendCurrentBranches = current.branches;
        this.trendPreviousBranches = previous.branches;
        this.updateTrendChart(this.trendCurrentBranches, this.trendPreviousBranches);
        this.updateTrendByBranchChart(this.trendCurrentBranches);
        const periodSummary = this.buildSummaryFromBranches(this.trendCurrentBranches);
        this.filteredPeriodSummary = periodSummary;
        this.summary = periodSummary;
        this.summaryLoading = false;
        this.trendLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.trendError = this.getHttpErrorMessage(error, 'No se pudo cargar la tendencia de ventas.');
        this.summaryError = this.trendError;
        this.summary = null;
        this.summaryLoading = false;
        this.filteredPeriodSummary = null;
        this.trendCurrentBranches = [];
        this.trendPreviousBranches = [];
        this.updateTrendChart([], []);
        this.updateTrendByBranchChart([]);
        this.trendLoading = false;
      }
    });
  }

  private buildSummaryFromBranches(branches: AdminDashboardBranchTimeSeriesResponse[]): AdminDashboardSalesSummaryResponse {
    const totalAmount = branches.reduce((branchAcc, branch) => branchAcc + branch.points.reduce((pointAcc, point) => pointAcc + point.totalAmount, 0), 0);
    const totalSales = branches.reduce((branchAcc, branch) => branchAcc + branch.points.reduce((pointAcc, point) => pointAcc + point.totalSales, 0), 0);

    return {
      totalAmount,
      totalSales
    };
  }

  private updateRankingChart(rows: AdminDashboardSalesByBranchItemResponse[]): void {
    const topRows = [...rows].slice(0, 10);

    this.rankingChartData = {
      labels: topRows.map((row) => row.branchName),
      datasets: [
        {
          label: 'Monto total',
          data: topRows.map((row) => row.totalAmount),
          backgroundColor: '#1E3A5FCC',
          borderColor: '#1E3A5F',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 30
        }
      ]
    };
  }

  private updateTrendChart(
    currentBranches: AdminDashboardBranchTimeSeriesResponse[],
    previousBranches: AdminDashboardBranchTimeSeriesResponse[]
  ): void {
    const currentAggregated = this.aggregateSeriesByBucket(currentBranches);
    const previousAggregated = this.aggregateSeriesByBucket(previousBranches);

    const currentBuckets = [...currentAggregated.keys()].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const previousValues = [...previousAggregated.values()];
    const alignedPreviousValues = currentBuckets.map((_, index) => previousValues[index] ?? null);

    const metricLabel = this.getTrendMetricLabel();

    this.trendChartData = {
      labels: currentBuckets.map((bucket) => this.formatBucket(bucket, this.selectedGranularity)),
      datasets: [
        {
          label: `${metricLabel} (periodo actual)`,
          data: currentBuckets.map((bucket) => currentAggregated.get(bucket) ?? null),
          borderColor: '#1E3A5F',
          backgroundColor: '#1E3A5F33',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.3,
          fill: false
        },
        {
          label: `${metricLabel} (periodo anterior)`,
          data: alignedPreviousValues,
          borderColor: '#64748B',
          backgroundColor: '#64748B33',
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.3,
          fill: false
        }
      ]
    };
  }

  private updateTrendByBranchChart(branches: AdminDashboardBranchTimeSeriesResponse[]): void {
    const colors = ['#1E3A5F', '#0D9488', '#2563EB', '#7C3AED', '#F59E0B', '#EF4444', '#10B981', '#0EA5E9'];

    const bucketStarts = Array.from(
      new Set(branches.flatMap((branch) => branch.points.map((point) => point.bucketStart)))
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const metricLabel = this.getTrendMetricLabel();

    this.trendByBranchChartData = {
      labels: bucketStarts.map((bucket) => this.formatBucket(bucket, this.selectedGranularity)),
      datasets: branches.map((branch, index) => {
        const color = colors[index % colors.length];
        const pointsByBucket = new Map(branch.points.map((point) => [point.bucketStart, this.resolveTrendMetricValue(point.totalAmount, point.totalSales)]));

        return {
          label: `${branch.branchName} · ${metricLabel}`,
          data: bucketStarts.map((bucket) => pointsByBucket.get(bucket) ?? null),
          borderColor: color,
          backgroundColor: `${color}33`,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.3,
          fill: false
        };
      })
    };
  }

  private aggregateSeriesByBucket(branches: AdminDashboardBranchTimeSeriesResponse[]): Map<string, number> {
    const aggregated = new Map<string, number>();

    for (const branch of branches) {
      for (const point of branch.points) {
        const currentValue = aggregated.get(point.bucketStart) ?? 0;
        const value = this.resolveTrendMetricValue(point.totalAmount, point.totalSales);
        aggregated.set(point.bucketStart, currentValue + value);
      }
    }

    return aggregated;
  }

  private resolveTrendMetricValue(totalAmount: number, totalSales: number): number {
    if (this.selectedTrendMetric === 'SALES') {
      return totalSales;
    }

    if (this.selectedTrendMetric === 'TICKET') {
      return totalSales > 0 ? (totalAmount / totalSales) : 0;
    }

    return totalAmount;
  }

  private getTrendMetricLabel(): string {
    if (this.selectedTrendMetric === 'SALES') {
      return 'Ventas';
    }

    if (this.selectedTrendMetric === 'TICKET') {
      return 'Ticket promedio';
    }

    return 'Monto';
  }

  private formatTrendMetricValue(value: number): string {
    if (this.selectedTrendMetric === 'SALES') {
      return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    }

    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private getPreviousRange(fromDate: string, toDate: string): { fromDate: string; toDate: string } {
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);

    const diffMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 86400000);
    const previousFrom = new Date(previousTo.getTime() - diffMs);

    return {
      fromDate: this.toDateInputValue(previousFrom),
      toDate: this.toDateInputValue(previousTo)
    };
  }

  private setDefaultDateRange(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    this.selectedFromDate = this.toDateInputValue(monthStart);
    this.selectedToDate = this.toDateInputValue(now);
  }

  private toDateInputValue(date: Date): string {
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  private mapUiGranularityToApi(granularity: AdminDashboardUiGranularity): 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' {
    if (granularity === 'DAILY') return 'DAY';
    if (granularity === 'WEEKLY') return 'WEEK';
    if (granularity === 'YEARLY') return 'YEAR';
    return 'MONTH';
  }

  private formatBucket(bucketStart: string, granularity: AdminDashboardUiGranularity): string {
    const date = new Date(bucketStart);

    if (granularity === 'YEARLY') {
      return date.getFullYear().toString();
    }

    if (granularity === 'MONTHLY') {
      return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short' });
    }

    if (granularity === 'WEEKLY') {
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    }

    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  }

  private getHttpErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401 || error.status === 403) {
      return 'No autorizado para consultar analítica de ADMIN. Inicia sesión de nuevo.';
    }

    if (error.status === 0) {
      return 'No hay conexión con el backend. Verifica el servicio e intenta nuevamente.';
    }

    return fallback;
  }
}
