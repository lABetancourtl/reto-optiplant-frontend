import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Transfer, TransferService } from '../../services/sucursal/trasnfer.servic';


type Tab = 'mis' | 'entrantes' | 'salientes';
type ModalType = 'aprobar' | 'rechazar' | 'confirmar' | null;
 
@Component({
  selector: 'app-traslados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './traslados.component.html',
  styleUrl: './traslados.component.css'
})
export class TrasladosComponent implements OnInit {
 
  tabActiva: Tab = 'mis';
 
  // Mis solicitudes
  misSolicitudes: Transfer[] = [];
  misSolicitudesFiltradas: Transfer[] = [];
  cargandoMis = false;
  errorMis: string | null = null;
  busquedaMis = '';
  filtroEstadoMis = 'todos';
 
  // Entrantes
  entrantes: Transfer[] = [];
  entrantesFiltrados: Transfer[] = [];
  cargandoEntrantes = false;
  errorEntrantes: string | null = null;
  busquedaEntrantes = '';
  filtroEstadoEntrantes = 'todos';
 
  // Salientes (me pidieron a mí)
  salientes: Transfer[] = [];
  salientesFiltrados: Transfer[] = [];
  cargandoSalientes = false;
  errorSalientes: string | null = null;
  busquedaSalientes = '';
  filtroEstadoSalientes = 'todos';
 
  // Modal
  modalType: ModalType = null;
  selectedTransfer: Transfer | null = null;
  justificacion = '';
  trackingCode = '';
  cantidadRecibida: number = 0;
  modalError: string | null = null;
  procesando = false;
  modalSuccess = false;
  trackingCodeGenerado: string | null = null;
 
  readonly ESTADOS = ['todos', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
 
  constructor(private transferService: TransferService) {}
 
  ngOnInit(): void {
    this.cargarMisSolicitudes();
    this.cargarEntrantes();
    this.cargarSalientes();
  }
 
  // ── Tabs ──────────────────────────────────────
 
  setTab(tab: Tab): void {
    this.tabActiva = tab;
  }
 
  // ── Mis solicitudes ───────────────────────────
 
  cargarMisSolicitudes(): void {
    this.cargandoMis = true;
    this.errorMis = null;
    this.transferService.getMyTransfers().subscribe({
      next: (data) => { this.misSolicitudes = data; this.filtrarMis(); this.cargandoMis = false; },
      error: () => { this.errorMis = 'Error al cargar las solicitudes.'; this.cargandoMis = false; }
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
 
  // ── Entrantes ─────────────────────────────────
 
  cargarEntrantes(): void {
    this.cargandoEntrantes = true;
    this.errorEntrantes = null;
    this.transferService.getIncomingTransfers().subscribe({
      next: (data) => { this.entrantes = data; this.filtrarEntrantes(); this.cargandoEntrantes = false; },
      error: () => { this.errorEntrantes = 'Error al cargar los traslados entrantes.'; this.cargandoEntrantes = false; }
    });
  }
 
  filtrarEntrantes(): void {
    let r = [...this.entrantes];
    if (this.busquedaEntrantes.trim()) {
      const q = this.busquedaEntrantes.toLowerCase();
      r = r.filter(t => t.product.name.toLowerCase().includes(q) || t.sourceBranch.name.toLowerCase().includes(q));
    }
    if (this.filtroEstadoEntrantes !== 'todos') r = r.filter(t => t.status === this.filtroEstadoEntrantes);
    this.entrantesFiltrados = r;
  }
 
  // ── Salientes ─────────────────────────────────
 
  cargarSalientes(): void {
    this.cargandoSalientes = true;
    this.errorSalientes = null;
    this.transferService.getOutgoingTransfers().subscribe({
      next: (data) => { this.salientes = data; this.filtrarSalientes(); this.cargandoSalientes = false; },
      error: () => { this.errorSalientes = 'Error al cargar los traslados salientes.'; this.cargandoSalientes = false; }
    });
  }
 
  filtrarSalientes(): void {
    let r = [...this.salientes];
    if (this.busquedaSalientes.trim()) {
      const q = this.busquedaSalientes.toLowerCase();
      r = r.filter(t => t.product.name.toLowerCase().includes(q) || t.destBranch.name.toLowerCase().includes(q));
    }
    if (this.filtroEstadoSalientes !== 'todos') r = r.filter(t => t.status === this.filtroEstadoSalientes);
    this.salientesFiltrados = r;
  }
 
  // ── Modales ───────────────────────────────────
 
  abrirAprobar(t: Transfer): void {
    this.selectedTransfer = t;
    this.modalError = null;
    this.modalSuccess = false;
    this.modalType = 'aprobar';
  }
 
  abrirRechazar(t: Transfer): void {
    this.selectedTransfer = t;
    this.justificacion = '';
    this.modalError = null;
    this.modalSuccess = false;
    this.modalType = 'rechazar';
  }
 
  abrirConfirmar(t: Transfer): void {
    this.selectedTransfer = t;
    this.trackingCode = '';
    this.cantidadRecibida = t.quantity;
    this.modalError = null;
    this.modalSuccess = false;
    this.modalType = 'confirmar';
  }
 
  cerrarModal(): void {
    this.modalType = null;
    this.selectedTransfer = null;
    this.justificacion = '';
    this.trackingCode = '';
    this.modalError = null;
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
          // Más tiempo para que el usuario vea y copie el tracking code
          setTimeout(() => { this.cerrarModal(); this.cargarMisSolicitudes(); this.cargarEntrantes(); this.cargarSalientes(); }, 5000);
        },
        error: () => { this.modalError = 'Error al aprobar el traslado.'; this.procesando = false; }
      });
 
    } else if (this.modalType === 'rechazar') {
      if (!this.justificacion.trim()) { this.modalError = 'La justificación es obligatoria.'; this.procesando = false; return; }
      this.transferService.approveOrReject(this.selectedTransfer.id, 'REJECTED', this.justificacion).subscribe({
        next: () => this.onModalSuccess(),
        error: () => { this.modalError = 'Error al rechazar el traslado.'; this.procesando = false; }
      });
 
    } else if (this.modalType === 'confirmar') {
      if (!this.trackingCode.trim()) { this.modalError = 'El código de seguimiento es obligatorio.'; this.procesando = false; return; }
      if (this.cantidadRecibida < 1) { this.modalError = 'La cantidad recibida debe ser mayor a 0.'; this.procesando = false; return; }
      this.transferService.confirmReceipt(this.trackingCode, this.cantidadRecibida).subscribe({
        next: () => this.onModalSuccess(),
        error: () => { this.modalError = 'Error al confirmar la recepción.'; this.procesando = false; }
      });
    }
  }
 
  private onModalSuccess(): void {
    this.procesando = false;
    this.modalSuccess = true;
    setTimeout(() => {
      this.cerrarModal();
      this.cargarMisSolicitudes();
      this.cargarEntrantes();
      this.cargarSalientes();
    }, 1600);
  }
 
  // ── Helpers ───────────────────────────────────
 
  getEstadoBadge(status: string): { label: string; clase: string } {
    switch (status) {
      case 'REQUESTED': return { label: 'Solicitado',  clase: 'badge-warn' };
      case 'PENDING':   return { label: 'Pendiente',   clase: 'badge-warn' };
      case 'APPROVED':  return { label: 'Aprobado',    clase: 'badge-ok' };
      case 'REJECTED':  return { label: 'Rechazado',   clase: 'badge-danger' };
      case 'SENT':      return { label: 'Enviado',     clase: 'badge-info' };
      case 'COMPLETED': return { label: 'Completado',  clase: 'badge-neutral' };
      case 'RECEIVED':  return { label: 'Recibido',    clase: 'badge-neutral' };
      default:          return { label: status,         clase: 'badge-neutral' };
    }
  }
 
  puedeAprobarRechazar(t: Transfer): boolean { return t.status === 'PENDING' || t.status === 'REQUESTED'; }
  puedeConfirmar(t: Transfer): boolean { return t.status === 'APPROVED'; }
 
  get tituloModal(): string {
    if (this.modalType === 'aprobar')   return 'Aprobar traslado';
    if (this.modalType === 'rechazar')  return 'Rechazar traslado';
    if (this.modalType === 'confirmar') return 'Confirmar recepción';
    return '';
  }
 
  get mensajeExito(): string {
    if (this.modalType === 'aprobar')   return '¡Traslado aprobado!';
    if (this.modalType === 'rechazar')  return 'Traslado rechazado.';
    if (this.modalType === 'confirmar') return '¡Recepción confirmada!';
    return '¡Listo!';
  }
}