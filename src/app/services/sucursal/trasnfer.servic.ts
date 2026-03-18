import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { enviroments } from '../../../enviroments/enviroments';

export interface CreateTransferRequest {
  sourceBranchId: number;
  destBranchId: number;
  productId: number;
  quantity: number;
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

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly apiUrl = enviroments.apiUrl + '/transfers';

  constructor(private http: HttpClient) {}

  createTransferRequest(request: CreateTransferRequest): Observable<Transfer> {
    return this.http.post<Transfer>(this.apiUrl, request);
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