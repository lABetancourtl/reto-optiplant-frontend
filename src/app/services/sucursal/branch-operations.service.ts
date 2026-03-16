import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { enviroments } from '../../../enviroments/enviroments';
import {
  CreateExchangeRequest,
  CreateReturnRequest,
  CreateSaleRequest,
  ExchangeRecord,
  ReturnRecord,
  SaleItemDetail,
  SaleSummary
} from '../../models/branch-operations.models';

@Injectable({ providedIn: 'root' })
export class BranchOperationsService {
  private readonly apiUrl = `${enviroments.apiUrl}/branch-operations`;

  constructor(private http: HttpClient) {}

  registerSale(payload: CreateSaleRequest): Observable<SaleSummary> {
    return this.http.post<SaleSummary>(`${this.apiUrl}/sales`, payload);
  }

  getMySales(): Observable<SaleSummary[]> {
    return this.http.get<SaleSummary[]>(`${this.apiUrl}/sales`);
  }

  getSaleItems(saleId: number): Observable<SaleItemDetail[]> {
    return this.http.get<SaleItemDetail[]>(`${this.apiUrl}/sales/${saleId}/items`);
  }

  registerReturn(payload: CreateReturnRequest): Observable<ReturnRecord> {
    return this.http.post<ReturnRecord>(`${this.apiUrl}/returns`, payload);
  }

  registerExchange(payload: CreateExchangeRequest): Observable<ExchangeRecord> {
    return this.http.post<ExchangeRecord>(`${this.apiUrl}/exchanges`, payload);
  }
}
