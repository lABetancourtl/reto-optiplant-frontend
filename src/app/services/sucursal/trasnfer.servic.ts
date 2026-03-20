import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { enviroments } from '../../../enviroments/enviroments';

export interface CreateTransferRequest {
  sourceBranchId: number;
  destBranchId: number;
  productId: number;
  quantity: number;
}

export interface CreateInboundTransferRequest {
  productId: number;
  quantity: number;
  destinationBranchIds: number[];
  allBranches: boolean;
}

export interface ApproveRejectTransferRequest {
  status: 'APPROVED' | 'REJECTED';
  justification: string;
}

export interface ConfirmReceiptRequest {
  trackingCode: string;
  receivedQuantity: number;
}

export interface Transfer {
  id: number;
  sourceBranch: { id: number; name: string };
  destBranch:   { id: number; name: string };
  product:      { id: number; name: string };
  quantity:     number;
  status:       string;
  createdAt?:   string;
  justification?: string;
  trackingCode?:  string;
}

export interface InboundTransferResult {
  id?: number;
  transferId?: number;
  destinationBranchId?: number;
  destinationBranchName?: string;
  branchId?: number;
  branchName?: string;
  status?: string;
  trackingCode?: string;
  message?: string;
}

/**
 * Servicio para gestionar transferencias de productos entre sucursales.
 * Permite crear, consultar, aprobar/rechazar y confirmar transferencias,
 * así como registrar ingresos de productos.
 */
@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly apiUrl = enviroments.apiUrl + '/transfers';

  constructor(private http: HttpClient) {}

  /**
   * Crea una transferencia de productos entre sucursales.
   * @param request Datos de la transferencia.
   */
  createTransferRequest(request: CreateTransferRequest): Observable<Transfer> {
    return this.http.post<Transfer>(this.apiUrl, request);
  }

  /**
   * Registra un ingreso de productos a una o varias sucursales.
   * @param request Datos del ingreso.
   */
  createInboundTransfer(request: CreateInboundTransferRequest): Observable<InboundTransferResult[] | InboundTransferResult | unknown> {
    const token = sessionStorage.getItem('authToken');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.post<InboundTransferResult[] | InboundTransferResult | unknown>(`${this.apiUrl}/inbound`, request, {
      headers
    });
  }

  /**
   * Crea transferencias en lote entre sucursales.
   * @param requests Arreglo de transferencias a crear.
   */
  createBulkTransferRequests(requests: CreateTransferRequest[]): Observable<Transfer[]> {
    return forkJoin(requests.map((request) => this.createTransferRequest(request)));
  }

  /**
   * Obtiene todas las transferencias registradas.
   */
  getAllTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(this.apiUrl);
  }

  /**
   * Obtiene las transferencias asociadas al usuario actual.
   */
  getMyTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/user`);
  }

  /**
   * Obtiene las transferencias entrantes a la sucursal destino.
   */
  getIncomingTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/dest-branch`);
  }

  /**
   * Obtiene las transferencias salientes desde la sucursal origen.
   */
  getOutgoingTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/source-branch`);
  }

  /**
   * Aprueba o rechaza una transferencia, registrando justificación.
   * @param id ID de la transferencia.
   * @param status Estado a asignar ('APPROVED' o 'REJECTED').
   * @param justification Justificación de la acción.
   */
  approveOrReject(id: number, status: 'APPROVED' | 'REJECTED', justification: string): Observable<Transfer> {
    const payload: ApproveRejectTransferRequest = { status, justification };
    return this.http.put<Transfer>(`${this.apiUrl}/${id}/approve-reject`, payload);
  }

  /**
   * Confirma la recepción de productos en sucursal destino.
   * @param trackingCode Código de seguimiento de la transferencia.
   * @param receivedQuantity Cantidad recibida.
   */
  confirmReceipt(trackingCode: string, receivedQuantity: number): Observable<Transfer> {
    const payload: ConfirmReceiptRequest = { trackingCode, receivedQuantity };
    return this.http.post<Transfer>(`${this.apiUrl}/confirm-receipt`, payload);
  }

  /**
   * Extrae un mensaje de error legible desde la respuesta del backend.
   * @param error Error recibido.
   * @param fallback Mensaje alternativo si no se puede extraer.
   */
  extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error;
      if (typeof serverError === 'string' && serverError.trim()) {
        return serverError;
      }
      if (serverError?.message) {
        return serverError.message;
      }
      if (serverError?.error) {
        return serverError.error;
      }
      if (error.message) {
        return error.message;
      }
    }
    return fallback;
  }
}