import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviroments } from '../../../enviroments/enviroments';

export interface CreateTransferRequest {
  sourceBranchId: number;
  destBranchId: number;
  productId: number;
  quantity: number;
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

  getMyTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/user`);
  }

  getIncomingTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/dest-branch`);
  }

  getOutgoingTransfers(): Observable<Transfer[]> {
    return this.http.get<Transfer[]>(`${this.apiUrl}/source-branch`);
  }

  approveOrReject(id: number, status: string, justification: string): Observable<Transfer> {
    return this.http.put<Transfer>(`${this.apiUrl}/${id}/approve-reject`, { status, justification });
  }

  confirmReceipt(trackingCode: string, receivedQuantity: number): Observable<Transfer> {
    return this.http.post<Transfer>(`${this.apiUrl}/confirm-receipt`, { trackingCode, receivedQuantity });
  }
}