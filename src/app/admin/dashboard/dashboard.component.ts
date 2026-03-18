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
  summaryPrevious: AdminSalesSummary | null = null;
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
    summaryPeriod: SalesGranularity = 'MONTH';
    summaryPeriodOptions: Array<{ value: SalesGranularity; label: string }> = [
      { value: 'YEAR', label: 'Año' },
      { value: 'MONTH', label: 'Mes' },
      { value: 'WEEK', label: 'Semana' },
      { value: 'DAY', label: 'Día' }
    ];

  byBranchError: string | null = null;
  productQueryError: string | null = null;
  branchQueryError: string | null = null;
  filtersError: string | null = null;

  salesByBranchChartType: 'line' = 'line';
  salesByBranchChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  branchRankingChartType: 'bar' = 'bar';
  branchRankingChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  branchShareChartType: 'doughnut' = 'doughnut';
  branchShareChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };

  productUnitsChartType: 'bar' = 'bar';
  productUnitsChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  productAmountChartType: 'bar' = 'bar';
  productAmountChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  branchTopProductsChartType: 'doughnut' = 'doughnut';
  branchTopProductsChartData: ChartConfiguration<'doughnut'>['data'] = {
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

  branchRankingChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Monto: ${Number(context.raw).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: '#6B7280',
          callback: (value) => Number(value).toLocaleString('es-CO')
        },
        grid: { color: 'rgba(226, 232, 240, 0.6)' }
      },
      y: {
        ticks: { color: '#6B7280' },
        grid: { display: false }
      }
    }
  };

  branchShareChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data
              .map(value => Number(value))
              .reduce((sum, value) => sum + value, 0);
            const current = Number(context.raw);
            const share = total > 0 ? (current / total) * 100 : 0;
            return `${context.label}: ${current.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${share.toFixed(1)}%)`;
          }
        }
      }
    }
  };

  productUnitsChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Unidades: ${Number(context.raw).toLocaleString('es-CO')}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#6B7280' },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#6B7280' },
        grid: { color: 'rgba(226, 232, 240, 0.6)' }
      }
    }
  };

  productAmountChartOptions: ChartOptions<'bar'> = {
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
      x: {
        ticks: { color: '#6B7280' },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6B7280',
          callback: (value) => Number(value).toLocaleString('es-CO')
        },
        grid: { color: 'rgba(226, 232, 240, 0.6)' }
      }
    }
  };

  branchTopProductsChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${Number(context.raw).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

    const currentRange = this.getSummaryDateRange(this.summaryPeriod);
    const previousRange = this.getPreviousSummaryDateRange(currentRange.fromDate, currentRange.toDate);

    forkJoin({
      current: this.analyticsService.getSalesByBranchTimeSeries({
        granularity: this.summaryPeriod,
        fromDate: currentRange.fromDate,
        toDate: currentRange.toDate
      }),
      previous: this.analyticsService.getSalesByBranchTimeSeries({
        granularity: this.summaryPeriod,
        fromDate: previousRange.fromDate,
        toDate: previousRange.toDate
      })
    }).subscribe({
      next: ({ current, previous }) => {
        this.summary = this.buildSummaryFromSeries(current);
        this.summaryPrevious = this.buildSummaryFromSeries(previous);
        this.loadingSummary = false;
      },
      error: (error: HttpErrorResponse) => {
        this.summaryError = this.getErrorMessage(error, 'Error al cargar el resumen global.');
        this.summary = null;
        this.summaryPrevious = null;
        this.loadingSummary = false;
      }
    });
  }

  onSummaryPeriodChange(period: SalesGranularity): void {
    this.summaryPeriod = period;
    this.loadSummary();
  }

  getSummaryPeriodLabel(): string {
    if (this.summaryPeriod === 'YEAR') return 'año actual';
    if (this.summaryPeriod === 'MONTH') return 'mes actual';
    if (this.summaryPeriod === 'WEEK') return 'semana actual';
    return 'día actual';
  }

  private getSummaryDateRange(period: SalesGranularity): { fromDate: string; toDate: string } {
    const now = new Date();
    const end = new Date(now);

    let start: Date;

    if (period === 'YEAR') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'WEEK') {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      start = new Date(now);
      start.setDate(now.getDate() - diffToMonday);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return {
      fromDate: this.toDateInputValue(start),
      toDate: this.toDateInputValue(end)
    };
  }

  private getPreviousSummaryDateRange(fromDate: string, toDate: string): { fromDate: string; toDate: string } {
    const currentStart = this.fromDateInputValue(fromDate);
    const currentEnd = this.fromDateInputValue(toDate);

    const spanMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousStart = new Date(previousEnd.getTime() - spanMs);

    return {
      fromDate: this.toDateInputValue(previousStart),
      toDate: this.toDateInputValue(previousEnd)
    };
  }

  private fromDateInputValue(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }

  private buildSummaryFromSeries(data: SalesByBranchTimeSeriesResponse): AdminSalesSummary {
    const totalAmount = data.branches.reduce((branchAcc, branch) => {
      return branchAcc + branch.points.reduce((pointAcc, point) => pointAcc + point.totalAmount, 0);
    }, 0);

    const totalSales = data.branches.reduce((branchAcc, branch) => {
      return branchAcc + branch.points.reduce((pointAcc, point) => pointAcc + point.totalSales, 0);
    }, 0);

    return {
      totalAmount,
      totalSales
    };
  }

  get summaryAmountDeltaPct(): number | null {
    if (!this.summary || !this.summaryPrevious) return null;
    if (this.summaryPrevious.totalAmount === 0) return null;
    return ((this.summary.totalAmount - this.summaryPrevious.totalAmount) / this.summaryPrevious.totalAmount) * 100;
  }

  get summarySalesDeltaPct(): number | null {
    if (!this.summary || !this.summaryPrevious) return null;
    if (this.summaryPrevious.totalSales === 0) return null;
    return ((this.summary.totalSales - this.summaryPrevious.totalSales) / this.summaryPrevious.totalSales) * 100;
  }

  formatDeltaPercent(value: number | null): string {
    if (value === null || Number.isNaN(value)) {
      return 'Sin base comparativa';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  getDeltaTrend(value: number | null): 'positive' | 'negative' | 'neutral' {
    if (value === null || Number.isNaN(value)) return 'neutral';
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  getDeltaIcon(value: number | null): string {
    const trend = this.getDeltaTrend(value);
    if (trend === 'positive') return 'pi pi-arrow-up';
    if (trend === 'negative') return 'pi pi-arrow-down';
    return 'pi pi-minus';
  }

  get executiveInsight(): string {
    const amountDelta = this.summaryAmountDeltaPct;
    const salesDelta = this.summarySalesDeltaPct;

    if (amountDelta === null && salesDelta === null) {
      return 'No hay base histórica suficiente para comparar con el periodo anterior.';
    }

    if ((amountDelta ?? 0) >= 0 && (salesDelta ?? 0) >= 0) {
      return 'Tendencia favorable: crecen tanto ingresos como número de ventas frente al periodo anterior.';
    }

    if ((amountDelta ?? 0) < 0 && (salesDelta ?? 0) < 0) {
      return 'Alerta de caída: disminuyen ingresos y ventas frente al periodo anterior.';
    }

    return 'Señal mixta: el ingreso y el volumen de ventas muestran comportamientos diferentes frente al periodo anterior.';
  }

  get salesByBranchTotalAmount(): number {
    return this.salesByBranch.reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get salesByBranchTotalSales(): number {
    return this.salesByBranch.reduce((sum, row) => sum + row.totalSales, 0);
  }

  get salesByBranchActiveBranches(): number {
    return this.salesByBranch.filter((row) => row.totalSales > 0).length;
  }

  get salesByBranchAverageTicket(): number {
    if (this.salesByBranchTotalSales <= 0) return 0;
    return this.salesByBranchTotalAmount / this.salesByBranchTotalSales;
  }

  get salesByBranchRowsWithShare(): Array<AdminSalesByBranchItem & { share: number; averageTicket: number }> {
    const totalAmount = this.salesByBranchTotalAmount;

    return [...this.salesByBranch]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((row) => {
        const share = totalAmount > 0 ? (row.totalAmount / totalAmount) * 100 : 0;
        const averageTicket = row.totalSales > 0 ? row.totalAmount / row.totalSales : 0;

        return {
          ...row,
          share,
          averageTicket
        };
      });
  }

  get salesByBranchExecutiveInsight(): string {
    const top = this.topBranchByAmount;
    if (!top || this.salesByBranchTotalAmount <= 0) {
      return 'Sin datos suficientes para identificar liderazgo por sucursal en el periodo.';
    }

    const share = (top.totalAmount / this.salesByBranchTotalAmount) * 100;
    if (share >= 50) {
      return `${top.branchName} concentra ${share.toFixed(1)}% del ingreso; revisar riesgo de dependencia comercial.`;
    }

    return `${top.branchName} lidera con ${share.toFixed(1)}% del ingreso; distribución relativamente balanceada entre sucursales.`;
  }

  get isSalesByBranchBranchFiltered(): boolean {
    return this.selectedSalesBranchIds.length > 0;
  }

  get salesByBranchScopeLabel(): string {
    if (!this.isSalesByBranchBranchFiltered) {
      return 'Todas las sucursales';
    }
    const count = this.selectedSalesBranchIds.length;
    return `${count} sucursal${count > 1 ? 'es' : ''} filtrada${count > 1 ? 's' : ''}`;
  }

  get isSalesByBranchAlignedWithSummary(): boolean {
    const summaryRange = this.getSummaryDateRange(this.summaryPeriod);
    return !this.isSalesByBranchBranchFiltered
      && this.selectedFromDate === summaryRange.fromDate
      && this.selectedToDate === summaryRange.toDate;
  }

  get salesByBranchVsSummaryAmountDiff(): number | null {
    if (!this.summary) return null;
    return this.salesByBranchTotalAmount - this.summary.totalAmount;
  }

  get salesByBranchVsSummarySalesDiff(): number | null {
    if (!this.summary) return null;
    return this.salesByBranchTotalSales - this.summary.totalSales;
  }

  get salesByBranchComparisonMessage(): string {
    if (!this.summary) {
      return 'No hay resumen global disponible para comparar.';
    }

    if (!this.isSalesByBranchAlignedWithSummary) {
      return 'El bloque de sucursales usa un alcance distinto al resumen global (rango o filtro por sucursal).';
    }

    const amountDiff = this.salesByBranchVsSummaryAmountDiff ?? 0;
    const salesDiff = this.salesByBranchVsSummarySalesDiff ?? 0;

    if (Math.abs(amountDiff) < 0.01 && salesDiff === 0) {
      return 'Cuadra con el resumen global para el mismo alcance.';
    }

    return `Diferencia detectada vs resumen: monto ${amountDiff.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} y ventas ${salesDiff.toLocaleString('es-CO')}.`;
  }

  syncSalesByBranchWithSummary(): void {
    const summaryRange = this.getSummaryDateRange(this.summaryPeriod);
    this.selectedGranularity = this.summaryPeriod;
    this.selectedFromDate = summaryRange.fromDate;
    this.selectedToDate = summaryRange.toDate;
    this.selectedSalesBranchIds = [];
    this.loadSalesByBranch();
  }

  get productExecutiveInsight(): string {
    if (!this.productTopBranch) {
      return 'Selecciona un producto para ver recomendaciones de desempeño por sucursal.';
    }

    const top = this.topBranchByProductAmount;
    if (!top || this.productTopBranch.totalAmount <= 0) {
      return `El producto ${this.productTopBranch.productName} no registra ventas en el periodo consultado.`;
    }

    const total = this.productSalesByBranch.reduce((sum, row) => sum + row.totalAmount, 0);
    const share = total > 0 ? (top.totalAmount / total) * 100 : 0;
    return `${top.branchName} aporta ${share.toFixed(1)}% del ingreso de ${this.productTopBranch.productName}; prioriza reposición y campañas allí.`;
  }

  get branchExecutiveInsight(): string {
    if (!this.selectedBranchId) {
      return 'Selecciona una sucursal para evaluar concentración de su portafolio.';
    }

    if (this.branchTopProducts.length === 0) {
      return 'La sucursal seleccionada no presenta ventas en el periodo consultado.';
    }

    const top = this.topProductInSelectedBranch;
    const total = this.branchTopProducts.reduce((sum, row) => sum + row.totalAmount, 0);
    if (!top || total <= 0) {
      return 'No se pudo calcular concentración por producto con la información disponible.';
    }

    const share = (top.totalAmount / total) * 100;
    const selectedBranchName = this.branches.find((b) => b.id === this.selectedBranchId)?.name ?? 'La sucursal';
    return `${selectedBranchName} tiene como producto principal ${top.productName} con ${share.toFixed(1)}% del ingreso del top consultado.`;
  }

  private toDateInputValue(date: Date): string {
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  loadSalesByBranch(): void {
    if (this.selectedFromDate && this.selectedToDate && this.selectedFromDate > this.selectedToDate) {
      this.byBranchError = 'El rango de fechas es inválido: la fecha inicial no puede ser mayor que la final.';
      this.updateSalesByBranchChart([]);
      this.updateBranchRankingChart([]);
      this.updateBranchShareChart([]);
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
        this.updateBranchRankingChart(this.salesByBranch);
        this.updateBranchShareChart(this.salesByBranch);
        this.loadingSalesByBranch = false;
      },
      error: (error: HttpErrorResponse) => {
        this.byBranchError = this.getErrorMessage(error, 'Error al cargar ventas por sucursal.');
        this.salesByBranchTimeSeries = null;
        this.salesByBranch = [];
        this.updateSalesByBranchChart([]);
        this.updateBranchRankingChart([]);
        this.updateBranchShareChart([]);
        this.loadingSalesByBranch = false;
      }
    });
  }

  private updateBranchRankingChart(rows: AdminSalesByBranchItem[]): void {
    const topRows = [...rows]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8);

    this.branchRankingChartData = {
      labels: topRows.map((row) => row.branchName),
      datasets: [
        {
          label: 'Monto total',
          data: topRows.map((row) => row.totalAmount),
          backgroundColor: '#1E3A5FCC',
          borderColor: '#1E3A5F',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 20
        }
      ]
    };
  }

  private updateBranchShareChart(rows: AdminSalesByBranchItem[]): void {
    const sorted = [...rows].sort((a, b) => b.totalAmount - a.totalAmount);
    const topRows = sorted.slice(0, 6);
    const remainingAmount = sorted.slice(6).reduce((sum, row) => sum + row.totalAmount, 0);

    const labels = topRows.map((row) => row.branchName);
    const data = topRows.map((row) => row.totalAmount);

    if (remainingAmount > 0) {
      labels.push('Otras sucursales');
      data.push(remainingAmount);
    }

    const palette = ['#1E3A5F', '#0D9488', '#2563EB', '#7C3AED', '#F59E0B', '#EF4444', '#10B981'];

    this.branchShareChartData = {
      labels,
      datasets: [
        {
          label: 'Participación de ingreso',
          data,
          backgroundColor: labels.map((_, index) => `${palette[index % palette.length]}CC`),
          borderColor: labels.map((_, index) => palette[index % palette.length]),
          borderWidth: 1
        }
      ]
    };
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
        this.updateProductCharts(salesByBranch);
        this.loadingProductQuery = false;
      },
      error: (error: HttpErrorResponse) => {
        this.productQueryError = this.getErrorMessage(error, 'Error al consultar analítica por producto.');
        this.updateProductCharts([]);
        this.loadingProductQuery = false;
      }
    });
  }

  private updateProductCharts(rows: AdminProductSalesByBranchItem[]): void {
    const sorted = [...rows].sort((a, b) => b.totalAmount - a.totalAmount);

    this.productUnitsChartData = {
      labels: sorted.map((row) => row.branchName),
      datasets: [
        {
          label: 'Unidades vendidas',
          data: sorted.map((row) => row.unitsSold),
          backgroundColor: '#0D9488CC',
          borderColor: '#0D9488',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 28
        }
      ]
    };

    this.productAmountChartData = {
      labels: sorted.map((row) => row.branchName),
      datasets: [
        {
          label: 'Monto vendido',
          data: sorted.map((row) => row.totalAmount),
          backgroundColor: '#2563EBCC',
          borderColor: '#2563EB',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 28
        }
      ]
    };
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
        this.updateBranchTopProductsChart(data);
        this.loadingBranchQuery = false;
      },
      error: (error: HttpErrorResponse) => {
        this.branchQueryError = this.getErrorMessage(error, 'Error al consultar top productos por sucursal.');
        this.updateBranchTopProductsChart([]);
        this.loadingBranchQuery = false;
      }
    });
  }

  private updateBranchTopProductsChart(rows: AdminBranchTopProductItem[]): void {
    const palette = ['#1E3A5F', '#0D9488', '#2563EB', '#7C3AED', '#F59E0B', '#EF4444', '#10B981', '#0EA5E9'];
    const sorted = [...rows]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8);

    this.branchTopProductsChartData = {
      labels: sorted.map((item) => item.productName),
      datasets: [
        {
          label: 'Monto vendido',
          data: sorted.map((item) => item.totalAmount),
          backgroundColor: sorted.map((_, index) => `${palette[index % palette.length]}CC`),
          borderColor: sorted.map((_, index) => palette[index % palette.length]),
          borderWidth: 1
        }
      ]
    };
  }

  get topBranchByAmount(): AdminSalesByBranchItem | null {
    if (this.salesByBranch.length === 0) return null;
    return [...this.salesByBranch].sort((a, b) => b.totalAmount - a.totalAmount)[0] ?? null;
  }

  get topBranchByProductAmount(): AdminProductSalesByBranchItem | null {
    if (this.productSalesByBranch.length === 0) return null;
    return [...this.productSalesByBranch].sort((a, b) => b.totalAmount - a.totalAmount)[0] ?? null;
  }

  get topProductInSelectedBranch(): AdminBranchTopProductItem | null {
    if (this.branchTopProducts.length === 0) return null;
    return [...this.branchTopProducts].sort((a, b) => b.totalAmount - a.totalAmount)[0] ?? null;
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
