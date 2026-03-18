                                                                                                                                                                                                                                                      import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Product, ProductService } from '../../services/admin/product.service';
import { Branch, SucursalesService } from '../../services/admin/sucursal.service';
import { AuthService } from '../../services/auth.service';
import { enviroments } from '../../../enviroments/enviroments';
import { InventarioService, InventoryItem } from '../../services/admin/inventario.service';
import {
  CreateInboundTransferRequest,
  InboundTransferResult,
  TransferService
} from '../../services/sucursal/trasnfer.servic';

type SupplyMode = 'single' | 'multiple' | 'all';
type InboundTab = 'registrar' | 'listado';

interface SupplyResult {
  branchId: number;
  branchName: string;
  ok: boolean;
  addedQuantity: number;
  transferId: number | null;
  trackingCode: string | null;
  status: string;
  message: string;
}

interface InboundHistoryRow {
  origin: string;
  destination: string;
  product: string;
  quantity: number;
  createdAt: string;
  status: string;
  trackingCode: string;
}

@Component({
  selector: 'app-abastecimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abastecimiento.component.html',
  styleUrl: './abastecimiento.component.css'
})
export class AbastecimientoComponent implements OnInit {
  activeTab: InboundTab = 'registrar';
  mode: SupplyMode = 'single';

  branches: Branch[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];

  selectedBranchId: number | null = null;
  selectedBranchIds: number[] = [];
  selectedProductId: number | null = null;
  quantityToAdd = 1;
  productSearch = '';

  loadingData = false;
  submitting = false;

  error: string | null = null;
  success: string | null = null;

  results: SupplyResult[] = [];
  inboundHistory: InboundHistoryRow[] = [];
  historySearch = '';
  historyStatusFilter = 'todos';
  historyDestinationFilter = 'todas';
  loadingHistory = false;
  historyError: string | null = null;

  constructor(
    private transferService: TransferService,
    private productService: ProductService,
    private sucursalesService: SucursalesService,
    private authService: AuthService,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadInboundHistory();
  }

  setTab(tab: InboundTab): void {
    this.activeTab = tab;
    if (tab === 'listado' && this.inboundHistory.length === 0 && !this.loadingHistory) {
      this.loadInboundHistory();
    }
  }

  get historyStatusOptions(): string[] {
    const statuses = Array.from(
      new Set(
        this.inboundHistory
          .map((row) => row.status)
          .filter((status) => !!status && status !== '—')
      )
    );
    return statuses.sort((a, b) => a.localeCompare(b));
  }

  get historyDestinationOptions(): string[] {
    const destinations = Array.from(
      new Set(
        this.inboundHistory
          .map((row) => row.destination)
          .filter((destination) => !!destination && destination !== '—')
      )
    );
    return destinations.sort((a, b) => a.localeCompare(b));
  }

  get filteredInboundHistory(): InboundHistoryRow[] {
    let rows = [...this.inboundHistory];

    if (this.historyStatusFilter !== 'todos') {
      rows = rows.filter((row) => row.status === this.historyStatusFilter);
    }

    if (this.historyDestinationFilter !== 'todas') {
      rows = rows.filter((row) => row.destination === this.historyDestinationFilter);
    }

    const query = this.historySearch.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      row.destination.toLowerCase().includes(query) ||
      row.product.toLowerCase().includes(query) ||
      row.createdAt.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query) ||
      row.trackingCode.toLowerCase().includes(query)
    );
  }

  get canSubmit(): boolean {
    if (!this.authService.hasAnyRole(['ADMIN'])) {
      return false;
    }

    const base = !!this.selectedProductId && this.quantityToAdd > 0 && !this.submitting;
    if (!base) {
      return false;
    }

    if (this.mode === 'single') {
      return !!this.selectedBranchId;
    }

    if (this.mode === 'multiple') {
      return this.selectedBranchIds.length > 0;
    }

    return this.branches.length > 0;
  }

  get allSelectedInMultiple(): boolean {
    return this.branches.length > 0 && this.selectedBranchIds.length === this.branches.length;
  }

  setMode(mode: SupplyMode): void {
    this.mode = mode;
    this.selectedBranchId = null;
    this.selectedBranchIds = [];
    this.error = null;
    this.success = null;
    this.results = [];
  }

  onProductSearchChange(): void {
    const query = this.productSearch.trim().toLowerCase();
    this.filteredProducts = !query
      ? [...this.products]
      : this.products.filter((product) => product.name.toLowerCase().includes(query));
  }

  toggleDestination(branchId: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedBranchIds.includes(branchId)) {
        this.selectedBranchIds = [...this.selectedBranchIds, branchId];
      }
      return;
    }

    this.selectedBranchIds = this.selectedBranchIds.filter((id) => id !== branchId);
  }

  toggleAllDestinations(checked: boolean): void {
    if (checked) {
      this.selectedBranchIds = this.branches.map((branch) => branch.id);
      return;
    }

    this.selectedBranchIds = [];
  }

  submitSupply(): void {
    this.error = null;
    this.success = null;
    this.results = [];

    if (!this.authService.hasAnyRole(['ADMIN'])) {
      this.error = 'Solo ADMIN puede crear abastecimientos.';
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Sesión expirada, vuelve a iniciar sesión.';
      return;
    }

    if (!this.selectedProductId) {
      this.error = 'Debes seleccionar un producto.';
      return;
    }

    if (this.quantityToAdd < 1) {
      this.error = 'La cantidad a ingresar debe ser mayor o igual a 1.';
      return;
    }

    const destinationBranchIds = this.mode === 'single'
      ? [this.selectedBranchId as number]
      : this.mode === 'multiple'
        ? [...this.selectedBranchIds]
        : [];

    if (this.mode !== 'all' && destinationBranchIds.length === 0) {
      this.error = 'Debes seleccionar al menos una sucursal destino.';
      return;
    }

    const request: CreateInboundTransferRequest = {
      productId: this.selectedProductId,
      quantity: this.quantityToAdd,
      destinationBranchIds,
      allBranches: this.mode === 'all'
    };

    const endpoint = `${enviroments.apiUrl}/transfers/inbound`;
    const role = this.authService.getNormalizedUserRole() || 'SIN_ROL';
    const hasAuthorizationHeader = !!token;
    const decoded = this.authService.getDecodedToken() || {};

    console.log('[Abastecimiento][Outbound]', {
      endpoint,
      hasAuthorizationHeader,
      role,
      mode: this.mode,
      destinationsCount: request.allBranches ? this.branches.length : request.destinationBranchIds.length
    });

    console.log('[Abastecimiento][JWT Claims]', {
      roleClaim: decoded?.role,
      authoritiesClaim: decoded?.authorities,
      scopeClaim: decoded?.scope,
      sub: decoded?.sub
    });

    this.submitting = true;

    this.transferService.createInboundTransfer(request).subscribe({
      next: (response) => {
        const normalized = this.normalizeInboundResponse(response, request);
        this.results = normalized;
        this.loadInboundHistory();

        const okCount = normalized.filter((row) => row.ok).length;
        const failCount = normalized.length - okCount;

        if (okCount > 0 && failCount === 0) {
          this.success = normalized.length === 1
            ? 'Ingreso registrado y código generado correctamente.'
            : `Ingreso registrado en ${okCount} sucursal(es) con código de confirmación.`;
        } else if (okCount > 0) {
          this.success = `Ingreso registrado en ${okCount} sucursal(es).`;
          this.error = `${failCount} sucursal(es) no pudieron generar código.`;
        } else {
          this.error = 'No se pudo registrar el ingreso en ninguna sucursal.';
        }

        this.submitting = false;
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          console.error('[Abastecimiento][403 Debug]', {
            endpoint,
            role,
            hasAuthorizationHeader,
            responseBody: error.error,
            responseMessage: error.message
          });
        }
        this.error = this.getInboundErrorMessage(error);
        this.submitting = false;
      }
    });
  }

  loadInboundHistory(): void {
    this.loadingHistory = true;
    this.historyError = null;

    this.transferService.getAllTransfers().subscribe({
      next: (rows) => {
        const inboundRows = rows
          .filter((row) => this.isInboundTransfer(row))
          .map((row) => ({
            origin: 'Ingreso',
            destination: row?.destBranch?.name || `Sucursal ${row?.destBranch?.id ?? '—'}`,
            product: row?.product?.name || '—',
            quantity: row?.quantity ?? 0,
            createdAt: row?.createdAt || '',
            status: row?.status || '—',
            trackingCode: row?.trackingCode || '—'
          }));

        this.inboundHistory = inboundRows;
        this.historySearch = '';
        this.historyStatusFilter = 'todos';
        this.historyDestinationFilter = 'todas';
        this.loadingHistory = false;
      },
      error: (error) => {
        this.historyError = this.transferService.extractErrorMessage(error, 'No se pudo cargar el historial de ingresos.');
        this.loadingHistory = false;
      }
    });
  }

  private isInboundTransfer(row: InboundTransferResult): boolean {
    const anyRow = row as unknown as {
      sourceBranch?: { id?: number | null; name?: string | null } | null;
    };

    const sourceId = anyRow.sourceBranch?.id;
    const sourceName = anyRow.sourceBranch?.name;
    return !sourceId && !sourceName;
  }

  private getInboundErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'No tienes permisos (requiere rol ADMIN o token inválido).';
      }

      if (error.status === 401) {
        return 'Sesión expirada, vuelve a iniciar sesión.';
      }

      if (error.status === 400 || error.status >= 500) {
        return this.transferService.extractErrorMessage(error, 'No se pudo registrar el ingreso de mercancía.');
      }
    }

    return this.transferService.extractErrorMessage(error, 'No se pudo registrar el ingreso de mercancía.');
  }

  private loadInitialData(): void {
    this.loadingData = true;
    this.error = null;

    forkJoin({
      branches: this.loadBranchesWithFallback(),
      products: this.productService.getAllProducts()
    }).subscribe({
      next: ({ branches, products }) => {
        this.branches = branches;
        this.products = products;
        this.filteredProducts = [...products];
        this.loadingData = false;
      },
      error: (error) => {
        this.error = this.getInitialLoadErrorMessage(error);
        this.loadingData = false;
      }
    });
  }

  private loadBranchesWithFallback(): Observable<Branch[]> {
    return this.sucursalesService.getAll().pipe(
      catchError((error) => {
        console.warn('[Abastecimiento][Branches] Falla al cargar /branches, intentando fallback con inventario.', error);

        return this.inventarioService.getAll().pipe(
          map((items) => this.buildBranchesFromInventory(items)),
          catchError(() => throwError(() => error))
        );
      })
    );
  }

  private buildBranchesFromInventory(items: InventoryItem[]): Branch[] {
    const map = new Map<number, Branch>();

    items.forEach((item) => {
      const id = item.branch?.id ?? item.branchId;
      if (!id || map.has(id)) {
        return;
      }

      map.set(id, {
        id,
        name: item.branch?.name || `Sucursal ${id}`,
        address: '',
        phone: ''
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private getInitialLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Sesión expirada, vuelve a iniciar sesión.';
      }

      if (error.status === 403) {
        return 'No tienes permisos para cargar sucursales o productos.';
      }
    }

    return 'No se pudieron cargar sucursales.';
  }

  private normalizeInboundResponse(response: unknown, request: CreateInboundTransferRequest): SupplyResult[] {
    const rawItems = this.extractResponseItems(response);

    if (rawItems.length === 0) {
      const fallbackBranchIds = request.allBranches
        ? this.branches.map((branch) => branch.id)
        : request.destinationBranchIds;

      return fallbackBranchIds.map((branchId) => ({
        branchId,
        branchName: this.getBranchName(branchId),
        ok: true,
        addedQuantity: request.quantity,
        transferId: null,
        trackingCode: null,
        status: 'CREATED',
        message: 'Ingreso registrado (respuesta sin detalle por sucursal).'
      }));
    }

    const expectedBranchIds = request.allBranches
      ? this.branches.map((branch) => branch.id)
      : request.destinationBranchIds;

    return rawItems.map((item, index) => this.mapInboundItem(item, expectedBranchIds[index]));
  }

  private extractResponseItems(response: unknown): InboundTransferResult[] {
    if (Array.isArray(response)) {
      return response as InboundTransferResult[];
    }

    if (response && typeof response === 'object') {
      const data = response as Record<string, unknown>;

      if (Array.isArray(data['items'])) {
        return data['items'] as InboundTransferResult[];
      }
      if (Array.isArray(data['results'])) {
        return data['results'] as InboundTransferResult[];
      }
      if (Array.isArray(data['transfers'])) {
        return data['transfers'] as InboundTransferResult[];
      }

      if (data['trackingCode'] || data['transferId'] || data['id']) {
        return [data as InboundTransferResult];
      }
    }

    return [];
  }

  private mapInboundItem(item: InboundTransferResult, fallbackBranchId?: number): SupplyResult {
    const branchId = this.resolveBranchId(item, fallbackBranchId);
    const trackingCode = item.trackingCode ?? null;
    const status = item.status ?? (trackingCode ? 'APPROVED' : 'CREATED');
    const ok = !!trackingCode;
    const branchName = item.destinationBranchName ?? item.branchName ?? this.getBranchName(branchId);

    return {
      branchId,
      branchName,
      ok,
      addedQuantity: this.quantityToAdd,
      transferId: item.transferId ?? item.id ?? null,
      trackingCode,
      status,
      message: item.message ?? (ok ? 'Código generado correctamente.' : 'Ingreso creado sin código de confirmación.')
    };
  }

  private resolveBranchId(item: InboundTransferResult, fallbackBranchId?: number): number {
    const idFromPayload = item.destinationBranchId ?? item.branchId;
    if (idFromPayload && idFromPayload > 0) {
      return idFromPayload;
    }

    const nameFromPayload = item.destinationBranchName ?? item.branchName;
    if (nameFromPayload) {
      const normalized = nameFromPayload.trim().toLowerCase();
      const match = this.branches.find((branch) => branch.name.trim().toLowerCase() === normalized);
      if (match) {
        return match.id;
      }
    }

    return fallbackBranchId && fallbackBranchId > 0 ? fallbackBranchId : 0;
  }

  private getBranchName(branchId: number): string {
    return this.branches.find((branch) => branch.id === branchId)?.name || `Sucursal ${branchId}`;
  }
}
