import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { AdminDashboardDataService } from '../../../services/admin/admin-dashboard-data.service';
import { AdminDashboardTransferResponse, AdminDashboardUiGranularity } from '../../../models/admin-dashboard.models';
import { exportToCsv } from '../../../shared/utils/csv-export.util';

type TransferStatusUi = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'COMPLETADA' | 'OTRO';

@Component({
  selector: 'app-transfers-ops-widget',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './transfers-ops-widget.component.html',
  styleUrls: ['./transfers-ops-widget.component.css']
})
export class TransfersOpsWidgetComponent implements OnInit, OnChanges {
  @Input() fromDate = '';
  @Input() toDate = '';
  @Input() granularity: AdminDashboardUiGranularity = 'MONTHLY';
  @Input() branchId: number | null = null;

  loading = false;
  error: string | null = null;

  transfers: AdminDashboardTransferResponse[] = [];
  filteredTransfers: AdminDashboardTransferResponse[] = [];

  statusChartType: 'doughnut' = 'doughnut';
  statusChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };

  timelineChartType: 'line' = 'line';
  timelineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  statusChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  timelineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
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
    this.loadTransfers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['fromDate'] && !changes['toDate'] && !changes['granularity'] && !changes['branchId']) {
      return;
    }

    this.applyFiltersAndBuildWidgets();
  }

  get hasData(): boolean {
    return this.filteredTransfers.length > 0;
  }

  get recentTransfers(): AdminDashboardTransferResponse[] {
    return [...this.filteredTransfers]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 10);
  }

  exportTransfersCsv(): void {
    exportToCsv('transferencias-recientes.csv', this.recentTransfers, [
      { header: 'ID', map: (row) => row.id },
      { header: 'Estado', map: (row) => this.normalizeStatus(row.status) },
      { header: 'Origen', map: (row) => row.sourceBranch?.name },
      { header: 'Destino', map: (row) => row.destBranch?.name },
      { header: 'Producto', map: (row) => row.product?.name },
      { header: 'Cantidad', map: (row) => row.quantity },
      { header: 'Fecha', map: (row) => this.formatDate(row.createdAt) }
    ]);
  }

  private loadTransfers(): void {
    this.loading = true;
    this.error = null;

    this.adminDashboardDataService.getAllTransfers().subscribe({
      next: (rows) => {
        this.transfers = rows;
        this.loading = false;
        this.applyFiltersAndBuildWidgets();
      },
      error: (error: HttpErrorResponse) => {
        this.error = this.getErrorMessage(error, 'No se pudieron cargar transferencias para analítica operativa.');
        this.loading = false;
        this.transfers = [];
        this.filteredTransfers = [];
        this.updateStatusChart([]);
        this.updateTimelineChart([]);
      }
    });
  }

  private applyFiltersAndBuildWidgets(): void {
    if (!this.fromDate || !this.toDate) {
      this.filteredTransfers = [];
      this.updateStatusChart([]);
      this.updateTimelineChart([]);
      return;
    }

    if (this.fromDate > this.toDate) {
      this.error = 'Rango inválido: la fecha inicial no puede ser mayor a la fecha final.';
      this.filteredTransfers = [];
      this.updateStatusChart([]);
      this.updateTimelineChart([]);
      return;
    }

    this.error = null;

    const from = new Date(`${this.fromDate}T00:00:00`).getTime();
    const to = new Date(`${this.toDate}T23:59:59`).getTime();

    this.filteredTransfers = this.transfers.filter((transfer) => {
      const createdAt = transfer.createdAt ? new Date(transfer.createdAt).getTime() : NaN;
      if (!Number.isFinite(createdAt)) return false;
      if (createdAt < from || createdAt > to) return false;

      if (this.branchId) {
        return transfer.sourceBranch?.id === this.branchId || transfer.destBranch?.id === this.branchId;
      }

      return true;
    });

    this.updateStatusChart(this.filteredTransfers);
    this.updateTimelineChart(this.filteredTransfers);
  }

  private updateStatusChart(rows: AdminDashboardTransferResponse[]): void {
    const statuses: TransferStatusUi[] = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'COMPLETADA'];
    const counts = new Map<TransferStatusUi, number>(statuses.map((status) => [status, 0]));

    rows.forEach((row) => {
      const status = this.normalizeStatus(row.status);
      const current = counts.get(status) ?? 0;
      counts.set(status, current + 1);
    });

    const data = statuses.map((status) => counts.get(status) ?? 0);

    this.statusChartData = {
      labels: statuses,
      datasets: [
        {
          label: 'Transferencias por estado',
          data,
          backgroundColor: ['#F59E0B', '#3B82F6', '#EF4444', '#10B981'],
          borderColor: ['#B45309', '#1D4ED8', '#B91C1C', '#047857'],
          borderWidth: 1
        }
      ]
    };
  }

  private updateTimelineChart(rows: AdminDashboardTransferResponse[]): void {
    const buckets = new Map<string, { requested: number; completed: number }>();

    rows.forEach((row) => {
      if (!row.createdAt) {
        return;
      }

      const bucket = this.bucketFromDate(new Date(row.createdAt), this.granularity);
      if (!bucket) {
        return;
      }

      const current = buckets.get(bucket) ?? { requested: 0, completed: 0 };
      current.requested += 1;

      if (this.normalizeStatus(row.status) === 'COMPLETADA') {
        current.completed += 1;
      }

      buckets.set(bucket, current);
    });

    const labels = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));

    this.timelineChartData = {
      labels,
      datasets: [
        {
          label: 'Solicitadas',
          data: labels.map((label) => buckets.get(label)?.requested ?? 0),
          borderColor: '#2563EB',
          backgroundColor: '#2563EB33',
          borderWidth: 2,
          tension: 0.25,
          fill: false
        },
        {
          label: 'Completadas',
          data: labels.map((label) => buckets.get(label)?.completed ?? 0),
          borderColor: '#10B981',
          backgroundColor: '#10B98133',
          borderWidth: 2,
          tension: 0.25,
          fill: false
        }
      ]
    };
  }

  private normalizeStatus(status: string | undefined): TransferStatusUi {
    const normalized = (status ?? '').toUpperCase();

    if (normalized.includes('PEND')) return 'PENDIENTE';
    if (normalized.includes('APPROV') || normalized.includes('ACEPT')) return 'ACEPTADA';
    if (normalized.includes('REJEC') || normalized.includes('RECHAZ')) return 'RECHAZADA';
    if (normalized.includes('COMPLET')) return 'COMPLETADA';

    return 'OTRO';
  }

  private bucketFromDate(date: Date, granularity: AdminDashboardUiGranularity): string | null {
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    if (granularity === 'YEARLY') {
      return `${year}`;
    }

    if (granularity === 'MONTHLY') {
      return `${year}-${month}`;
    }

    if (granularity === 'WEEKLY') {
      const weekDate = new Date(date);
      const currentDay = weekDate.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      weekDate.setDate(weekDate.getDate() - diffToMonday);
      const weekMonth = `${weekDate.getMonth() + 1}`.padStart(2, '0');
      const weekDay = `${weekDate.getDate()}`.padStart(2, '0');
      return `${weekDate.getFullYear()}-${weekMonth}-${weekDay}`;
    }

    return `${year}-${month}-${day}`;
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401 || error.status === 403) {
      return 'No autorizado para consultar transferencias de ADMIN. Inicia sesión de nuevo.';
    }

    if (error.status === 0) {
      return 'No hay conexión con el backend. Verifica el servicio e intenta nuevamente.';
    }

    return fallback;
  }
}
