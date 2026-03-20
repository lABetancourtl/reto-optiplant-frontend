import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminBranchTopProductItem,
  AdminProductSalesByBranchItem,
  AdminProductTopBranch,
  AdminSalesByBranchItem,
  AdminSalesSummary,
  SalesByBranchTimeSeriesRequest,
  SalesByBranchTimeSeriesResponse
} from '../../models/admin-analytics.models';

/**
 * Servicio para obtener datos analíticos del administrador.
 * Permite consultar ventas, productos y sucursales para reportes y gráficos.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly baseUrl = 'http://localhost:8080/admin/analytics';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el resumen de ventas globales.
   */
  getSalesSummary(): Observable<AdminSalesSummary> {
    return this.http.get<AdminSalesSummary>(`${this.baseUrl}/sales/summary`);
  }

  /**
   * Obtiene el resumen de ventas por sucursal.
   */
  getSalesByBranch(): Observable<AdminSalesByBranchItem[]> {
    return this.http.get<AdminSalesByBranchItem[]>(`${this.baseUrl}/sales/by-branch`);
  }

  /**
   * Obtiene la serie temporal de ventas por sucursal, filtrada por fechas y granularidad.
   * @param request Parámetros de consulta (granularidad, fechas, sucursales).
   */
  getSalesByBranchTimeSeries(request?: SalesByBranchTimeSeriesRequest): Observable<SalesByBranchTimeSeriesResponse> {
    let params = new HttpParams();

    if (request?.granularity) {
      params = params.set('granularity', request.granularity);
    }

    if (request?.fromDate) {
      params = params.set('fromDate', request.fromDate);
    }

    if (request?.toDate) {
      params = params.set('toDate', request.toDate);
    }

    if (request?.branchIds && request.branchIds.length > 0) {
      params = params.set('branchIds', request.branchIds.join(','));
    }

    return this.http.get<SalesByBranchTimeSeriesResponse>(`${this.baseUrl}/sales/by-branch/time-series`, {
      params
    });
  }

  /**
   * Obtiene la sucursal con mayores ventas para un producto.
   * @param productId ID del producto.
   */
  getProductTopBranch(productId: number): Observable<AdminProductTopBranch> {
    return this.http.get<AdminProductTopBranch>(`${this.baseUrl}/products/${productId}/top-branch`);
  }

  /**
   * Obtiene las ventas de un producto por sucursal.
   * @param productId ID del producto.
   */
  getProductSalesByBranch(productId: number): Observable<AdminProductSalesByBranchItem[]> {
    return this.http.get<AdminProductSalesByBranchItem[]>(`${this.baseUrl}/products/${productId}/sales-by-branch`);
  }

  /**
   * Obtiene los productos más vendidos de una sucursal.
   * @param branchId ID de la sucursal.
   * @param limit Límite de productos a devolver.
   */
  getBranchTopProducts(branchId: number, limit?: number): Observable<AdminBranchTopProductItem[]> {
    let params = new HttpParams();
    if (typeof limit === 'number') {
      params = params.set('limit', limit);
    }

    return this.http.get<AdminBranchTopProductItem[]>(`${this.baseUrl}/branches/${branchId}/top-products`, {
      params
    });
  }
}
