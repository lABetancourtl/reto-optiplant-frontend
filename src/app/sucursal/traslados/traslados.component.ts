import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Product, ProductService } from '../../services/admin/product.service';
import { Branch, SucursalesService } from '../../services/admin/sucursal.service';
import { InventarioService, InventoryItem } from '../../services/admin/inventario.service';
import { CreateTransferRequest, Transfer, TransferService } from '../../services/sucursal/trasnfer.servic';
import { WebSocketService, TransferEvent } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';

type SucursalTab = 'mis' | 'origen' | 'destino' | 'confirmar';
type AdminTab = 'crear' | 'listado';
type ModalType = 'aprobar' | 'rechazar' | null;

interface TransferStatusBadge {
  label: string;
  clase: string;
}

interface BulkTransferResult {
  destinationBranchId: number;
  destinationBranchName: string;
  ok: boolean;
  message: string;
  transfer?: Transfer;
}

interface TransferTimelineStep {
  key: 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'REJECTED';
  label: string;
  done: boolean;
  current: boolean;
}

interface BranchOption extends Branch {
  requiresValidation?: boolean;
}

@Component({
  selector: 'app-traslados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './traslados.component.html',
  styleUrl: './traslados.component.css'
})
export class TrasladosComponent implements OnInit, OnDestroy {

  isAdmin = false;
  isSucursal = false;

  tabSucursal: SucursalTab = 'mis';
  tabAdmin: AdminTab = 'crear';

  estadosFiltro = ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED'];

  misSolicitudes: Transfer[] = [];
  misSolicitudesFiltradas: Transfer[] = [];
  cargandoMis = false;
  errorMis: string | null = null;
  busquedaMis = '';
  filtroEstadoMis = 'todos';

  origenSolicitudes: Transfer[] = [];
  origenFiltradas: Transfer[] = [];
  cargandoOrigen = false;
  errorOrigen: string | null = null;
  busquedaOrigen = '';
  filtroEstadoOrigen = 'todos';

  destinoSolicitudes: Transfer[] = [];
  destinoFiltradas: Transfer[] = [];
  cargandoDestino = false;
  errorDestino: string | null = null;
  busquedaDestino = '';
  filtroEstadoDestino = 'todos';

  // Confirmación por tracking
  confirmTrackingCode = '';
  confirmReceivedQuantity = 1;
  confirmPreview: Transfer | null = null;
  confirmError: string | null = null;
  confirmSuccess: string | null = null;
  confirmando = false;

  // Admin listado + detalle
  adminTransfers: Transfer[] = [];
  adminTransfersFiltradas: Transfer[] = [];
  adminCargandoListado = false;
  adminErrorListado: string | null = null;
  adminBusqueda = '';
  adminFiltroEstado = 'todos';
  selectedTransferDetail: Transfer | null = null;

  // Admin creación
  allBranches: BranchOption[] = [];
  allProducts: Product[] = [];
  adminProductSearch = '';
  adminSourceBranchId: number | null = null;
  adminDestBranchIds: number[] = [];
  adminProductId: number | null = null;
  adminQuantity = 1;
  adminSourceStockByProductId = new Map<number, number>();
  adminSourceInventory: InventoryItem[] = [];
  adminSourceInventoryLoading = false;
  adminSourceInventoryError: string | null = null;
  adminCreateError: string | null = null;
  adminCreateSuccess: string | null = null;
  adminBulkResults: BulkTransferResult[] = [];
  adminCreating = false;
  adminLoadingCreateData = false;
  adminCreateDataError: string | null = null;

  // Notificaciones — usan los Sets del WS service (persisten entre navegaciones)
  get entrantesVistos() { return this.wsService.entrantesVistos; }
  get salientesVistos() { return this.wsService.salientesVistos; }
  entrantesNoLeidos = 0;
  salientesNoLeidos = 0;

  // Modal
  modalType: ModalType = null;
  selectedTransfer: Transfer | null = null;
  justificacion = '';
  modalError: string | null = null;
  procesando = false;
  modalSuccess = false;
  trackingCodeGenerado: string | null = null;

  private wsSub: Subscription | null = null;
  private myBranchId: number | null = null;

  constructor(
    private transferService: TransferService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private sucursalesService: SucursalesService,
    private productService: ProductService,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.hasAnyRole(['ADMIN']);
    this.isSucursal = this.authService.hasAnyRole(['SUCURSAL']);
    this.myBranchId = this.authService.getUserBranchId();

    if (this.isAdmin) {
      this.loadAdminCreateData();
      this.cargarAdminListado();
      this.wsService.connect();
      this.wsService.subscribeToAllTransfers();
    }

    if (this.isSucursal) {
      this.cargarMisSolicitudes();
      this.cargarOrigenSolicitudes();
      this.cargarDestinoSolicitudes();
    }

    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    // No desconectar el WebSocket — es singleton y debe mantenerse activo
  }

  // ── WebSocket ─────────────────────────────────

  private conectarWebSocket(): void {
    this.wsService.connect();
    if (this.myBranchId && this.isSucursal) {
      this.wsService.subscribeToTransfersByBranch(this.myBranchId);
    }

    this.wsSub = this.wsService.transfers$.subscribe((event: TransferEvent) => {
      this.handleTransferEvent(event);
    });
  }

  private handleTransferEvent(event: TransferEvent): void {
    if (this.isAdmin) {
      this.cargarAdminListado();
    }

    if (!this.isSucursal) {
      return;
    }

    if (event.type === 'REQUESTED') {
      this.cargarOrigenSolicitudes().then(() => {
        if (this.tabSucursal === 'origen') {
          this.marcarSalientesLeidos();
        }
      });
      return;
    }

    if (event.type === 'APPROVED' || event.type === 'REJECTED') {
      this.cargarDestinoSolicitudes().then(() => {
        if (this.tabSucursal === 'destino') {
          this.marcarEntrantesLeidos();
        }
      });
      this.cargarMisSolicitudes();
      return;
    }

    this.cargarMisSolicitudes();
    this.cargarDestinoSolicitudes();
    this.cargarOrigenSolicitudes();
  }

  // ── Tabs ──────────────────────────────────────

  setTabSucursal(tab: SucursalTab): void {
    this.tabSucursal = tab;
    if (tab === 'destino') this.marcarEntrantesLeidos();
    if (tab === 'origen') this.marcarSalientesLeidos();
  }

  setTabAdmin(tab: AdminTab): void {
    this.tabAdmin = tab;
  }

  // ── Mis solicitudes ───────────────────────────

  cargarMisSolicitudes(): void {
    this.cargandoMis = true;
    this.errorMis = null;
    this.transferService.getMyTransfers().subscribe({
      next: (data) => { this.misSolicitudes = data; this.filtrarMis(); this.cargandoMis = false; },
      error: (error) => {
        this.errorMis = this.transferService.extractErrorMessage(error, 'Error al cargar las solicitudes.');
        this.cargandoMis = false;
      }
    });
  }

  filtrarMis(): void {
    let r = [...this.misSolicitudes];
    if (this.busquedaMis.trim()) {
      const q = this.busquedaMis.toLowerCase();
      r = r.filter(t => t.product.name.toLowerCase().includes(q) || t.sourceBranch.name.toLowerCase().includes(q));
    }
    if (this.filtroEstadoMis !== 'todos') r = r.filter(t => t.status === this.filtroEstadoMis);
    this.misSolicitudesFiltradas = r;
  }

  // ── Bandeja origen (SUCURSAL origen) ─────────

  cargarOrigenSolicitudes(): Promise<void> {
    this.cargandoOrigen = true;
    this.errorOrigen = null;
    return new Promise((resolve) => {
      this.transferService.getOutgoingTransfers().subscribe({
        next: (data) => {
          this.origenSolicitudes = data;
          this.filtrarOrigen();
          this.calcularSalientesNoLeidos();
          if (this.tabSucursal === 'origen') this.marcarSalientesLeidos();
          this.cargandoOrigen = false;
          resolve();
        },
        error: (error) => {
          this.errorOrigen = this.transferService.extractErrorMessage(error, 'Error al cargar las solicitudes donde tu sucursal es origen.');
          this.cargandoOrigen = false;
          resolve();
        }
      });
    });
  }

  filtrarOrigen(): void {
    let r = [...this.origenSolicitudes];
    if (this.busquedaOrigen.trim()) {
      const q = this.busquedaOrigen.toLowerCase();
      r = r.filter((t) =>
        t.product.name.toLowerCase().includes(q) ||
        t.destBranch.name.toLowerCase().includes(q)
      );
    }
    if (this.filtroEstadoOrigen !== 'todos') r = r.filter((t) => t.status === this.filtroEstadoOrigen);
    this.origenFiltradas = r;
  }

  private calcularSalientesNoLeidos(): void {
    const nuevos = this.origenSolicitudes.filter((t) =>
      t.status === 'REQUESTED' && !this.salientesVistos.has(t.id)
    );
    this.salientesNoLeidos = nuevos.length;
  }

  private marcarSalientesLeidos(): void {
    this.origenSolicitudes
      .filter((t) => t.status === 'REQUESTED')
      .forEach((t) => this.salientesVistos.add(t.id));
    this.salientesNoLeidos = 0;
  }

  // ── Bandeja destino (SUCURSAL destino) ───────

  cargarDestinoSolicitudes(): Promise<void> {
    this.cargandoDestino = true;
    this.errorDestino = null;
    return new Promise((resolve) => {
      this.transferService.getIncomingTransfers().subscribe({
        next: (data) => {
          this.destinoSolicitudes = data;
          this.filtrarDestino();
          this.calcularEntrantesNoLeidos();
          if (this.tabSucursal === 'destino') this.marcarEntrantesLeidos();
          this.cargandoDestino = false;
          resolve();
        },
        error: (error) => {
          this.errorDestino = this.transferService.extractErrorMessage(error, 'Error al cargar transferencias destino.');
          this.cargandoDestino = false;
          resolve();
        }
      });
    });
  }

  filtrarDestino(): void {
    let r = [...this.destinoSolicitudes];
    if (this.busquedaDestino.trim()) {
      const q = this.busquedaDestino.toLowerCase();
      r = r.filter((t) =>
        t.product.name.toLowerCase().includes(q) ||
        t.sourceBranch.name.toLowerCase().includes(q)
      );
    }
    if (this.filtroEstadoDestino !== 'todos') r = r.filter((t) => t.status === this.filtroEstadoDestino);
    this.destinoFiltradas = r;
  }

  private calcularEntrantesNoLeidos(): void {
    const nuevos = this.destinoSolicitudes.filter((t) =>
      (t.status === 'APPROVED' || t.status === 'REJECTED') &&
      !this.entrantesVistos.has(t.id)
    );
    this.entrantesNoLeidos = nuevos.length;
  }

  private marcarEntrantesLeidos(): void {
    this.destinoSolicitudes
      .filter((t) => t.status === 'APPROVED' || t.status === 'REJECTED')
      .forEach((t) => this.entrantesVistos.add(t.id));
    this.entrantesNoLeidos = 0;
  }

  // ── Admin ────────────────────────────────────

  private loadAdminCreateData(): void {
    this.adminLoadingCreateData = true;
    this.adminCreateDataError = null;

    forkJoin({
      branches: this.sucursalesService.getAll(),
      products: this.productService.getAllProducts()
    }).subscribe({
      next: ({ branches, products }) => {
        this.allBranches = branches as BranchOption[];
        this.allProducts = products;
        this.adminLoadingCreateData = false;
      },
      error: (error) => {
        this.adminCreateDataError = this.transferService.extractErrorMessage(error, 'Error al cargar sucursales y productos.');
        this.adminLoadingCreateData = false;
      }
    });
  }

  cargarAdminListado(): void {
    this.adminCargandoListado = true;
    this.adminErrorListado = null;

    this.transferService.getAllTransfers().subscribe({
      next: (data) => {
        this.adminTransfers = data.filter((transfer) => {
          const sourceId = transfer?.sourceBranch?.id;
          const sourceName = transfer?.sourceBranch?.name;
          return !!sourceId && !!sourceName;
        });
        this.filtrarAdminListado();
        this.adminCargandoListado = false;
      },
      error: (error) => {
        this.adminErrorListado = this.transferService.extractErrorMessage(error, 'Error al cargar el listado de transferencias.');
        this.adminCargandoListado = false;
      }
    });
  }

  filtrarAdminListado(): void {
    let r = [...this.adminTransfers];
    if (this.adminBusqueda.trim()) {
      const q = this.adminBusqueda.toLowerCase();
      r = r.filter((t) =>
        t.product.name.toLowerCase().includes(q) ||
        t.sourceBranch.name.toLowerCase().includes(q) ||
        t.destBranch.name.toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    }
    if (this.adminFiltroEstado !== 'todos') {
      r = r.filter((t) => t.status === this.adminFiltroEstado);
    }
    this.adminTransfersFiltradas = r;
  }

  toggleDestinoSeleccionado(branchId: number, checked: boolean): void {
    if (checked) {
      if (!this.adminDestBranchIds.includes(branchId)) {
        this.adminDestBranchIds = [...this.adminDestBranchIds, branchId];
      }
      return;
    }
    this.adminDestBranchIds = this.adminDestBranchIds.filter((id) => id !== branchId);
  }

  get destinationBranchOptions(): BranchOption[] {
    if (!this.adminSourceBranchId) {
      return this.allBranches;
    }
    return this.allBranches.filter((b) => b.id !== this.adminSourceBranchId);
  }

  get filteredAdminProducts(): Product[] {
    const query = this.adminProductSearch.trim().toLowerCase();
    if (!query) {
      return this.allProducts;
    }
    return this.allProducts.filter((product) => product.name.toLowerCase().includes(query));
  }

  onAdminSourceBranchChange(): void {
    this.adminSourceInventory = [];
    this.adminSourceStockByProductId = new Map<number, number>();
    this.adminSourceInventoryError = null;

    if (!this.adminSourceBranchId) {
      return;
    }

    this.adminDestBranchIds = this.adminDestBranchIds.filter((id) => id !== this.adminSourceBranchId);
    this.loadAdminSourceInventory(this.adminSourceBranchId);
  }

  onAdminProductChange(): void {
    this.adminCreateError = null;
  }

  get adminAvailableQuantity(): number | null {
    if (!this.adminProductId) {
      return null;
    }

    return this.adminSourceStockByProductId.get(this.adminProductId) ?? 0;
  }

  getAdminProductStockHint(productId: number): string {
    if (!this.adminSourceBranchId) {
      return '';
    }

    if (this.adminSourceInventoryLoading) {
      return ' (disp: ...)';
    }

    if (this.adminSourceInventoryError) {
      return ' (disp: N/D)';
    }

    const available = this.adminSourceStockByProductId.get(productId) ?? 0;
    return ` (disp: ${available})`;
  }

  get hasInsufficientAdminStock(): boolean {
    if (!this.adminSourceBranchId || !this.adminProductId) {
      return false;
    }

    if (this.adminSourceInventoryLoading || this.adminSourceInventoryError) {
      return false;
    }

    const available = this.adminAvailableQuantity;
    if (available === null) {
      return false;
    }

    return this.adminQuantity > available;
  }

  private loadAdminSourceInventory(branchId: number): void {
    this.adminSourceInventoryLoading = true;
    this.adminSourceInventoryError = null;

    this.inventarioService.getByBranch(branchId).subscribe({
      next: (inventory) => {
        this.adminSourceInventory = inventory;
        this.adminSourceStockByProductId = new Map<number, number>(
          inventory.map((item) => [item.product.id, item.quantity])
        );
        this.adminSourceInventoryLoading = false;
      },
      error: (error) => {
        this.adminSourceInventory = [];
        this.adminSourceStockByProductId = new Map<number, number>();
        this.adminSourceInventoryError = this.transferService.extractErrorMessage(error, 'No se pudo consultar el inventario de la sucursal origen.');
        this.adminSourceInventoryLoading = false;
      }
    });
  }

  submitAdminTransfer(): void {
    if (!this.adminSourceBranchId || !this.adminProductId) {
      this.adminCreateError = 'Debes seleccionar sucursal origen y producto.';
      return;
    }
    if (this.adminDestBranchIds.length === 0) {
      this.adminCreateError = 'Debes seleccionar al menos una sucursal destino.';
      return;
    }
    if (this.adminQuantity < 1) {
      this.adminCreateError = 'La cantidad debe ser mayor o igual a 1.';
      return;
    }

    if (!this.adminSourceInventoryError && !this.adminSourceInventoryLoading && this.hasInsufficientAdminStock) {
      this.adminCreateError = `Stock insuficiente en la sucursal origen. Disponible: ${this.adminAvailableQuantity ?? 0}.`;
      return;
    }

    if (this.adminDestBranchIds.includes(this.adminSourceBranchId)) {
      this.adminCreateError = 'La sucursal origen no puede estar incluida como destino.';
      return;
    }

    this.adminCreating = true;
    this.adminCreateError = null;
    this.adminCreateSuccess = null;
    this.adminBulkResults = [];

    const requests: CreateTransferRequest[] = this.adminDestBranchIds.map((destBranchId) => ({
      sourceBranchId: this.adminSourceBranchId as number,
      destBranchId,
      productId: this.adminProductId as number,
      quantity: this.adminQuantity
    }));

    const batchCalls = requests.map((request) =>
      this.transferService.createTransferRequest(request).pipe(
        map((transfer): BulkTransferResult => ({
          destinationBranchId: transfer.destBranch.id,
          destinationBranchName: transfer.destBranch.name,
          ok: true,
          transfer,
          message: transfer.status === 'RECEIVED'
            ? 'Transferencia aplicada automáticamente'
            : `Transferencia creada con estado ${transfer.status}`
        })),
        catchError((error) => of<BulkTransferResult>({
          destinationBranchId: request.destBranchId,
          destinationBranchName: this.getBranchName(request.destBranchId),
          ok: false,
          message: this.getAdminCreateErrorMessage(error)
        }))
      )
    );

    forkJoin(batchCalls).subscribe({
      next: (results) => {
        this.adminBulkResults = results;

        const okCount = results.filter((result) => result.ok).length;
        const failCount = results.length - okCount;

        if (okCount > 0 && failCount === 0) {
          this.adminCreateSuccess = results.length > 1
            ? 'Transferencia masiva procesada por destino.'
            : 'Transferencia creada correctamente.';
        } else if (okCount > 0) {
          this.adminCreateSuccess = `${okCount} transferencia(s) creadas correctamente.`;
          this.adminCreateError = `${failCount} transferencia(s) no se pudieron crear. Revisa el resultado por destino.`;
        } else {
          this.adminCreateError = 'No se pudo crear ninguna transferencia. Revisa permisos y reglas del backend por destino.';
        }

        this.adminCreating = false;
        this.cargarAdminListado();
      },
      error: (error) => {
        this.adminCreateError = this.transferService.extractErrorMessage(error, 'No se pudo crear la transferencia.');
        this.adminCreating = false;
      }
    });
  }

  private getBranchName(branchId: number): string {
    const branch = this.allBranches.find((item) => item.id === branchId);
    return branch?.name || `Sucursal ${branchId}`;
  }

  private getAdminCreateErrorMessage(error: unknown): string {
    const message = this.transferService.extractErrorMessage(error, 'No se pudo crear la transferencia.');
    if (error instanceof HttpErrorResponse && error.status === 403) {
      return `${message} (403 - Sin permisos para crear este traslado desde el usuario actual).`;
    }
    return message;
  }

  // ── Confirmación por tracking ────────────────

  buscarPreviewConfirmacion(): void {
    this.confirmError = null;
    this.confirmSuccess = null;
    this.confirmPreview = null;

    if (!this.confirmTrackingCode.trim()) {
      this.confirmError = 'Ingresa un trackingCode para buscar la transferencia.';
      return;
    }

    const tracking = this.confirmTrackingCode.trim();
    const found = this.destinoSolicitudes.find((t) =>
      t.trackingCode?.trim() === tracking && t.status === 'APPROVED'
    );

    if (!found) {
      this.confirmError = 'No se encontró transferencia APPROVED con ese trackingCode en tu sucursal.';
      return;
    }

    this.confirmPreview = found;
    this.confirmReceivedQuantity = found.quantity;
  }

  confirmarRecepcionPorTracking(): void {
    if (!this.confirmTrackingCode.trim()) {
      this.confirmError = 'El trackingCode es obligatorio.';
      return;
    }
    if (this.confirmReceivedQuantity < 1) {
      this.confirmError = 'La cantidad recibida debe ser mayor o igual a 1.';
      return;
    }

    this.confirmando = true;
    this.confirmError = null;
    this.confirmSuccess = null;

    this.transferService.confirmReceipt(this.confirmTrackingCode.trim(), this.confirmReceivedQuantity).subscribe({
      next: (transfer) => {
        this.confirmSuccess = `Recepción confirmada. Estado final: ${transfer.status}.`;
        this.confirmando = false;
        this.confirmPreview = transfer;
        this.cargarMisSolicitudes();
        this.cargarDestinoSolicitudes();
        this.cargarOrigenSolicitudes();
      },
      error: (error) => {
        this.confirmError = this.transferService.extractErrorMessage(error, 'Error al confirmar la recepción.');
        this.confirmando = false;
      }
    });
  }

  // ── Modales ───────────────────────────────────

  abrirAprobar(t: Transfer): void {
    this.selectedTransfer = t;
    this.modalError = null;
    this.modalSuccess = false;
    this.trackingCodeGenerado = null;
    this.modalType = 'aprobar';
  }

  abrirRechazar(t: Transfer): void {
    this.selectedTransfer = t;
    this.justificacion = '';
    this.modalError = null;
    this.modalSuccess = false;
    this.modalType = 'rechazar';
  }

  mostrarDetalle(t: Transfer): void {
    this.selectedTransferDetail = t;
  }

  cerrarModal(): void {
    this.modalType = null;
    this.selectedTransfer = null;
    this.justificacion = '';
    this.modalError = null;
    this.trackingCodeGenerado = null;
  }

  confirmarAccion(): void {
    if (!this.selectedTransfer) return;
    this.procesando = true;
    this.modalError = null;

    if (this.modalType === 'aprobar') {
      this.transferService.approveOrReject(this.selectedTransfer.id, 'APPROVED', '').subscribe({
        next: (updated) => {
          this.trackingCodeGenerado = updated.trackingCode ?? null;
          if (this.selectedTransfer) this.selectedTransfer = { ...this.selectedTransfer, trackingCode: updated.trackingCode };
          this.procesando = false;
          this.modalSuccess = true;
          this.cargarOrigenSolicitudes();
          this.cargarMisSolicitudes();
          setTimeout(() => { this.cerrarModal(); }, 2400);
        },
        error: (error) => {
          this.modalError = this.transferService.extractErrorMessage(error, 'Error al aprobar el traslado.');
          this.procesando = false;
        }
      });

    } else if (this.modalType === 'rechazar') {
      if (!this.justificacion.trim()) { this.modalError = 'La justificación es obligatoria.'; this.procesando = false; return; }
      this.transferService.approveOrReject(this.selectedTransfer.id, 'REJECTED', this.justificacion).subscribe({
        next: () => {
          this.procesando = false;
          this.modalSuccess = true;
          this.cargarOrigenSolicitudes();
          this.cargarMisSolicitudes();
          setTimeout(() => this.cerrarModal(), 1600);
        },
        error: (error) => {
          this.modalError = this.transferService.extractErrorMessage(error, 'Error al rechazar el traslado.');
          this.procesando = false;
        }
      });
    }
  }

  // ── Helpers ───────────────────────────────────

  getEstadoBadge(status: string): TransferStatusBadge {
    switch (status) {
      case 'REQUESTED': return { label: 'Solicitado',  clase: 'badge-warn' };
      case 'APPROVED':  return { label: 'Aprobado',    clase: 'badge-ok' };
      case 'REJECTED':  return { label: 'Rechazado',   clase: 'badge-danger' };
      case 'RECEIVED':  return { label: 'Recibido',    clase: 'badge-neutral' };
      default:          return { label: status,         clase: 'badge-neutral' };
    }
  }

  puedeAprobarRechazar(t: Transfer): boolean {
    if (!this.isSucursal || !this.myBranchId) return false;
    return t.status === 'REQUESTED' && t.sourceBranch.id === this.myBranchId;
  }

  puedeConfirmar(t: Transfer): boolean {
    if (!this.isSucursal || !this.myBranchId) return false;
    return t.status === 'APPROVED' && t.destBranch.id === this.myBranchId;
  }

  getTimeline(t: Transfer): TransferTimelineStep[] {
    const isRejected = t.status === 'REJECTED';
    const requestedDone = ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED'].includes(t.status);
    const approvedDone = ['APPROVED', 'RECEIVED'].includes(t.status);
    const receivedDone = t.status === 'RECEIVED';

    const steps: TransferTimelineStep[] = [
      { key: 'REQUESTED', label: 'Solicitada', done: requestedDone, current: t.status === 'REQUESTED' },
      { key: 'APPROVED', label: 'Aprobada', done: approvedDone, current: t.status === 'APPROVED' },
      { key: 'RECEIVED', label: 'Recibida', done: receivedDone, current: t.status === 'RECEIVED' }
    ];

    if (isRejected) {
      steps.splice(2, 0, {
        key: 'REJECTED',
        label: 'Rechazada',
        done: true,
        current: true
      });
    }

    return steps;
  }

  get tituloModal(): string {
    if (this.modalType === 'aprobar')   return 'Aprobar traslado';
    if (this.modalType === 'rechazar')  return 'Rechazar traslado';
    return '';
  }

  get mensajeExito(): string {
    if (this.modalType === 'aprobar')   return '¡Traslado aprobado!';
    if (this.modalType === 'rechazar')  return 'Traslado rechazado.';
    return '¡Listo!';
  }
}