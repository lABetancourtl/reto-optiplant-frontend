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

@Component({
  selector: 'app-abastecimiento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abastecimiento.component.html',
  styleUrl: './abastecimiento.component.css'
})
export class AbastecimientoComponent implements OnInit {
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

  constructor(
    private transferService: TransferService,
    private productService: ProductService,
    private sucursalesService: SucursalesService,
    private authService: AuthService,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
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

    return rawItems.map((item) => this.mapInboundItem(item));
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

  private mapInboundItem(item: InboundTransferResult): SupplyResult {
    const branchId = this.resolveBranchId(item);
    const trackingCode = item.trackingCode ?? null;
    const status = item.status ?? (trackingCode ? 'APPROVED' : 'CREATED');
    const ok = !!trackingCode;

    return {
      branchId,
      branchName: item.destinationBranchName ?? item.branchName ?? this.getBranchName(branchId),
      ok,
      addedQuantity: this.quantityToAdd,
      transferId: item.transferId ?? item.id ?? null,
      trackingCode,
      status,
      message: item.message ?? (ok ? 'Código generado correctamente.' : 'Ingreso creado sin código de confirmación.')
    };
  }

  private resolveBranchId(item: InboundTransferResult): number {
    return item.destinationBranchId
      ?? item.branchId
      ?? 0;
  }

  private getBranchName(branchId: number): string {
    return this.branches.find((branch) => branch.id === branchId)?.name || `Sucursal ${branchId}`;
  }
}
