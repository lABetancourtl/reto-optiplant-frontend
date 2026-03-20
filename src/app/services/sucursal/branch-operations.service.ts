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

/**
 * Servicio para operaciones de sucursal: ventas, devoluciones y cambios.
 * Permite registrar ventas, devoluciones, cambios y consultar detalles de ventas.
 */
@Injectable({ providedIn: 'root' })
export class BranchOperationsService {
  private readonly apiUrl = `${enviroments.apiUrl}/branch-operations`;

  constructor(private http: HttpClient) {}

  /**
   * Registra una venta en la sucursal.
   * @param payload Datos de la venta.
   */
  registerSale(payload: CreateSaleRequest): Observable<SaleSummary> {
    return this.http.post<SaleSummary>(`${this.apiUrl}/sales`, payload);
  }

  /**
   * Obtiene todas las ventas registradas por la sucursal.
   */
  getMySales(): Observable<SaleSummary[]> {
    return this.http.get<SaleSummary[]>(`${this.apiUrl}/sales`);
  }

  /**
   * Obtiene los detalles de los ítems de una venta.
   * @param saleId ID de la venta.
   */
  getSaleItems(saleId: number): Observable<SaleItemDetail[]> {
    return this.http.get<SaleItemDetail[]>(`${this.apiUrl}/sales/${saleId}/items`);
  }

  /**
   * Registra una devolución en la sucursal.
   * @param payload Datos de la devolución.
   */
  registerReturn(payload: CreateReturnRequest): Observable<ReturnRecord> {
    return this.http.post<ReturnRecord>(`${this.apiUrl}/returns`, payload);
  }

  /**
   * Registra un cambio de producto en la sucursal.
   * @param payload Datos del cambio.
   */
  registerExchange(payload: CreateExchangeRequest): Observable<ExchangeRecord> {
    return this.http.post<ExchangeRecord>(`${this.apiUrl}/exchanges`, payload);
  }
}
