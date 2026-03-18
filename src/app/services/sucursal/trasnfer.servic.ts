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

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly apiUrl = enviroments.apiUrl + '/transfers';

  constructor(private http: HttpClient) {}

  createTransferRequest(request: CreateTransferRequest): Observable<Transfer> {
    return this.http.post<Transfer>(this.apiUrl, request);
  }

  createInboundTransfer(request: CreateInboundTransferRequest): Observable<InboundTransferResult[] | InboundTransferResult | unknown> {
    const token = sessionStorage.getItem('authToken');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.post<InboundTransferResult[] | InboundTransferResult | unknown>(`${this.apiUrl}/inbound`, request, {
      headers
    });
  }

  createBulkTransferRequests(requests: CreateTransferRequest[]): Observable<Transfer[]> {
    return forkJoin(requests.map((request) => this.createTransferRequest(request)));
  }

  getAllTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(this.apiUrl);
  }

  getMyTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/user`);
  }

  getIncomingTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/dest-branch`);
  }

  getOutgoingTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/source-branch`);
  }

  approveOrReject(id: number, status: 'APPROVED' | 'REJECTED', justification: string): Observable<Transfer> {
    const payload: ApproveRejectTransferRequest = { status, justification };
    return this.http.put<Transfer>(`${this.apiUrl}/${id}/approve-reject`, payload);
  }

  confirmReceipt(trackingCode: string, receivedQuantity: number): Observable<Transfer> {
    const payload: ConfirmReceiptRequest = { trackingCode, receivedQuantity };
    return this.http.post<Transfer>(`${this.apiUrl}/confirm-receipt`, payload);
  }

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