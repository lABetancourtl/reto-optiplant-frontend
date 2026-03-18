import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminDashboardDataService } from '../../../services/admin/admin-dashboard-data.service';
import { AdminDashboardApiGranularity, AdminDashboardUiGranularity } from '../../../models/admin-dashboard.models';

interface SalesTotals {
  totalAmount: number;
  totalSales: number;
}

@Component({
  selector: 'app-sales-comparison-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-comparison-widget.component.html',
  styleUrls: ['./sales-comparison-widget.component.css']
})
export class SalesComparisonWidgetComponent implements OnChanges {
  @Input() fromDate = '';
  @Input() toDate = '';
  @Input() granularity: AdminDashboardUiGranularity = 'MONTHLY';
  @Input() branchId: number | null = null;

  loading = false;
  error: string | null = null;

  current: SalesTotals | null = null;
  previous: SalesTotals | null = null;

  constructor(private readonly adminDashboardDataService: AdminDashboardDataService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['fromDate'] && !changes['toDate'] && !changes['granularity'] && !changes['branchId']) {
      return;
    }

    this.loadComparison();
  }

  get hasData(): boolean {
    return this.current !== null && this.previous !== null;
  }

  get amountDiff(): number {
    if (!this.current || !this.previous) return 0;
    return this.current.totalAmount - this.previous.totalAmount;
  }

  get salesDiff(): number {
    if (!this.current || !this.previous) return 0;
    return this.current.totalSales - this.previous.totalSales;
  }

  get amountDiffPct(): number | null {
    if (!this.current || this.current.totalAmount === 0) return null;
    return (this.amountDiff / this.current.totalAmount) * 100;
  }

  get salesDiffPct(): number | null {
    if (!this.current || this.current.totalSales === 0) return null;
    return (this.salesDiff / this.current.totalSales) * 100;
  }

  get amountTrend(): 'positive' | 'negative' | 'neutral' {
    return this.resolveTrend(this.amountDiff);
  }

  get salesTrend(): 'positive' | 'negative' | 'neutral' {
    return this.resolveTrend(this.salesDiff);
  }

  private loadComparison(): void {
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.error = 'Rango inválido: la fecha inicial no puede ser mayor a la fecha final.';
      this.current = null;
      this.previous = null;
      return;
    }

    if (!this.fromDate || !this.toDate) {
      this.error = 'Selecciona un rango de fechas para calcular comparativos.';
      this.current = null;
      this.previous = null;
      return;
    }

    this.loading = true;
    this.error = null;

    const currentRange = { fromDate: this.fromDate, toDate: this.toDate };
    const previousRange = this.getPreviousRange(currentRange.fromDate, currentRange.toDate);

    this.adminDashboardDataService.getSalesByBranchTimeSeries({
      granularity: this.mapGranularity(this.granularity),
      fromDate: currentRange.fromDate,
      toDate: currentRange.toDate,
      branchIds: this.branchId ? [this.branchId] : undefined
    }).subscribe({
      next: (currentResponse) => {
        const currentTotals = this.toTotals(currentResponse.branches);

        this.adminDashboardDataService.getSalesByBranchTimeSeries({
          granularity: this.mapGranularity(this.granularity),
          fromDate: previousRange.fromDate,
          toDate: previousRange.toDate,
          branchIds: this.branchId ? [this.branchId] : undefined
        }).subscribe({
          next: (previousResponse) => {
            this.current = currentTotals;
            this.previous = this.toTotals(previousResponse.branches);
            this.loading = false;
          },
          error: (error: HttpErrorResponse) => {
            this.error = this.getErrorMessage(error, 'No se pudo calcular el periodo anterior para el comparativo.');
            this.current = null;
            this.previous = null;
            this.loading = false;
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudo calcular el periodo actual para el comparativo.');
        this.current = null;
        this.previous = null;
        this.loading = false;
      }
    });
  }

  private toTotals(branches: Array<{ points: Array<{ totalAmount: number; totalSales: number }> }>): SalesTotals {
    const totalAmount = branches.reduce((branchAcc, branch) => branchAcc + branch.points.reduce((sum, point) => sum + point.totalAmount, 0), 0);
    const totalSales = branches.reduce((branchAcc, branch) => branchAcc + branch.points.reduce((sum, point) => sum + point.totalSales, 0), 0);

    return { totalAmount, totalSales };
  }

  private getPreviousRange(fromDate: string, toDate: string): { fromDate: string; toDate: string } {
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T00:00:00`);

    const diffMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 86400000);
    const previousFrom = new Date(previousTo.getTime() - diffMs);

    return {
      fromDate: this.toDateInput(previousFrom),
      toDate: this.toDateInput(previousTo)
    };
  }

  private toDateInput(date: Date): string {
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  private mapGranularity(granularity: AdminDashboardUiGranularity): AdminDashboardApiGranularity {
    if (granularity === 'DAILY') return 'DAY';
    if (granularity === 'WEEKLY') return 'WEEK';
    if (granularity === 'YEARLY') return 'YEAR';
    return 'MONTH';
  }

  private resolveTrend(value: number): 'positive' | 'negative' | 'neutral' {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  formatPercent(value: number | null): string {
    if (value === null) return 'Sin base';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
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
